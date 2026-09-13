const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const file=path.resolve(__dirname,'../lib/groceryStore.ts'),mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {createGroceryStore,reduceGrocery}=mod.exports;
const add=(id,name='milk',source='manual')=>({opId:id,kind:'add',items:[{id:name,name,entryId:id+':0',category:'pantry',sources:{[source]:source},checked:false}]});
const tick=()=>new Promise(r=>setImmediate(r));
function environment(){const data={cache:null,cloud:[],offline:false,failWrite:false,failRead:false,applied:new Set(),calls:0};const io={read:async()=>{if(data.failRead)throw Error('disk');return data.cache;},write:async value=>{if(data.failWrite)throw Error('disk');data.cache=value;},fetch:async()=>{if(data.offline)throw Error('Offline; reconnect to sync');return structuredClone(data.cloud);},apply:async op=>{if(data.offline)throw Error('Offline; reconnect to sync');data.calls++;if(!data.applied.has(op.opId)){data.cloud=reduceGrocery(data.cloud,op);data.applied.add(op.opId);}}};return{data,io};}
test('two people add and check different items without replacing each other’s list',async()=>{
 const e=environment(),a=createGroceryStore(e.io),b=createGroceryStore({...e.io,read:async()=>null,write:async()=>{}});await Promise.all([a.init,b.init]);
 await a.mutate(()=>add('a'));await a.refresh();await b.refresh();
 await Promise.all([a.mutate(items=>({opId:'check',kind:'check',items:[{id:'milk',entryId:items[0].entryId,checked:true}]})),b.mutate(()=>add('b','bread'))]);
 await Promise.all([a.refresh(),b.refresh()]);await a.refresh();await b.refresh();
 assert.equal(a.getSnapshot().items.find(r=>r.id==='milk').checked,true);assert.equal(a.getSnapshot().items.length,2);assert.deepEqual(a.getSnapshot().items,b.getSnapshot().items);
});
test('offline changes survive closing the app and merge with the partner’s new rows',async()=>{
 const e=environment();e.data.offline=true;const a=createGroceryStore(e.io);await a.mutate(()=>add('offline'));await tick();assert.equal(a.getSnapshot().pending.length,1);a.dispose();
 e.data.cloud=reduceGrocery([],add('partner','bread'));e.data.offline=false;const restarted=createGroceryStore(e.io);await restarted.refresh();assert.equal(restarted.getSnapshot().pending.length,0);assert.equal(restarted.getSnapshot().items.length,2);
});
test('a lost response can retry the same operation without duplicating or reversing a check',async()=>{
 const e=environment();let lost=true;const apply=e.io.apply;e.io.apply=async op=>{await apply(op);if(lost){lost=false;throw Error('Lost response');}};
 const store=createGroceryStore(e.io);await store.mutate(()=>add('stable'));await tick();await store.refresh();assert.equal(e.data.cloud.length,1);assert.equal(store.getSnapshot().pending.length,0);assert.equal(e.data.applied.size,1);
});
test('a stale offline clear preserves a partner’s newer edit and later additions',()=>{
 const original=reduceGrocery([],add('one'));const stale={opId:'clear',kind:'remove',items:[{id:'milk',entryId:'one:0',revision:1}]};
 const edited=reduceGrocery(original,{opId:'check',kind:'check',items:[{id:'milk',entryId:'one:0',checked:true}]});
 const next=reduceGrocery(reduceGrocery(edited,add('two','bread')),stale);assert.equal(next.length,2);
 const recreated=reduceGrocery(reduceGrocery(original,stale),add('new'));assert.equal(reduceGrocery(recreated,{opId:'oldcheck',kind:'check',items:[{id:'milk',entryId:'one:0',checked:true}]}).find(r=>r.id==='milk').checked,false);
});
test('removing one recipe preserves manual items and other recipe contributions',()=>{
 let items=reduceGrocery([],add('a','milk','recipe-a'));items=reduceGrocery(items,add('b','milk','recipe-b'));items=reduceGrocery(items,add('c','bread'));
 items=reduceGrocery(items,{opId:'remove-a',kind:'remove_recipe',items:[{id:'milk',entryId:'a:0',recipeId:'recipe-a'}]});assert.equal(items.length,2);assert.deepEqual(items.find(r=>r.id==='milk').recipeIds,['recipe-b']);
});
test('rapid writes serialize and a storage failure does not falsely report a saved change',async()=>{
 const e=environment(),s=createGroceryStore({read:e.io.read,write:e.io.write});await Promise.all([s.mutate(()=>add('1')),s.mutate(()=>add('2','bread'))]);assert.equal(s.getSnapshot().items.length,2);
 e.data.failWrite=true;await assert.rejects(s.mutate(()=>add('3','eggs')));assert.equal(s.getSnapshot().items.length,2);
});
test('unreadable local storage is not silently replaced with an empty list',async()=>{
 const e=environment();e.data.failRead=true;const s=createGroceryStore(e.io);await s.init;await assert.rejects(s.mutate(()=>add('blocked')));assert.equal(e.data.cache,null);e.data.failRead=false;await s.refresh();await s.mutate(()=>add('okay'));await s.refresh();assert.equal(s.getSnapshot().items.length,1);
});
test('disposing a household store cannot send future edits into a different account',async()=>{
 const e=environment(),s=createGroceryStore(e.io);await s.init;s.dispose();await assert.rejects(s.mutate(()=>add('wrong-account')));assert.equal(e.data.calls,0);
});
