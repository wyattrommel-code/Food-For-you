const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { validateImageAsset, validateImageFile } = require('./recipe-photos.cjs');

const columns = ['title', 'description', 'meal_time', 'prep_time_mins', 'effort_score',
  'servings', 'tags', 'image_url', 'ingredients_list', 'shopping_list', 'recipe_steps',
  'cuisine', 'user_id', 'is_user_created', 'source_url', 'source_name'];
const arrayColumns = new Set(['meal_time', 'tags', 'ingredients_list', 'shopping_list', 'recipe_steps']);
const normalizeTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]/g, '');

function validateBatch(batch) {
  assert.match(batch.batch_id, /^[a-z0-9-]+$/);
  assert.equal(batch.status, 'editorially-reviewed-not-cook-tested');
  assert.ok(Array.isArray(batch.recipes) && batch.recipes.length > 0);
  const kind = batch.batch_kind ?? 'quick';
  assert.ok(['quick', 'easy-comfort'].includes(kind), 'Unknown batch kind');
  const comfort = kind === 'easy-comfort';
  assert.ok(batch.photo_policy === undefined || batch.photo_policy === 'reviewed-local-assets', 'Unknown photo policy');
  const photoReady = batch.photo_policy === 'reviewed-local-assets';
  const titles = new Set();
  for (const row of batch.recipes) {
    for (const field of columns) assert.ok(Object.hasOwn(row, field), `${row.title}: missing ${field}`);
    for (const field of ['title', 'description', 'source_name']) {
      assert.ok(typeof row[field] === 'string' && row[field].trim(), `Missing ${field}`);
    }
    const title = normalizeTitle(row.title);
    assert.ok(!titles.has(title), `Duplicate title: ${row.title}`);
    titles.add(title);
    assert.ok(Number.isInteger(row.prep_time_mins) && row.prep_time_mins > 0 && row.prep_time_mins <= (comfort ? 75 : 30), row.title + ': invalid total time');
    if (comfort) {
      const active = row.review?.active_time_mins;
      assert.ok(Number.isInteger(active) && active > 0 && active <= Math.min(row.prep_time_mins, 20), row.title + ': active time required');
      if (row.prep_time_mins > 30) {
        assert.ok(active <= 15 && row.tags.includes('low-active-time'), row.title + ': long meal must need little active work');
        assert.ok(!row.tags.includes('quick'), row.title + ': long meal cannot be tagged quick');
        assert.ok(row.description.includes(active + ' minutes of hands-on work') && row.description.includes(row.prep_time_mins + ' minutes total'), row.title + ': disclose active and total time');
      }
    }
    assert.ok([1, 2].includes(row.effort_score), `${row.title}: quick batch needs effort 1 or 2`);
    assert.ok(Number.isInteger(row.servings) && row.servings >= 1 && row.servings <= (comfort ? 6 : 2));
    for (const field of arrayColumns) {
      assert.ok(Array.isArray(row[field]) && row[field].length, `${row.title}: empty ${field}`);
      assert.ok(row[field].every(x => typeof x === 'string' && x.trim()), `${row.title}: invalid ${field}`);
      assert.equal(new Set(row[field]).size, row[field].length, `${row.title}: duplicate ${field}`);
    }
    assert.ok(row.meal_time.every(t => ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'sides'].includes(t)));
    assert.ok(row.meal_time.some(t => ['breakfast', 'lunch', 'dinner'].includes(t)), 'Meal required, not just a side');
    assert.ok(row.ingredients_list.length <= 10, `${row.title}: review long ingredient list`);
    assert.ok(row.ingredients_list.every(x => /^\d/.test(x)), `${row.title}: measured ingredients required`);
    assert.ok(row.recipe_steps.length >= 3 && row.recipe_steps.length <= 6, `${row.title}: review step count`);
    assert.ok(row.shopping_list.every(x => row.ingredients_list.includes(x)), `${row.title}: unexpected shopping item`);
    assert.deepEqual(row.shopping_list, row.ingredients_list.filter(x => !/\bwater$/.test(x)), `${row.title}: shopping items missing`);
    if (photoReady) {
      assert.equal(row.review?.photo_review?.status, 'visually-reviewed', row.title + ': photo review required');
      assert.ok(row.review.photo_review.notes?.trim());
      assert.match(row.review.photo_review.reviewed_on, /^\d{4}-\d{2}-\d{2}$/);
      const image = validateImageAsset(row.review.photo);
      assert.equal(row.image_url, image.url, row.title + ': photo URL mismatch');
      assert.ok(row.description.includes(image.credit), row.title + ': visible photo credit required');
    } else assert.equal(row.image_url, '', 'Unverified images must remain blank');
    assert.equal(row.user_id, null);
    assert.equal(row.is_user_created, false);
    const source = new URL(row.source_url);
    assert.ok(source.protocol === 'https:' && !source.username && !source.password, 'Source must be a public HTTPS URL');
    for (const field of ['source_kind', 'adaptation', 'audience_evidence', 'duplicate_review']) {
      assert.ok(row.review?.[field]?.trim(), `${row.title}: missing review ${field}`);
    }
    assert.ok(row.review.equipment.length > 0);
  }
  return batch.recipes.map(row => Object.fromEntries(columns.map(key => [key, row[key]])));
}

