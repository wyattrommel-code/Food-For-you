const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const manifest = require('../data/recipes/photo-manifest.json');
const { validateManifest, validateFiles, photoAfter, importSql } = require('../scripts/recipe-photos.cjs');
test('every approved image has a matching local JPEG and visible provenance', () => {
  validateFiles(manifest, path.resolve(__dirname, '..'));
  for (const e of manifest.entries) {
    const after = photoAfter(e);
    assert.equal(after.id, e.id);
    assert.deepEqual(after.ingredients_list, e.before.ingredients_list);
    assert.deepEqual(after.recipe_steps, e.before.recipe_steps);
    assert.ok(after.description.startsWith(e.before.description.trimEnd() + '\n\n'));
  }
});
for (const [name, mutate] of [
  ['private recipe', e => e.before.is_user_created = true],
  ['unreviewed image', e => e.review.status = 'pending'],
  ['external hotlink', e => e.image.url = 'https://example.com/unrelated.jpg'],
  ['path traversal', e => e.image.file = '../secret.jpg'],
  ['oversized file', e => e.image.bytes = 2000000],
  ['missing generated disclosure', e => e.image.credit = 'Photo'],
]) test('rejects ' + name, () => {
  const changed = structuredClone(manifest); mutate(changed.entries[0]);
  assert.throws(() => validateManifest(changed));
});
test('licensed photos require visible author, source, license and modification credit', () => {
  for (const field of ['creator', 'source_url', 'license_url', 'changes']) {
    const changed = structuredClone(manifest);
    const e = changed.entries.find(e => e.image.kind === 'licensed-photo');
    e.image.credit = e.image.credit.replace(e.image[field], '');
    assert.throws(() => validateManifest(changed));
  }
  const changed = structuredClone(manifest);
  changed.entries.find(e => e.image.kind === 'licensed-photo').image.license = 'All rights reserved';
  assert.throws(() => validateManifest(changed));
});
test('photo SQL is guarded, repeatable, and keeps recipe text outside procedural SQL', () => {
  const changed = structuredClone(manifest);
  changed.entries[0].before.description = "Dinner's $photos$ illustration";
  const sql = importSql(changed);
  assert.ok(sql.includes("Dinner''s $photos$ illustration"));
  assert.ok(sql.indexOf("Dinner''s $photos$ illustration") < sql.indexOf('DO $photos$'));
  assert.ok(sql.includes('FOR UPDATE'));
  assert.ok(sql.includes("(item->'after') - 'created_at' THEN CONTINUE"));
  assert.ok(sql.includes('Recipe changed since photo review'));
  assert.ok(sql.includes('ON COMMIT DROP'));
});
