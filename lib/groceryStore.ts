import type {GroceryItem} from './groceryHelpers';

export type GroceryRow = {id:string;entryId?:string;name?:string;category?:string;sources?:Record<string,string>;checked?:boolean;revision?:number;recipeId?:string};
export type GroceryOperation = {opId:string;kind:'add'|'check'|'remove'|'remove_recipe';items:GroceryRow[]};
export type GroceryState = {items:GroceryItem[];pending:GroceryOperation[];loading:boolean;syncing:boolean;error:string|null};
type IO = {read:()=>Promise<string|null>;write:(value:string)=>Promise<void>;fetch?:()=>Promise<GroceryItem[]>;apply?:(op:GroceryOperation)=>Promise<void>};
let sequence=0;
export function operationId(){return Date.now().toString(36)+'-'+(++sequence).toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);}
export function readGroceryItems(value:unknown):GroceryItem[]{
 if(!Array.isArray(value))return [];
 return value.filter((r:any)=>r&&typeof r.id==='string'&&typeof r.name==='string'&&['protein','produce','pantry'].includes(r.category)&&Array.isArray(r.recipeIds)&&Array.isArray(r.sourceNames)&&r.recipeIds.length===r.sourceNames.length&&r.recipeIds.every((s:unknown)=>typeof s==='string')&&r.sourceNames.every((s:unknown)=>typeof s==='string')&&typeof r.checked==='boolean');
}
export function reduceGrocery(items:GroceryItem[],op:GroceryOperation):GroceryItem[]{
 const rows=new Map(items.map(r=>[r.id,{...r}]));
 for(const change of op.items){
  const old=rows.get(change.id);
  if(op.kind==='add'){
   if(!old){const entries=Object.entries(change.sources||{});rows.set(change.id,{id:change.id,entryId:change.entryId,name:change.name!,category:change.category as GroceryItem['category'],recipeIds:entries.map(e=>e[0]),sourceNames:entries.map(e=>e[1]),checked:change.checked??false,addedAt:Date.now(),revision:1});}
   else {const sources=Object.fromEntries(old.recipeIds.map((id,i)=>[id,old.sourceNames[i]]));let altered=false;for(const [id,name] of Object.entries(change.sources||{})){if(sources[id]!==name){sources[id]=name;altered=true;}}
    if(altered){const entries=Object.entries(sources);rows.set(old.id,{...old,recipeIds:entries.map(e=>e[0]),sourceNames:entries.map(e=>e[1]),revision:(old.revision??1)+1});}}
  }else if(old&&old.entryId===change.entryId){
   if(op.kind==='check')rows.set(old.id,{...old,checked:change.checked!,revision:(old.revision??1)+1});
   else if(op.kind==='remove'&&(old.revision??1)===change.revision)rows.delete(old.id);
   else if(op.kind==='remove_recipe'&&old.recipeIds.includes(change.recipeId!)){
    const entries=old.recipeIds.map((id,i)=>[id,old.sourceNames[i]]).filter(e=>e[0]!==change.recipeId);
    if(!entries.length)rows.delete(old.id);else rows.set(old.id,{...old,recipeIds:entries.map(e=>e[0]),sourceNames:entries.map(e=>e[1]),revision:(old.revision??1)+1});
   }
  }
 }
 return [...rows.values()];
}
export function createGroceryStore(io:IO){
 let state:GroceryState={items:[],pending:[],loading:true,syncing:false,error:null};
 let base:GroceryItem[]=[];let disposed=false;let ready=false;let chain=Promise.resolve();let syncing:Promise<void>|null=null;const listeners=new Set<()=>void>();
 const emit=(patch:Partial<GroceryState>)=>{if(disposed)return;state={...state,...patch};listeners.forEach(fn=>fn());};
 const locked=<T,>(fn:()=>Promise<T>):Promise<T>=>{const done=chain.then(fn);chain=done.then(()=>{},()=>{});return done;};
 const project=(pending=state.pending)=>pending.reduce(reduceGrocery,base);
 const save=(b:GroceryItem[],pending:GroceryOperation[])=>io.write(JSON.stringify({version:1,items:b,pending}));
 const hydrate=()=>locked(async()=>{try{const raw=await io.read();if(raw){const cache=JSON.parse(raw);if(cache.version!==1||!Array.isArray(cache.pending)||cache.pending.some((op:any)=>!op||!['add','check','remove','remove_recipe'].includes(op.kind)||typeof op.opId!=='string'||!Array.isArray(op.items)))throw Error('Invalid cache');base=readGroceryItems(cache.items);emit({items:base,pending:cache.pending});emit({items:project()});}ready=true;emit({error:null});}catch{emit({error:'Could not read this list on your phone. Retry before making changes.'});}finally{emit({loading:false});}});
 const init=hydrate();
 async function refresh(){
  await init;if(!ready)await hydrate();if(!ready||disposed||!io.fetch||!io.apply)return;if(syncing)return syncing;
  syncing=(async()=>{emit({syncing:true});try{
   // Durable item operations are replayed before reading; never upload a whole stale list.
   while(!disposed){await chain;const op=state.pending[0];if(!op)break;await io.apply!(op);
    await locked(async()=>{const nextBase=reduceGrocery(base,op),pending=state.pending.filter(p=>p.opId!==op.opId);await save(nextBase,pending);base=nextBase;emit({pending,items:project(pending)});});
   }
   if(disposed)return;const remote=await io.fetch!();
   await locked(async()=>{await save(remote,state.pending);base=remote;emit({items:project(),error:null});});
  }catch(e){emit({error:e instanceof Error?e.message:'Could not sync. Your saved changes will retry.'});}finally{emit({syncing:false});syncing=null;}
  })();return syncing;
 }
 async function mutate(make:(items:GroceryItem[])=>GroceryOperation|null){
  await init;await locked(async()=>{if(!ready)throw Error('Reload your saved list before making changes.');if(disposed)throw Error('This list has changed. Try again.');const op=make(state.items);if(!op||!op.items.length)return;
   const next=reduceGrocery(state.items,op);if(next.length>500)throw Error('A grocery list can hold up to 500 items.');
   const pending=io.apply?[...state.pending,op]:[];const nextBase=io.apply?base:next;
   try{await save(nextBase,pending);}catch{emit({error:'Could not save on this phone. Your change was not applied.'});throw Error('Could not save on this phone. Try again.');}
   base=nextBase;emit({pending,items:next,error:null});
  });void refresh();
 }
 return {getSnapshot:()=>state,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},init,refresh,mutate,activate:()=>{disposed=false;},dispose:()=>{disposed=true;listeners.clear();}};
}
