const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateBatch } = require('../scripts/recipe-batch.cjs');
const { validateRevisions, revisionSql } = require('../scripts/recipe-revisions.cjs');
const batch = require('../data/recipes/comfort-002.json');
const revisions = require('../data/recipes/comfort-revisions-001.json');

test('comfort meals allow whole-package portions and honest low-active-time meals', () => {
  const rows = validateBatch(batch);
  assert.equal(rows.length, 6);
  assert.equal(rows.filter(r => r.prep_time_mins > 30).length, 3);
  assert.ok(rows.some(r => r.servings === 4));
});
for (const [name, change] of [
  ['long meal falsely tagged quick', r => r.tags.push('quick')],
  ['missing active time', r => delete r.review.active_time_mins],
  ['long active cooking time', r => r.review.active_time_mins = 30],
  ['hidden full cooking time', r => r.description = 'A quick meal'],
]) test(`rejects ${name}`, () => {
  const changed = structuredClone(batch);
  change(changed.recipes.find(r => r.prep_time_mins > 30));
  assert.throws(() => validateBatch(changed));
});

test('revisions keep recipe identity, images and owner metadata intact', () => {
  assert.equal(validateRevisions(revisions).length, 3);
  for (const key of ['id', 'image_url', 'user_id', 'is_user_created', 'title']) {
    const changed = structuredClone(revisions);
    changed.revisions[0].after[key] = 'changed';
    assert.throws(() => validateRevisions(changed), /Protected field/);
  }
  const privateBatch = structuredClone(revisions);
  privateBatch.revisions[0].before.is_user_created = true;
  assert.throws(() => validateRevisions(privateBatch), /Only shared/);
});

test('revision SQL protects conflicting edits and separates recipe text from procedural SQL', () => {
  const changed = structuredClone(revisions);
  changed.revisions[0].after.description = "Dinner's $$ special";
  const sql = revisionSql(validateRevisions(changed));
  assert.ok(sql.includes("Dinner''s $$ special"));
  assert.ok(sql.indexOf("Dinner''s $$ special") < sql.indexOf('DO $$'));
  assert.ok(sql.includes('FOR UPDATE'));
  assert.ok(sql.includes('Recipe changed since review'));
});
