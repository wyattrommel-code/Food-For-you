const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const origin = 'https://raw.githubusercontent.com/wyattrommel-code/Food-For-you/main/';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function httpsUrl(value) {
  const url = new URL(value);
  assert.ok(url.protocol === 'https:' && !url.username && !url.password, 'Public HTTPS URL required');
}
function photoAfter(entry) {
  return { ...entry.before, image_url: entry.image.url, description: entry.image.credit ? entry.before.description.trimEnd() + '\n\n' + entry.image.credit : entry.before.description };
}
function validateManifest(manifest) {
  assert.equal(manifest.schema_version, 1);
  assert.ok(Array.isArray(manifest.entries) && manifest.entries.length);
  const ids = new Set();
  for (const e of manifest.entries) {
    assert.match(e.id, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
    assert.ok(!ids.has(e.id), 'Duplicate recipe photo'); ids.add(e.id);
    assert.equal(e.before.id, e.id); assert.equal(e.before.title, e.title);
    assert.equal(e.before.is_user_created, false); assert.equal(e.before.user_id, null);
    assert.equal(typeof e.before.description, 'string');
    assert.equal(typeof e.before.image_url, 'string');
    assert.ok(e.review.notes.trim());
    if (e.image.kind === 'unavailable') {
      assert.equal(e.review.status, 'rejected');
      assert.equal(e.image.url, ''); assert.equal(e.image.credit, '');
      assert.ok(e.before.image_url.trim(), 'Only an existing rejected URL may be cleared');
      continue;
    }
    assert.equal(e.review.status, 'visually-reviewed');
    assert.match(e.image.file, /^assets\/recipe-photos\/[a-z0-9-]+-[a-f0-9]{12}\.jpg$/);
    assert.equal(e.image.url, origin + e.image.file);
    assert.match(e.image.sha256, /^[a-f0-9]{64}$/);
    assert.ok(e.image.file.endsWith('-' + e.image.sha256.slice(0,12) + '.jpg'));
    assert.ok(Number.isInteger(e.image.bytes) && e.image.bytes > 0 && e.image.bytes <= 300000, 'Photo must be at most 300 KB');
    for (const dimension of ['width', 'height']) assert.ok(Number.isInteger(e.image[dimension]) && e.image[dimension] > 0 && e.image[dimension] <= 900);
    assert.ok(e.image.credit && e.image.creator, 'Visible credit and creator required');
    assert.ok(['generated', 'licensed-photo', 'owned-photo', 'existing-library-image'].includes(e.image.kind));
    if (e.image.kind === 'generated') {
      assert.ok(e.image.prompt?.trim()); assert.match(e.image.credit, /AI-generated/);
    } else if (e.image.kind === 'licensed-photo') {
      assert.ok(['CC0', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'Pexels License', 'Unsplash License'].includes(e.image.license), 'Review the reuse license');
      httpsUrl(e.image.source_url); httpsUrl(e.image.license_url);
      assert.ok(e.image.credit.includes(e.image.creator) && e.image.credit.includes(e.image.source_url) && e.image.credit.includes(e.image.license_url) && e.image.credit.includes(e.image.changes), 'Attribution and changes must be visible in the recipe');
    } else if (e.image.kind === 'existing-library-image') {
      assert.match(e.image.storage_object, /^[a-z0-9_/.-]+\.jpg$/);
      assert.ok(!e.image.storage_object.includes('..'));
      assert.equal(e.image.source_url, 'https://yhfqlvblqlpacjdkltfi.supabase.co/storage/v1/object/public/meal-photos/' + e.image.storage_object);
      assert.ok(e.image.provenance_note?.trim(), 'Record the existing library origin without inventing a license');
    } else assert.ok(e.image.permission?.trim(), 'Record ownership or creator permission');
  }
  return manifest.entries;
}
function validateFiles(manifest, root) {
  for (const e of validateManifest(manifest)) {
    if (e.image.kind === 'unavailable') continue;
    const bytes = fs.readFileSync(path.join(root, e.image.file));
    assert.equal(bytes.length, e.image.bytes); assert.equal(digest(bytes), e.image.sha256);
    assert.ok(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, 'JPEG required');
  }
}
function importSql(manifest) {
  const entries = validateManifest(manifest);
  const payload = JSON.stringify(entries.map(e => ({ before: e.before, after: photoAfter(e) }))).replace(/'/g, "''");
  return `-- Reviewed photo overlay. Publish and verify files before applying.\nBEGIN;\nSET LOCAL standard_conforming_strings = on;\nSELECT pg_advisory_xact_lock(hashtext('mealsolved-recipe-import'));\nCREATE TEMP TABLE incoming_photo_updates ON COMMIT DROP AS SELECT value AS item FROM jsonb_array_elements('${payload}'::jsonb);\nDO $photos$\nDECLARE item jsonb; current_row jsonb; changed integer := 0;\nBEGIN\n  FOR item IN SELECT p.item FROM incoming_photo_updates p LOOP\n    SELECT to_jsonb(r) INTO current_row FROM public.recipes r WHERE r.id = (item->'before'->>'id')::uuid FOR UPDATE;\n    IF current_row IS NULL THEN RAISE EXCEPTION 'Photo recipe is missing'; END IF;\n    IF current_row - 'created_at' = (item->'after') - 'created_at' THEN CONTINUE; END IF;\n    IF current_row - 'created_at' IS DISTINCT FROM (item->'before') - 'created_at' THEN\n      RAISE EXCEPTION 'Recipe changed since photo review: %', item->'before'->>'title';\n    END IF;\n    IF (current_row->>'is_user_created')::boolean OR current_row->>'user_id' IS NOT NULL THEN RAISE EXCEPTION 'Only shared recipes may be updated'; END IF;\n    UPDATE public.recipes SET image_url = item->'after'->>'image_url', description = item->'after'->>'description' WHERE id = (item->'before'->>'id')::uuid;\n    changed := changed + 1;\n  END LOOP;\n  RAISE NOTICE 'Updated % recipe photos', changed;\nEND $photos$;\nCOMMIT;\n`;
}
async function verifyRemote(manifest) {
  for (const e of validateManifest(manifest)) {
    if (e.image.kind === 'unavailable') continue;
    const response = await fetch(e.image.url, { signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `${e.title}: HTTP ${response.status}`);
    assert.match(response.headers.get('content-type') || '', /^image\/jpeg(?:;|$)/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, e.image.bytes, e.title + ': remote size');
    assert.equal(digest(bytes), e.image.sha256, e.title + ': remote image changed');
  }
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const flag = process.argv.indexOf('--manifest');
  const manifestPath = flag >= 0 ? path.resolve(process.argv[flag + 1] || '') : path.join(root, 'data/recipes/photo-manifest.json');
  assert.ok(manifestPath.endsWith('.json'), 'A JSON manifest path is required');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  validateFiles(manifest, root);
  if (process.argv.includes('--sql')) fs.writeFileSync(manifestPath.replace(/\.json$/, '.sql'), importSql(manifest));
  const published = manifest.entries.filter(e => e.image.kind !== 'unavailable').length;
  if (process.argv.includes('--verify-remote')) verifyRemote(manifest).then(()=>console.log(`Verified ${published} published JPEGs and hashes.`)).catch(e=>{ console.error(e.message);process.exitCode=1; });
  else console.log(`Validated ${manifest.entries.length} reviewed photo changes (${published} images). No network calls or database writes.`);
}
module.exports = { validateManifest, validateFiles, photoAfter, importSql, verifyRemote };
