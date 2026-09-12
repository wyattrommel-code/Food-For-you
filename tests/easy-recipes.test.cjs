const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const batch=require('../data/recipes/easy-050.json');
const audit=require('../data/recipes/photo-audit-2026-09-12.json');
const {validateBatch,normalizeTitle,importSql}=require('../scripts/recipe-batch.cjs');
const {validateImageFile}=require('../scripts/recipe-photos.cjs');
test('50 new meals have complete reviewed photos and do not duplicate existing titles',()=>{
 const rows=validateBatch(batch),old=new Set(audit.entries.map(r=>normalizeTitle(r.title)));
 assert.equal(rows.length,50);
 assert.equal(new Set(rows.map(r=>r.image_url)).size,50);
 for(const r of batch.recipes){assert.ok(!old.has(normalizeTitle(r.title)));validateImageFile(r.review.photo,path.resolve(__dirname,'..'));}
 assert.equal(batch.recipes.filter(r=>r.review.photo.kind==='generated').length,0);
 assert.equal(fs.readFileSync(path.join(__dirname,'../data/recipes/easy-050.sql'),'utf8'),importSql(rows));
});
for(const [name,mutate] of [
 ['blank photo',b=>b.recipes[0].image_url=''],
 ['unreviewed photo',b=>b.recipes[0].review.photo_review.status='pending'],
 ['missing credit',b=>b.recipes[0].description='Chicken quesadilla'],
 ['unapproved hotlink',b=>{b.recipes[0].review.photo.url='https://example.com/a.jpg';b.recipes[0].image_url='https://example.com/a.jpg';}],
 ['oversized asset',b=>b.recipes[0].review.photo.bytes=900000],
 ['lost license attribution',b=>b.recipes[36].review.photo.credit='Free photo'],
 ['unknown policy',b=>b.photo_policy='unchecked']
])test('photo-ready import rejects '+name,()=>{const b=structuredClone(batch);mutate(b);assert.throws(()=>validateBatch(b));});
test('legacy batches still reject unverified image URLs',()=>{
 const b=structuredClone(require('../data/recipes/community-001.json'));b.recipes[0].image_url=batch.recipes[0].image_url;assert.throws(()=>validateBatch(b));
});
