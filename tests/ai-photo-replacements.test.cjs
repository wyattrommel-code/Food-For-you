const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const manifest = require('../data/recipes/photo-ai-replacements-004.json');
const { validateFiles, photoAfter, validateManifest } = require('../scripts/recipe-photos.cjs');

test('all sourced-photo replacements retain recipe contents and replace only the recorded photo credit', () => {
  assert.equal(manifest.entries.length, 68);
  validateFiles(manifest, path.resolve(__dirname, '..'));
  for (const entry of manifest.entries) {
    const after = photoAfter(entry);
    const { image_url: oldUrl, description: oldDescription, ...beforeFood } = entry.before;
    const { image_url: newUrl, description: newDescription, ...afterFood } = after;
    assert.deepEqual(afterFood, beforeFood);
    assert.notEqual(oldUrl, newUrl);
    const originalText = oldDescription.slice(0, -entry.replaces_photo.credit.length).trimEnd();
    assert.equal(newDescription, originalText + '\n\n' + entry.image.credit);
    assert.match(newDescription, /AI-generated/);
    assert.equal(entry.image.kind, 'generated');
    assert.equal(entry.review.status, 'visually-reviewed');
  }
});

test('credit replacement rejects mismatched photos and changed attribution rather than deleting other text', () => {
  for (const mutate of [
    e => e.before.image_url = 'https://example.com/changed.jpg',
    e => e.before.description += '\nA newly added recipe note.',
    e => e.before.description = e.replaces_photo.credit,
    e => e.replaces_photo.kind = 'generated',
  ]) {
    const changed = structuredClone(manifest);
    mutate(changed.entries[0]);
    assert.throws(() => validateManifest(changed));
  }
});
