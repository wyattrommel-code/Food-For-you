const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modules=new Map();function load(file){const filename=path.resolve(__dirname,'..',file);if(modules.has(filename))return modules.get(filename).exports;const m=new Module(filename,module);modules.set(filename,m);m.require=id=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),id)+'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
const {monthBounds,monthWeeks,shiftMonth,plannedShopping,purchaseKey}=load('lib/plannerShopping.ts');
const plan=(id,date,lines=['1 cup milk'])=>({id,plan_date:date,recipe_id:'same-recipe',recipe_title:'Simple meal',recipes:{ingredients_list:lines,shopping_list:lines}});
const {upcomingDays}=load('lib/planner.ts');

test('upcoming planner starts today even on Sunday and crosses month, year, leap and DST dates',()=>{
 for(const [start,end] of [['2026-09-20','2026-09-26'],['2026-09-29','2026-10-05'],['2026-12-29','2027-01-04'],['2028-02-27','2028-03-04'],['2026-10-30','2026-11-05']]){
  const days=upcomingDays(start);assert.equal(days.length,7);assert.equal(days[0],start);assert.equal(days[6],end);assert.equal(new Set(days).size,7);
 }
});
test('planner grocery shortcut uses exactly its seven visible dates, without changing calendar-week lists',()=>{
 const plans=[plan('past','2026-09-14'),plan('today','2026-09-16'),plan('nextMonday','2026-09-21'),plan('last','2026-09-22'),plan('outside','2026-09-23')];
 const rolling=plannedShopping(plans,[],'week','2026-09-16','2026-09-16',true)[0];
 assert.equal(rolling.count,3);assert.deepEqual(rolling.references.map(r=>r.plan_id),['today','nextMonday','last']);
 assert.equal(plannedShopping(plans,[],'week','2026-09-16','2026-09-16')[0].count,2);
});
test('calendar months include every boundary week and leap day',()=>{
 assert.deepEqual(monthBounds('2028-02-10'),{start:'2028-02-01',end:'2028-02-29'});assert.equal(shiftMonth('2026-12-31',1),'2027-01-01');
 const weeks=monthWeeks('2026-09-14');assert.equal(weeks[0][0],'2026-08-31');assert.equal(weeks.at(-1)[6],'2026-10-04');assert.equal(new Set(weeks.flat()).size,35);
});
test('shopping scopes keep weeks distinct, include boundary dates and omit past meals from All',()=>{
 const plans=[plan('a','2026-08-31'),plan('b','2026-09-01'),plan('c','2026-09-08')];
 assert.equal(plannedShopping(plans,[],'week','2026-09-01','2026-09-01')[0].count,2);
 assert.equal(plannedShopping(plans,[],'day','2026-09-01','2026-09-01')[0].count,1);
 assert.equal(plannedShopping(plans,[],'all','2026-09-01','2026-09-01')[0].count,2);
});
test('repeated recipes require quantities per occurrence; checking today does not buy next week',()=>{
 const plans=[plan('a','2026-09-14'),plan('b','2026-09-21')],checks=[{plan_id:'a',ingredient_key:'1 cup milk',checked:true}];
 assert.equal(plannedShopping(plans,checks,'day','2026-09-14','2026-09-14')[0].checked,true);
 assert.equal(plannedShopping(plans,checks,'day','2026-09-21','2026-09-14')[0].checked,false);
 const all=plannedShopping(plans,checks,'all','2026-09-14','2026-09-14')[0];assert.equal(all.count,2);assert.equal(all.checked,false);assert.equal(all.references.filter(r=>r.checked).length,1);
});
test('different measurements remain separate; removed or edited meals cannot retain stale shopping requirements',()=>{
 const checks=[{plan_id:'a',ingredient_key:'1 cup milk',checked:true}];
 assert.equal(plannedShopping([plan('a','2026-09-14',['1 cup milk','2 cups milk'])],checks,'day','2026-09-14','2026-09-14').length,2);
 assert.deepEqual(plannedShopping([],checks,'all','2026-09-14','2026-09-14'),[]);
 assert.equal(plannedShopping([plan('a','2026-09-14',['1 cup yogurt'])],checks,'day','2026-09-14','2026-09-14')[0].checked,false);
 assert.notEqual(purchaseKey({plan_id:'a',ingredient_key:'b:c'}),purchaseKey({plan_id:'a:b',ingredient_key:'c'}));
});
