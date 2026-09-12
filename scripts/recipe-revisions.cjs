// Update reviewed shared recipes in place, preserving IDs and saved favorites.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const editable = ['description', 'ingredients_list', 'shopping_list', 'recipe_steps', 'tags', 'cuisine', 'prep_time_mins'];

function validateRevisions(batch) {
  assert.match(batch.batch_id, /^[a-z0-9-]+$/);
  assert.equal(batch.status, 'editorially-reviewed-not-cook-tested');
  assert.ok(batch.revisions?.length);
  const ids = new Set();
  for (const { before, after } of batch.revisions) {
    assert.match(before.id, /^[0-9a-f-]{36}$/);
    assert.ok(!ids.has(before.id), 'Duplicate revision ID');
    ids.add(before.id);
    assert.equal(before.is_user_created, false, 'Only shared recipes may be revised');
    assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
    for (const key of Object.keys(before)) {
      if (!editable.includes(key)) assert.deepEqual(after[key], before[key], `Protected field: ${key}`);
    }
    assert.ok(after.description?.trim());
    assert.ok(Number.isInteger(after.prep_time_mins) && after.prep_time_mins > 0 && after.prep_time_mins <= 30);
    assert.ok(after.ingredients_list.length > 0 && after.ingredients_list.length <= 10);
    assert.ok(after.ingredients_list.every(x => typeof x === 'string' && /^\d/.test(x)));
    assert.ok(after.recipe_steps.length >= 3 && after.recipe_steps.length <= 6);
    assert.ok(after.recipe_steps.every(x => typeof x === 'string' && x.trim()));
    assert.deepEqual(after.shopping_list, after.ingredients_list.filter(x => !/\bwater$/.test(x)));
  }
  return batch.revisions;
}

function revisionSql(revisions) {
  const payload = JSON.stringify(revisions).replace(/'/g, "''");
  return `-- Generated reviewed updates. Conflicting edits abort the whole transaction.\nBEGIN;\nSET LOCAL standard_conforming_strings = on;\nSELECT pg_advisory_xact_lock(hashtext('mealsolved-recipe-import'));\nCREATE TEMP TABLE changed_recipe_ids (id uuid) ON COMMIT DROP;\nCREATE TEMP TABLE incoming_recipe_revisions ON COMMIT DROP AS\n  SELECT jsonb_populate_record(NULL::public.recipes, value->'before') AS old_row,\n    jsonb_populate_record(NULL::public.recipes, value->'after') AS new_row\n  FROM jsonb_array_elements('${payload}'::jsonb);\nDO $$\nDECLARE item record; current_row public.recipes;\nBEGIN\n  FOR item IN SELECT * FROM incoming_recipe_revisions\n  LOOP\n    SELECT * INTO current_row FROM public.recipes WHERE id = (item.old_row).id FOR UPDATE;\n    IF NOT FOUND THEN RAISE EXCEPTION 'Recipe missing: %', (item.old_row).id; END IF;\n    IF to_jsonb(current_row) = to_jsonb(item.new_row) THEN CONTINUE; END IF;\n    IF to_jsonb(current_row) IS DISTINCT FROM to_jsonb(item.old_row) THEN\n      RAISE EXCEPTION 'Recipe changed since review: %', current_row.id;\n    END IF;\n    UPDATE public.recipes SET ${editable.map(c => `${c} = (item.new_row).${c}`).join(', ')}\n      WHERE id = current_row.id AND NOT is_user_created;\n    IF NOT FOUND THEN RAISE EXCEPTION 'Shared recipe required'; END IF;\n    INSERT INTO changed_recipe_ids VALUES (current_row.id);\n  END LOOP;\nEND $$;\nSELECT r.id, r.title FROM public.recipes r JOIN changed_recipe_ids c USING (id);\nCOMMIT;\n`;
}

if (require.main === module) {
  const input = process.argv[2];
  assert.ok(input, 'Usage: node scripts/recipe-revisions.cjs data/recipes/<revisions>.json');
  const batch = JSON.parse(fs.readFileSync(input, 'utf8'));
  const revisions = validateRevisions(batch);
  const output = path.join(path.dirname(input), batch.batch_id + '.sql');
  fs.writeFileSync(output, revisionSql(revisions));
  console.log(`Validated ${revisions.length} revisions; wrote ${output}. No database writes.`);
}
module.exports = { validateRevisions, revisionSql };
