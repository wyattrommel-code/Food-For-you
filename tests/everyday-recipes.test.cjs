const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const batch=require('../data/recipes/easy-100.json');
const before=require('../data/recipes/easy-100-catalog-before.json');
const {validateBatch,normalizeTitle,importSql}=require('../scripts/recipe-batch.cjs');
const {validateImageFile}=require('../scripts/recipe-photos.cjs');

test('50 everyday additions have verified assets and no collisions with the 219-recipe catalog',()=>{
 const rows=validateBatch(batch),old=new Set(before.map(r=>normalizeTitle(r.title)));
 assert.equal(before.length,219);assert.equal(rows.length,50);
 assert.equal(rows.filter(r=>r.meal_time.includes('dessert')).length,15);
 assert.equal(new Set(rows.map(r=>r.image_url)).size,50);
 for(const r of batch.recipes){
  assert.ok(!old.has(normalizeTitle(r.title)),r.title);
  validateImageFile(r.review.photo,path.resolve(__dirname,'..'));
  assert.ok(['licensed-photo','existing-library-image'].includes(r.review.photo.kind));
  assert.ok(Math.max(r.review.photo.width,r.review.photo.height)>=380,r.title+': thumbnail too small');
  if(r.review.photo.license_verification?.confirmed!==undefined) assert.equal(r.review.photo.license_verification.confirmed,true);
 }
 assert.equal(fs.readFileSync(path.join(__dirname,'../data/recipes/easy-100.sql'),'utf8').replace(/\r\n/g,'\n'),importSql(rows));
});

test('oven dessert discloses its real elapsed time and the remaining 49 dishes are quick',()=>{
 assert.equal(batch.recipes.filter(r=>r.prep_time_mins<=30).length,49);
 const longer=batch.recipes.filter(r=>r.prep_time_mins>30);
 assert.equal(longer.length,1);assert.equal(longer[0].title,'Oven Cinnamon Apple');
 assert.equal(longer[0].review.active_time_mins,5);
 const b=structuredClone(batch);b.recipes.find(r=>r.prep_time_mins>30).tags.push('quick');
 assert.throws(()=>validateBatch(b),/cannot be tagged quick/);
});

test('dessert-only records require the explicit everyday batch policy; sides still cannot count as meals',()=>{
 const dessert=batch.recipes.find(r=>r.meal_time.length===1&&r.meal_time[0]==='dessert');
 const b={...structuredClone(batch),recipes:[structuredClone(dessert)]};
 assert.equal(validateBatch(b).length,1);
 b.batch_kind='easy-comfort';assert.throws(()=>validateBatch(b),/explicitly supported dessert/);
 b.batch_kind='easy-everyday';b.recipes[0].meal_time=['sides'];assert.throws(()=>validateBatch(b),/not just a side/);
});
