const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateBatch, toCsv, importSql } = require('../scripts/recipe-batch.cjs');
const batch = require('../data/recipes/community-001.json');

test('reviewed batch has measured ingredients and complete app fields', () => {
  const rows = validateBatch(batch);
  assert.equal(rows.length, 10);
  assert.ok(rows.every(r => !Object.hasOwn(r, 'review')));
});
for (const [name, change] of [
  ['duplicate punctuation variant', b => b.recipes.push({ ...b.recipes[0], title: b.recipes[0].title + '!' })],
  ['missing shopping ingredient', b => b.recipes[0].shopping_list.pop()],
  ['unmeasured ingredient', b => b.recipes[0].ingredients_list[0] = 'Some beans'],
  ['unsafe source scheme', b => b.recipes[0].source_url = 'javascript:alert(1)'],
  ['unfinished editorial review', b => delete b.recipes[0].review.duplicate_review],
  ['private owner in shared batch', b => b.recipes[0].user_id = 'someone'],
  ['long recipe in quick batch', b => b.recipes[0].prep_time_mins = 90],
]) test(`rejects ${name}`, () => {
  const changed = structuredClone(batch);
  change(changed);
  assert.throws(() => validateBatch(changed));
});
test('CSV escapes quotes and commas and preserves empty string versus NULL', () => {
  const rows = validateBatch(batch);
  rows[0].title = 'Mom\'s "quick", lunch';
  const csv = toCsv([rows[0]]);
  assert.ok(csv.includes('"Mom\'s ""quick"", lunch"'));
  assert.ok(csv.includes(',"",')); // blank image, not SQL NULL
  assert.ok(csv.includes(',,false,')); // null user_id
});
test('SQL escapes apostrophes and guards changed existing titles', () => {
  const rows = validateBatch(batch);
  rows[0].title = "Mom's lunch";
  const sql = importSql(rows);
  assert.ok(sql.includes("Mom''s lunch"));
  assert.ok(sql.includes('IS DISTINCT FROM'));
  assert.ok(sql.includes('WHERE NOT EXISTS'));
  assert.ok(sql.endsWith('COMMIT;\n'));
});
