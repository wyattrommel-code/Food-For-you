const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modules=new Map();
function load(file){const filename=path.resolve(__dirname,'..',file);if(modules.has(filename))return modules.get(filename).exports;const m=new Module(filename,module);modules.set(filename,m);m.require=(id)=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),id)+'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const {rollMealChoices,choiceMode}=load('lib/mealChoices.ts');
const r=(id,extra={})=>({id,title:'Meal '+id,meal_time:['lunch'],tags:[],prep_time_mins:15,effort_score:1,...extra});
const ids=result=>result.choices.flatMap(c=>c.recipe?[c.recipe.id]:[]);

test('refresh holds the chosen position and replaces only the other meals without duplicates',()=>{
 const recipes=Array.from({length:12},(_,i)=>r(String(i)));
 for(let n=0;n<50;n++){
  const first=rollMealChoices('hungryNow',recipes,[],new Set(),[],12);
  const held=first.choices[1].recipe.id;
  const next=rollMealChoices('hungryNow',recipes,first.choices,new Set([held]),[],12);
  assert.equal(next.choices[1].recipe.id,held);assert.equal(new Set(ids(next)).size,3);
  assert.ok(ids(next).filter(id=>id!==held).every(id=>!ids(first).includes(id)));
 }
});
test('holding all choices preserves them and releasing one changes just that position',()=>{
 const recipes=Array.from({length:8},(_,i)=>r(String(i)));
 const first=rollMealChoices('hungryNow',recipes);const held=new Set(ids(first));
 assert.deepEqual(ids(rollMealChoices('hungryNow',recipes,first.choices,held)),ids(first));
 held.delete(first.choices[1].recipe.id);const next=rollMealChoices('hungryNow',recipes,first.choices,held);
 assert.equal(next.choices[0].recipe.id,first.choices[0].recipe.id);assert.equal(next.choices[2].recipe.id,first.choices[2].recipe.id);assert.notEqual(next.choices[1].recipe.id,first.choices[1].recipe.id);
});
test('sweet slots retain their temperatures, held recipe and uniqueness',()=>{
 const recipes=['hot','cold'].flatMap(kind=>Array.from({length:4},(_,i)=>r(kind+i,{meal_time:['dessert'],tags:['treat-'+kind]})));
 for(let n=0;n<50;n++){
  const first=rollMealChoices('sweetTreat',recipes);const kept=first.choices[0].recipe.id;
  const next=rollMealChoices('sweetTreat',recipes,first.choices,new Set([kept]));
  assert.equal(next.choices[0].recipe.id,kept);assert.ok(next.choices[1].recipe.tags.includes('treat-cold'));assert.equal(next.choices[2].recipe.prep_time_mins,15);assert.equal(new Set(ids(next)).size,3);
  assert.ok(ids(next).filter(id=>id!==kept).every(id=>!ids(first).includes(id)));
 }
});
test('sweet matching fills all possible roles even when one recipe fits multiple roles',()=>{
 const recipes=[r('hot-quick',{meal_time:['dessert'],tags:['treat-hot']}),r('hot-slow',{meal_time:['dessert'],tags:['treat-hot'],prep_time_mins:40}),r('cold-slow',{meal_time:['dessert'],tags:['treat-cold'],prep_time_mins:40})];
 for(let n=0;n<25;n++){const picks=rollMealChoices('sweetTreat',recipes);assert.deepEqual(ids(picks),['hot-slow','cold-slow','hot-quick']);}
});
test('small and empty pools do not duplicate recipes or break holds',()=>{
 const recipe=r('only'),first=rollMealChoices('hungryNow',[recipe]);assert.deepEqual(ids(first),['only']);
 assert.deepEqual(ids(rollMealChoices('hungryNow',[recipe],first.choices,new Set(['only']))),['only']);
 assert.deepEqual(ids(rollMealChoices('hungryNow',[])),[]);
 const cold=r('cold',{meal_time:['dessert'],tags:['treat-cold'],prep_time_mins:60});const treat=rollMealChoices('sweetTreat',[cold]);assert.equal(treat.choices[0].recipe,null);assert.equal(treat.choices[1].recipe.id,'cold');assert.equal(treat.choices[2].recipe,null);
});
test('a newly excluded held recipe cannot reappear after preferences change',()=>{
 const recipes=Array.from({length:9},(_,i)=>r(String(i))),first=rollMealChoices('hungryNow',recipes);
 const banned=first.choices[0].recipe.id;const next=rollMealChoices('hungryNow',recipes.filter(r=>r.id!==banned),first.choices,new Set([banned]));assert.ok(!ids(next).includes(banned));assert.equal(ids(next).length,3);
});
test('hungry keeps time fallback and dessert exclusion; bold keeps challenge effort; pick remains one',()=>{
 const recipes=[r('sweet',{meal_time:['dessert'],tags:['treat-hot']}),r('fast'),r('medium',{prep_time_mins:40}),r('slow',{prep_time_mins:60}),r('bold',{effort_score:3})];
 const hungry=rollMealChoices('hungryNow',recipes);assert.ok(!ids(hungry).includes('sweet'));assert.ok(hungry.choices.every(c=>!c.recipe||c.recipe.prep_time_mins<=45));
 assert.deepEqual(ids(rollMealChoices('feelingBold',recipes)),['bold']);assert.equal(ids(rollMealChoices('pickForMe',recipes)).length,1);
 assert.equal(choiceMode('sweetTreat'),'sweetTreat');assert.equal(choiceMode('__proto__'),'hungryNow');
});
const {filterMealChoices,EMPTY_CHOICE_FILTERS,availableCuisines}=load('lib/choiceFilters.ts');
test('Help Me Decide includes all meal types and cooking times with three unique choices',()=>{
 const recipes=[r('dessert',{meal_time:['dessert'],prep_time_mins:90}),r('shake',{meal_time:['smoothie']}),r('dinner',{meal_time:['dinner'],prep_time_mins:120})];
 assert.equal(choiceMode('helpMeDecide'),'helpMeDecide');
 assert.deepEqual(new Set(ids(rollMealChoices('helpMeDecide',recipes))),new Set(['dessert','shake','dinner']));
});
test('filters combine meal/protein/cuisine/time without widening matching recipes',()=>{
 const recipes=[r('chicken',{meal_time:['dinner'],ingredients_list:['1 lb chicken breast'],cuisine:' Mexican '}),r('beef',{meal_time:['lunch'],ingredients_list:['1 lb ground beef'],cuisine:'Mexican'}),r('pork',{ingredients_list:['ham'],cuisine:'American'}),r('stock',{ingredients_list:['chicken stock','rice'],cuisine:'Mexican'}),r('slow',{ingredients_list:['chicken breast'],cuisine:'Mexican',prep_time_mins:60})];
 const filter={...EMPTY_CHOICE_FILTERS,meals:['lunch','dinner'],proteins:['chicken','beef'],cuisines:['mexican'],maxMinutes:30};
 assert.deepEqual(filterMealChoices(recipes,filter).map(r=>r.id),['chicken','beef']);
 assert.deepEqual(filterMealChoices(recipes,{...filter,meals:['breakfast']}),[]);
 assert.deepEqual(filterMealChoices(recipes,EMPTY_CHOICE_FILTERS),recipes);
 assert.deepEqual(availableCuisines(recipes),['american','mexican']);
});
test('applying new filters drops incompatible holds and keeps compatible held choices',()=>{
 const recipes=[r('keep',{ingredients_list:['chicken']}),r('remove',{ingredients_list:['beef']}),r('other',{ingredients_list:['chicken']}),r('next',{ingredients_list:['chicken']})];
 const previous=['keep','remove','other'].map((id,i)=>({key:String(i),label:null,recipe:recipes.find(r=>r.id===id)}));
 const pool=filterMealChoices(recipes,{...EMPTY_CHOICE_FILTERS,proteins:['chicken']});
 const next=rollMealChoices('helpMeDecide',pool,previous,new Set(['keep','remove']));
 assert.equal(next.choices[0].recipe.id,'keep');assert.ok(!ids(next).includes('remove'));assert.equal(new Set(ids(next)).size,3);
 assert.deepEqual(ids(rollMealChoices('helpMeDecide',[],previous,new Set(['keep']))),[]);
});
