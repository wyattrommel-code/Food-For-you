const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modules=new Map();
function load(file){const filename=path.resolve(__dirname,'..',file);if(modules.has(filename))return modules.get(filename).exports;const m=new Module(filename,module);modules.set(filename,m);m.require=(id)=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),id)+'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
const {freshOrder,weightedShuffle,rememberIds,discoveryBonus,tabBarMetrics}=load('lib/discovery.ts');
const {normalizePreferences,readPreferenceCache}=load('lib/preferences.ts');
const {isRecipeBanned}=load('lib/types.ts');
const {createPreferenceStore}=load('lib/preferenceStore.ts');
const seeded=(seed=1)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pool=Array.from({length:20},(_,i)=>({id:String(i),_score:0}));
test('empty preferences produce varied, unique orders without mutating the source',()=>{
 const rng=seeded(),before=JSON.stringify(pool),firsts=new Set();
 for(let i=0;i<30;i++){const order=freshOrder(pool,[],rng);assert.equal(new Set(order.map(r=>r.id)).size,20);firsts.add(order[0].id);}
 assert.ok(firsts.size>10);assert.equal(JSON.stringify(pool),before);
});
test('refresh prioritizes unseen meals, including after persisted history is loaded',()=>{
 const history=rememberIds(['0','1','2','3','4','5'],['6','7']);const order=freshOrder(pool,history,seeded());
 assert.ok(order.slice(0,12).every(r=>!history.includes(r.id)));assert.equal(order.length,20);
});
test('small pools repeat only when needed and rotate the first card',()=>{
 assert.deepEqual(freshOrder([],[]),[]);assert.equal(freshOrder([pool[0]],['0'])[0].id,'0');
 assert.equal(freshOrder(pool.slice(0,2),['0','1'],seeded())[0].id,'1');
 assert.equal(freshOrder([pool[0],pool[0]],[]).length,1);
});
test('preference weights favor matching meals while preserving discovery',()=>{
 const r=seeded(),sample=[{id:'liked',_score:12},{id:'other',_score:0}],counts={liked:0,other:0};
 for(let i=0;i<2000;i++)counts[weightedShuffle(sample,r)[0].id]++;
 assert.ok(counts.liked>counts.other*3);assert.ok(counts.other>100);
 assert.equal(discoveryBonus({title:'Chicken tacos',tags:['tacos'],effort_score:1,prep_time_mins:20},{...normalizePreferences(null),preferred_meal_styles:['tacos'],prefer_easy:true,max_cook_time_mins:30}),8);
});
test('diet and dislikes remain hard exclusions across repeated draws',()=>{
 const catalog=require('../data/recipes/easy-050.json').recipes.map((r,i)=>({...r,id:String(i)}));
 const prefs=normalizePreferences({diet_style:'vegetarian',disliked_ingredients:['peanuts'],liked_ingredients:['chicken']});
 const allowed=catalog.filter(r=>!isRecipeBanned(r,prefs));assert.ok(allowed.length>0&&allowed.length<catalog.length);
 for(let i=0;i<30;i++)for(const r of freshOrder(allowed,pool.map(r=>r.id),seeded(i+1)))assert.equal(isRecipeBanned(r,prefs),false);
});
test('navigation reserves its bottom inset plus usable control height',()=>{
 for(const inset of [0,16,24,34,48])for(const scale of [1,1.3,2]){const m=tabBarMetrics(inset,scale);assert.ok(m.paddingBottom>=inset);assert.ok(m.height-m.paddingBottom-m.paddingTop>=52);}
});
test('legacy cache and malformed fields normalize without completing onboarding',()=>{
 const old=readPreferenceCache(JSON.stringify({liked_ingredients:[' CHICKEN ','chicken']}));assert.deepEqual(old.preferences.liked_ingredients,['chicken']);assert.equal(old.preferences.onboarding_completed_at,null);
 assert.equal(readPreferenceCache('broken').pending,false);
 const p=normalizePreferences({household_size:99,max_cook_time_mins:0,preferred_meal_styles:['junk']});assert.equal(p.household_size,null);assert.equal(p.max_cook_time_mins,null);assert.deepEqual(p.preferred_meal_styles,[]);
});
function fixture(){const data={cache:null,cloud:null,writes:[],failCloud:false,failCache:false};const io={readCache:async()=>data.cache,writeCache:async s=>{if(data.failCache)throw Error();data.cache=s;},readCloud:async()=>data.cloud,writeCloud:async p=>{if(data.failCloud)throw Error();data.cloud=p;data.writes.push(p);}};return {data,io,store:createPreferenceStore(io)};}
test('setup save is shared immediately, durable and preserves old preferences',async()=>{
 const f=fixture();await f.store.refresh();await f.store.update({liked_ingredients:['rice']});
 await f.store.update({household_size:2,onboarding_completed_at:'2026-09-12T00:00:00Z'});
 assert.deepEqual(f.store.getSnapshot().preferences,f.data.cloud);assert.deepEqual(f.data.cloud.liked_ingredients,['rice']);
 const second=createPreferenceStore(f.io);await second.refresh();assert.equal(second.getSnapshot().preferences.household_size,2);assert.ok(second.getSnapshot().preferences.onboarding_completed_at);
});
test('skipping marks setup handled without inventing or clearing choices',async()=>{
 const f=fixture();await f.store.update({disliked_ingredients:['onion']});await f.store.update({onboarding_completed_at:'2026-09-12T00:00:00Z'});
 assert.deepEqual(f.data.cloud.disliked_ingredients,['onion']);assert.deepEqual(f.data.cloud.preferred_meal_styles,[]);
});
test('rapid updates merge and serialize instead of losing earlier choices',async()=>{
 const f=fixture();await f.store.refresh();await Promise.all([f.store.update(p=>({liked_ingredients:[...p.liked_ingredients,'rice']})),f.store.update(p=>({liked_ingredients:[...p.liked_ingredients,'chicken']}))]);
 assert.deepEqual(f.data.cloud.liked_ingredients,['rice','chicken']);assert.equal(f.store.getSnapshot().syncing,false);
});
test('offline saved preferences survive a restart and sync before cloud reconciliation',async()=>{
 const f=fixture();await f.store.refresh();f.data.failCloud=true;
 assert.equal(await f.store.update({household_size:1,onboarding_completed_at:'2026-09-12T00:00:00Z'}),true);assert.equal(readPreferenceCache(f.data.cache).pending,true);
 const second=createPreferenceStore(f.io);await second.refresh();assert.equal(second.getSnapshot().preferences.household_size,1);
 f.data.failCloud=false;await second.refresh();assert.equal(second.getSnapshot().pending,false);assert.equal(f.data.cloud.household_size,1);
});
test('a stale cloud read cannot overwrite a newer preference save',async()=>{
 const f=fixture();let release;f.io.readCloud=()=>new Promise(r=>{release=r;});const store=createPreferenceStore(f.io),reading=store.refresh();
 while(!release)await new Promise(r=>setImmediate(r));await store.update({household_size:3});release({household_size:1});await reading;
 assert.equal(store.getSnapshot().preferences.household_size,3);assert.equal(readPreferenceCache(f.data.cache).preferences.household_size,3);
});
test('local save failure stays incomplete and account stores remain isolated',async()=>{
 const f=fixture();await f.store.refresh();f.data.failCache=true;
 assert.equal(await f.store.update({onboarding_completed_at:'2026-09-12T00:00:00Z'}),false);assert.equal(f.store.getSnapshot().preferences.onboarding_completed_at,null);assert.equal(f.data.writes.length,0);
 const other=fixture();await other.store.update({household_size:6});assert.equal(f.store.getSnapshot().preferences.household_size,null);
});