function toCsv(rows) {
  const quote = value => '"' + value.replace(/"/g, '""') + '"';
  const pgArray = values => '{' + values.map(x => '"' + x.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
  return columns.join(',') + '\r\n' + rows.map(row => columns.map(key => {
    const value = row[key];
    if (value === null) return ''; // SQL NULL, distinct from quoted empty image_url.
    if (Array.isArray(value)) return quote(pgArray(value));
    return typeof value === 'string' ? quote(value) : String(value);
  }).join(',')).join('\r\n') + '\r\n';
}

function importSql(rows) {
  const literal = value => "'" + value.replace(/'/g, "''") + "'";
  const payload = literal(JSON.stringify(rows));
  const normalized = expression => `regexp_replace(lower(${expression}), '[^a-z0-9]', '', 'g')`;
  return `-- Generated from the same validated rows as the CSV. Never runs automatically.\nBEGIN;\nSET LOCAL standard_conforming_strings = on;\nSELECT pg_advisory_xact_lock(hashtext('mealsolved-recipe-import'));\nCREATE TEMP TABLE incoming_recipes AS\nSELECT ${columns.join(', ')} FROM jsonb_populate_recordset(NULL::public.recipes, ${payload}::jsonb);\nDO $$ BEGIN\n  IF EXISTS (SELECT 1 FROM incoming_recipes n JOIN public.recipes r\n    ON ${normalized('r.title')} = ${normalized('n.title')} AND NOT r.is_user_created\n    WHERE ROW(${columns.map(c=>'r.'+c).join(',')}) IS DISTINCT FROM ROW(${columns.map(c=>'n.'+c).join(',')})) THEN\n    RAISE EXCEPTION 'Existing title has different content; review before importing';\n  END IF;\nEND $$;\nINSERT INTO public.recipes (${columns.join(', ')})\nSELECT ${columns.map(c=>'n.'+c).join(', ')} FROM incoming_recipes n\nWHERE NOT EXISTS (SELECT 1 FROM public.recipes r WHERE NOT r.is_user_created\n  AND ${normalized('r.title')} = ${normalized('n.title')})\nRETURNING id, title;\nCOMMIT;\n`;
}

if (require.main === module) {
  const input = process.argv[2];
  assert.ok(input, 'Usage: node scripts/recipe-batch.cjs data/recipes/community-001.json');
  const batch = JSON.parse(fs.readFileSync(input, 'utf8'));
  const rows = validateBatch(batch);
  if (batch.photo_policy === 'reviewed-local-assets') for (const row of batch.recipes) validateImageFile(row.review.photo, path.resolve(__dirname, '..')); 
  assert.ok(rows.every(row => Object.values(row).flat().every(x => typeof x !== 'string' || !/[\r\n]/.test(x))), 'Use separate steps instead of embedded newlines');
  const stem = path.join(path.dirname(input), batch.batch_id);
  fs.writeFileSync(stem + '.csv', toCsv(rows));
  fs.writeFileSync(stem + '.sql', importSql(rows));
  console.log(`Validated ${rows.length} recipes; wrote ${stem}.csv and .sql. No network calls or database writes.`);
}
module.exports = { validateBatch, toCsv, importSql, normalizeTitle, columns };
