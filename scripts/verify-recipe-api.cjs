// Read-only smoke check using the app's public key. Never prints credentials.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const batch = require('../data/recipes/community-001.json');
const { validateBatch } = require('./recipe-batch.cjs');
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
  const catalog = await get('recipes?select=*&is_user_created=eq.false&source_url=not.is.null');
  for (const expected of validateBatch(batch)) {
    const actual = catalog.filter(row => row.title === expected.title);
    assert.equal(actual.length, 1, `Missing or duplicate recipe: ${expected.title}`);
    for (const field of Object.keys(expected)) assert.deepEqual(actual[0][field], expected[field], `${expected.title}: ${field}`);
  }
  assert.deepEqual(await get('recipes?select=id&is_user_created=eq.true'), [], 'Anonymous clients must not see private recipes');
  console.log('Public API verified all 10 recipes and their arrays/source links; private recipe access returned zero rows.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
