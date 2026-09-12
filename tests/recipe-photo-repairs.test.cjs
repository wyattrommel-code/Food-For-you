const { test }=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const manifest=require('../data/recipes/photo-repairs-002.json');
const {validateManifest,validateFiles,photoAfter}=require('../scripts/recipe-photos.cjs');
test('all recovery assets match the reviewed bytes and preserve recipe contents',()=>{
 validateFiles(manifest,path.resolve(__dirname,'..'));
 for(const e of manifest.entries){const after=photoAfter(e);for(const key of Object.keys(e.before)){if(!['image_url','description'].includes(key))assert.deepEqual(after[key],e.before[key]);}}
});
test('removing a rejected image preserves its recipe description verbatim',()=>{
 for(const e of manifest.entries.filter(e=>e.image.kind==='unavailable')){
  const after=photoAfter(e);assert.equal(after.image_url,'');assert.equal(after.description,e.before.description);assert.ok(e.before.image_url);
 }
});
test('image removal requires an existing rejected photo and cannot set a hidden replacement',()=>{
 for(const mutate of [e=>e.before.image_url='',e=>e.review.status='visually-reviewed',e=>e.image.url='https://example.com/photo.jpg',e=>e.image.credit='Unexpected edit']){
  const changed=structuredClone(manifest);mutate(changed.entries.find(e=>e.image.kind==='unavailable'));assert.throws(()=>validateManifest(changed));
 }
});
test('reusing an existing library photo cannot masquerade as an arbitrary external asset',()=>{
 for(const mutate of [e=>e.image.source_url='https://example.com/photo.jpg',e=>e.image.storage_object='../private/photo.jpg',e=>e.image.provenance_note='']){
  const changed=structuredClone(manifest);mutate(changed.entries.find(e=>e.image.kind==='existing-library-image'));assert.throws(()=>validateManifest(changed));
 }
});
test('share-alike replacement captions retain the photographer, source and image license',()=>{
 for(const e of manifest.entries.filter(e=>e.image.license?.includes('BY-SA'))){const after=photoAfter(e);assert.ok(after.description.includes(e.image.creator));assert.ok(after.description.includes(e.image.license_url));assert.ok(after.description.includes('image adaptation remains licensed'));}
});
