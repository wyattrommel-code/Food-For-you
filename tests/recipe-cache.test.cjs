const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const filename=path.resolve(__dirname,'../lib/recipeCache.ts'),m=new Module(filename,module);
m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
const {createRecipeCache}=m.exports;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('Home, browse and planner share one request; fresh navigation needs no network',async()=>{
 let reads=0,time=100;const network=deferred();
 const cache=createRecipeCache(()=>{reads++;return network.promise;},()=>time,1000);
 const visits=[cache.load(),cache.load(),cache.load(true)];
 await Promise.resolve();assert.equal(reads,1);assert.equal(cache.getSnapshot().refreshing,true);
 network.resolve([{id:'public'}]);await Promise.all(visits);
 await cache.load();assert.equal(reads,1);assert.equal(cache.getSnapshot().loaded,true);
 time=1101;await cache.load();assert.equal(reads,2);
});
test('background failures retain usable recipes and explicit retry recovers',async()=>{
 let failure=false;const cache=createRecipeCache(async()=>{if(failure)throw Error('offline');return ['recipe'];});
 await cache.load();failure=true;await cache.load(true);
 assert.deepEqual(cache.getSnapshot().rows,['recipe']);assert.equal(cache.getSnapshot().loaded,true);
 assert.ok(cache.getSnapshot().error);assert.equal(cache.getSnapshot().refreshing,false);
 failure=false;await cache.load(true);assert.equal(cache.getSnapshot().error,null);
});
test('first-load failure remains retryable instead of caching an empty success',async()=>{
 let failure=true;const cache=createRecipeCache(async()=>{if(failure)throw Error('offline');return ['ready'];});
 await cache.load();assert.equal(cache.getSnapshot().loaded,false);
 failure=false;await cache.load();assert.deepEqual(cache.getSnapshot().rows,['ready']);
});
test('a late response from a signed-out account cannot populate another account cache',async()=>{
 const oldRequest=deferred();const oldAccount=createRecipeCache(()=>oldRequest.promise);
 const newAccount=createRecipeCache(async()=>['new account recipe']);
 const oldLoad=oldAccount.load();await newAccount.load();oldRequest.resolve(['private old recipe']);await oldLoad;
 assert.deepEqual(newAccount.getSnapshot().rows,['new account recipe']);
});
test('recipe writes invalidate an older in-flight read before marking the catalog fresh',async()=>{
 const oldRead=deferred();let reads=0;
 const cache=createRecipeCache(()=>++reads===1?oldRead.promise:Promise.resolve(['new recipe']));
 const loading=cache.load();const invalidated=cache.invalidate();oldRead.resolve(['stale recipe']);
 await Promise.all([loading,invalidated]);assert.equal(reads,2);assert.deepEqual(cache.getSnapshot().rows,['new recipe']);
});
