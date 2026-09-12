const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const manifest=require('../data/recipes/photo-completion-003.json');
const audit=require('../data/recipes/photo-audit-2026-09-12.json');
const {validateFiles,photoAfter}=require('../scripts/recipe-photos.cjs');
test('completion fills the 21 empty shared photos and preserves recipe content',()=>{
 validateFiles(manifest,path.resolve(__dirname,'..'));
 assert.equal(manifest.entries.length,21);
 for(const e of manifest.entries){assert.equal(e.before.image_url,'');assert.ok(e.image.url);const after=photoAfter(e);for(const key of Object.keys(e.before))if(!['image_url','description'].includes(key))assert.deepEqual(after[key],e.before[key]);}
});
test('the full audit agrees with every completed image assignment and has no empty image URLs',()=>{
 assert.equal(audit.entries.length,169);
 for(const row of audit.entries)assert.ok(row.final_image_url.trim(),row.title);
 for(const e of manifest.entries)assert.equal(audit.entries.find(r=>r.id===e.id).final_image_url,e.image.url,e.title);
});
test('free-photo completion retains source licenses and visible serving-variation captions',()=>{
 assert.equal(manifest.entries.filter(e=>e.image.kind==='licensed-photo').length,18);
 assert.equal(manifest.entries.filter(e=>e.image.kind==='existing-library-image').length,3);
 for(const e of manifest.entries){assert.ok(e.review.serving_variation);assert.ok(photoAfter(e).description.includes(e.review.serving_variation));if(e.image.kind==='licensed-photo'){assert.equal(e.image.primary_license_name,e.image.license);if(e.image.license.includes('BY-SA'))assert.ok(e.image.credit.includes('image adaptation remains licensed'));}}
});
