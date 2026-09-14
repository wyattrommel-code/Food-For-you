const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {validateBatch,normalizeTitle}=require('../scripts/recipe-batch.cjs');
const {validateImageFile}=require('../scripts/recipe-photos.cjs');
const batch=require('../data/recipes/drinks-024.json');
test('24 original drinks: 12 shakes, 12 smoothies, measured simple recipes, unique reviewed photos',()=>{
 const rows=validateBatch(batch);assert.equal(rows.length,24);
 assert.equal(rows.filter(r=>r.tags.includes('shake')).length,12);assert.equal(rows.filter(r=>r.tags.includes('smoothie')).length,12);
 const older=[...require('../data/recipes/photo-audit-2026-09-12.json').entries,...require('../data/recipes/easy-050.json').recipes,...require('../data/recipes/easy-100.json').recipes];
 const titles=new Set(older.map(r=>normalizeTitle(r.title)));
 assert.equal(new Set(rows.map(r=>r.image_url)).size,24);
 for(const r of batch.recipes){assert.ok(!titles.has(normalizeTitle(r.title)));assert.ok(r.ingredients_list.length<=6);assert.equal(r.prep_time_mins,5);assert.equal(r.servings,1);assert.equal(r.source_url,null);assert.equal(r.source_name,null);assert.doesNotMatch(r.description,/https?:|\bPhoto:|AI-generated|source:|inspired by/i);validateImageFile(r.review.photo,path.join(__dirname,'..'));}
});
test('drinks keep legacy Android meal labels and shakes remain desserts',()=>{
 for(const r of batch.recipes){assert.ok(r.meal_time.every(t=>['breakfast','snack','dessert'].includes(t)));assert.equal(r.meal_time.includes('dessert'),r.tags.includes('shake'));assert.equal(r.tags.includes('treat-cold'),r.tags.includes('shake'));}
});
test('sourceless drink exception rejects nonoriginal content, unreviewed or licensed photos and missing classifications',()=>{
 for(const mutate of [b=>b.recipes[0].review.source_kind='website',b=>b.photo_policy=undefined,b=>b.recipes[0].review.photo.kind='owned-photo',b=>b.recipes[0].tags=['quick'],b=>b.recipes[0].meal_time=['breakfast'],b=>b.recipes[0].source_url='https://example.com/recipe']){
  const copy=structuredClone(batch);mutate(copy);assert.throws(()=>validateBatch(copy));
 }
 const old=structuredClone(require('../data/recipes/easy-100.json'));old.recipes[0].source_url=null;old.recipes[0].source_name=null;assert.throws(()=>validateBatch(old));
});
