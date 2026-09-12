// Read-only smoke check using the app's public key. Never prints credentials.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const batches = ['community-001', 'comfort-002'].map(name => require('../data/recipes/' + name + '.json'));
const revisions = require('../data/recipes/comfort-revisions-001.json');
const { validateBatch } = require('./recipe-batch.cjs');
const photos = require('../data/recipes/photo-manifest.json');
const { validateManifest, photoAfter } = require('./recipe-photos.cjs');
const repairs = require('../data/recipes/photo-repairs-002.json');
const completion = require('../data/recipes/photo-completion-003.json');
const reviewedPhotos = [...new Map([...validateManifest(photos), ...validateManifest(repairs), ...validateManifest(completion)].map(e => [e.id, e])).values()];
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const base = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(base && key, 'Public Supabase configuration is required');
assert.ok(new URL(base).protocol === 'https:');
if (!key.startsWith('sb_publishable_')) {
  assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role, 'anon', 'Use only the app public key');
}
async function get(query) {
  const response = await fetch(`${base}/rest/v1/${query}`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(20000)
  });
  assert.ok(response.ok, `Recipe API returned status ${response.status}`);
  return response.json();
}
(async () => {
  const catalog = await get('recipes?select=*&is_user_created=eq.false');
  const expectedRows = [...batches.flatMap(validateBatch), ...revisions.revisions.map(r => {
    const { created_at, ...expected } = r.after;
    return expected;
  })];
  for (let expected of expectedRows) {
    const photo = reviewedPhotos.find(e => e.title === expected.title);
    if (photo) { const after = photoAfter(photo); expected = { ...expected, image_url: after.image_url, description: after.description }; }
    const actual = catalog.filter(row => row.title === expected.title);
    assert.equal(actual.length, 1, `Missing or duplicate recipe: ${expected.title}`);
    for (const field of Object.keys(expected)) assert.deepEqual(actual[0][field], expected[field], `${expected.title}: ${field}`);
  }
  for (const photo of reviewedPhotos) {
    const actual = catalog.find(row => row.id === photo.id);
    assert.ok(actual, photo.title + ': missing photo recipe');
    const { created_at, ...expected } = photoAfter(photo);
    for (const field of Object.keys(expected)) assert.deepEqual(actual[field], expected[field], photo.title + ': ' + field);
  }
  const audit = require('../data/recipes/photo-audit-2026-09-12.json');
  assert.deepEqual(catalog.map(r => r.id).sort(), audit.entries.map(r => r.id).sort(), 'Shared catalog changed since full photo audit');
  for (const reviewed of audit.entries) {
    const actual = catalog.find(r => r.id === reviewed.id);
    assert.equal(actual.image_url, reviewed.final_image_url, reviewed.title + ': full-audit photo URL');
  }
  assert.deepEqual(await get('recipes?select=id&is_user_created=eq.true'), [], 'Anonymous clients must not see private recipes');
  console.log(`Public API verified ${expectedRows.length} reviewed recipes and revisions plus ${reviewedPhotos.length} photo overlays and ${audit.entries.length} audited image assignments; private recipe access returned zero rows.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
