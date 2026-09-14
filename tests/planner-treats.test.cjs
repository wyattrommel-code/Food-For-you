const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modules=new Map();
function load(file){const filename=path.resolve(__dirname,'..',file);if(modules.has(filename))return modules.get(filename).exports;const m=new Module(filename,module);modules.set(filename,m);m.require=(id)=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),id)+'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
const {hungryCandidates,pickTreats}=load('lib/treats.ts');
const {dateKey,parseDay,weekDays,shiftDay}=load('lib/planner.ts');
const r=(id,title,extra={})=>({id,title,meal_time:['dessert'],tags:[],prep_time_mins:10,effort_score:1,...extra});
test('hungry pool excludes desserts including mixed meal tags at every fallback time',()=>{
 const recipes=[r('a','Sweet breakfast',{meal_time:['breakfast','dessert']}),r('b','Dinner',{meal_time:['dinner'],prep_time_mins:55})];
 for(const cap of [30,45,null])assert.ok(hungryCandidates(recipes,cap).every(r=>!r.meal_time.includes('dessert')));
 assert.deepEqual(hungryCandidates(recipes,null).map(r=>r.id),['b']);
});
test('sweet picks have three distinct matching options without starving the quick slot',()=>{
 const recipes=[r('a','Chocolate Peanut Butter Mug Cake',{prep_time_mins:5}),r('b','Oven Cinnamon Apple',{prep_time_mins:50}),r('c','Classic Tiramisu',{prep_time_mins:45})];
 for(let i=0;i<30;i++){const picks=pickTreats(recipes);assert.equal(picks.filter(p=>p.recipe).length,3);assert.equal(new Set(picks.map(p=>p.recipe.id)).size,3);assert.equal(picks[2].recipe.id,'a');}
});
test('missing sweet categories stay empty instead of duplicating or mislabeling',()=>{
 const picks=pickTreats([r('a','Vanilla Yogurt Fruit Dip')]);
 assert.equal(picks[0].recipe,null);assert.equal(picks.filter(p=>p.recipe).length,1);
 assert.deepEqual(pickTreats([]).map(p=>p.recipe),[null,null,null]);
});
test('cold desserts that require cooking are not classified hot',()=>{
 assert.equal(pickTreats([r('a','Classic Tiramisu',{prep_time_mins:45})])[0].recipe,null);
});
test('planner uses local dates and crosses year, leap and daylight-saving boundaries',()=>{
 assert.equal(dateKey(parseDay('2026-12-31')),'2026-12-31');assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
 assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
 assert.deepEqual(weekDays('2026-03-08'),['2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08']);
 for(const value of ['2026-02-30','2026-13-01','not-a-date'])assert.throws(()=>parseDay(value));
});
