const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modules=new Map();
function load(file){const filename=path.resolve(__dirname,'..',file);if(modules.has(filename))return modules.get(filename).exports;const m=new Module(filename,module);modules.set(filename,m);m.require=id=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),id)+'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
const {cookingAudience,matchesAudience,audienceScore,plannerDestination}=load('lib/householdPlanning.ts');
const {normalizePreferences}=load('lib/preferences.ts');
const prefs=patch=>normalizePreferences(patch),own=prefs({disliked_ingredients:['egg'],liked_cuisines:['Mexican']}),partner=prefs({diet_style:'vegan',disliked_ingredients:['peanut'],preferred_meal_styles:['pasta']});
const members=[{userId:'a',name:'Alex',planningEnabled:true,sharingPreferences:false,preferences:null},{userId:'b',name:'Blair',planningEnabled:true,sharingPreferences:true,preferences:partner}];
const recipe=(ingredients,title='Dinner')=>({id:'r',title,ingredients_list:ingredients,cuisine:'Mexican',tags:[],prep_time_mins:20,effort_score:1});
test('personal mode uses only the current cook, not the household',()=>{
 const a=cookingAudience({mode:'personal',memberIds:['b']},members,'a',own);assert.deepEqual(a.profiles,[own]);assert.ok(matchesAudience(recipe(['peanuts']),a.profiles));
});
test('household meals honor every diner’s exclusions and diet, even against their likes',()=>{
 const a=cookingAudience({mode:'household',memberIds:[]},members,'a',own);assert.deepEqual(a.missing,[]);
 for(const bad of ['egg','chicken','milk','peanut butter'])assert.equal(matchesAudience(recipe([bad]),a.profiles),false,bad);
 assert.ok(matchesAudience(recipe(['rice','black beans']),a.profiles));
});
test('choosing another diner can exclude the cook; selection is deduplicated',()=>{
 const a=cookingAudience({mode:'selected',memberIds:['b','b']},members,'a',own);assert.deepEqual(a.ids,['b']);assert.equal(a.profiles.length,1);
});
test('withdrawing consent and membership removal are explicit missing profiles',()=>{
 assert.deepEqual(cookingAudience({mode:'household',memberIds:[]},members.map(m=>({...m,sharingPreferences:false})), 'a',own).missing,['Blair']);
 assert.deepEqual(cookingAudience({mode:'selected',memberIds:['missing']},members,'a',own).missing,['A selected member']);
 assert.equal(matchesAudience(recipe(['rice']),[]),false);
});
test('household weights give each person an equal vote independent of roster order',()=>{
 const r=recipe(['rice']);assert.equal(audienceScore(r,[own,partner]),(audienceScore(r,[own])+audienceScore(r,[partner]))/2);assert.equal(audienceScore(r,[own,partner]),audienceScore(r,[partner,own]));
});
test('profile exclusions are not truncated across a large household',()=>{
 const people=Array.from({length:8},(_,i)=>prefs({disliked_ingredients:Array.from({length:150},(_,j)=>`food${i}item${j}`)}));
 assert.equal(matchesAudience(recipe(['food7item149']),people),false);
});
test('personal and household plans and purchases have separate destinations',()=>{
 assert.equal(plannerDestination('a','personal','h').table,'meal_plans');assert.equal(plannerDestination('a','personal','h').id,'a');
 assert.equal(plannerDestination('a','household','h').table,'household_meal_plans');assert.equal(plannerDestination('a','household','h').id,'h');
 assert.equal(plannerDestination('a','household',null).id,null);assert.notEqual(plannerDestination('a','personal','h').purchases,plannerDestination('a','household','h').purchases);
});