const recipeA='44444444-4444-4444-8444-444444444441',recipeB='44444444-4444-4444-8444-444444444442';
test('recipe dislikes are unique valid UUIDs, survive cache reload, and do not cap at ingredient limits',()=>{
 const ids=Array.from({length:501},(_,i)=>`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`);
 const normalized=normalizePreferences({disliked_recipe_ids:[...ids,ids[0],'invalid',null]});
 assert.equal(normalized.disliked_recipe_ids.length,501);
 assert.deepEqual(readPreferenceCache(JSON.stringify({preferences:normalized,pending:true})).preferences.disliked_recipe_ids,ids);
 assert.deepEqual(normalizePreferences(null).disliked_recipe_ids,[]);
});
test('dislike excludes a recipe without excluding similar recipes; restoring preserves food restrictions',()=>{
 const a={id:recipeA,title:'Rice bowl',ingredients_list:['rice'],tags:[],cuisine:'American'},b={...a,id:recipeB};
 const prefs=normalizePreferences({disliked_recipe_ids:[recipeA],disliked_ingredients:['egg'],liked_cuisines:['american']});
 assert.equal(isRecipeBanned(a,prefs),true);assert.equal(isRecipeBanned(b,prefs),false);
 const restored=normalizePreferences({...prefs,disliked_recipe_ids:[]});assert.equal(isRecipeBanned(a,restored),false);
 assert.deepEqual(restored.disliked_ingredients,['egg']);assert.deepEqual(restored.liked_cuisines,['american']);
});
test('quick dislike then undo persists the restored state and unrelated preferences',async()=>{
 let disk=null,cloud=null;const store=createPreferenceStore({readCache:async()=>disk,writeCache:async v=>{disk=v;},readCloud:async()=>cloud,writeCloud:async v=>{cloud=v;}});
 await store.refresh();const hide=store.update({disliked_recipe_ids:[recipeA],prefer_easy:true});
 const undo=store.update(current=>({disliked_recipe_ids:current.disliked_recipe_ids.filter(id=>id!==recipeA)}));
 await Promise.all([hide,undo]);assert.deepEqual(cloud.disliked_recipe_ids,[]);assert.equal(cloud.prefer_easy,true);
 assert.deepEqual(readPreferenceCache(disk).preferences.disliked_recipe_ids,[]);
});
test('offline dislikes survive restart and synchronize on reconnect without affecting a second account',async()=>{
 let disk=null,cloud=null,offline=true;
 const io={readCache:async()=>disk,writeCache:async v=>{disk=v;},readCloud:async()=>{if(offline)throw Error('offline');return cloud;},writeCloud:async v=>{if(offline)throw Error('offline');cloud=v;}};
 const first=createPreferenceStore(io);await first.refresh();assert.equal(await first.update({disliked_recipe_ids:[recipeA]}),true);
 const next=createPreferenceStore(io);await next.refresh();assert.deepEqual(next.getSnapshot().preferences.disliked_recipe_ids,[recipeA]);
 offline=false;await next.refresh();assert.deepEqual(cloud.disliked_recipe_ids,[recipeA]);
 const other=createPreferenceStore({...io,readCache:async()=>null,readCloud:async()=>null});await other.refresh();assert.deepEqual(other.getSnapshot().preferences.disliked_recipe_ids,[]);
});
