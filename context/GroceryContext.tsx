import React,{createContext,useCallback,useContext,useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSession} from '@/hooks/useSession';
import {useHousehold} from '@/context/HouseholdContext';
import {supabase} from '@/lib/supabase';
import {createGroceryStore,operationId,readGroceryItems,type GroceryOperation} from '@/lib/groceryStore';
import {categorizeIngredient,type GroceryItem} from '@/lib/groceryHelpers';
import type {DbRecipe} from '@/lib/types';

function useList(){
 const {userId}=useSession();const {household,loading:householdLoading}=useHousehold();const hid=household?.id;
 const key=`groceries:v3:${userId}:${hid||'personal'}`;
 const store=useMemo(()=>createGroceryStore({
  read:()=>AsyncStorage.getItem(key),write:value=>AsyncStorage.setItem(key,value),
  ...(hid?{
   fetch:async()=>{const {data,error}=await supabase.from('household_grocery_items').select('*').eq('household_id',hid).eq('deleted',false).order('created_at');if(error)throw Error(error.message);
    return (data||[]).map(r=>{const entries=Object.entries(r.sources as Record<string,string>);return {id:r.item_key,entryId:r.entry_id,name:r.name,category:r.category,recipeIds:entries.map(e=>e[0]),sourceNames:entries.map(e=>e[1]),checked:r.checked,addedAt:Date.parse(r.created_at),revision:r.revision} as GroceryItem;});},
   apply:async(op:GroceryOperation)=>{const {data:auth}=await supabase.auth.getSession();if(auth.session?.user.id!==userId)throw Error('Your account changed. Reopen your grocery list.');const {error}=await supabase.rpc('household_grocery_apply',{p_household:hid,p_operation:op}).setHeader('Authorization','Bearer '+auth.session.access_token);if(error)throw Error(error.code==='42501'?'Household access has changed. Open Household in Settings.':error.message);}
  }:{}),
 }),[key,hid]);
 const state=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 useEffect(()=>{store.activate();let timer:ReturnType<typeof setInterval>|undefined;let channel:ReturnType<typeof supabase.channel>|undefined;let generation=0;
  const stop=()=>{generation++;if(timer)clearInterval(timer);if(channel){void supabase.removeChannel(channel);channel=undefined;}};
  const start=()=>{stop();const current=generation;void store.refresh();if(hid){
   timer=setInterval(()=>void store.refresh(),15000);
   void (async()=>{const {data}=await supabase.auth.getSession();if(current!==generation||data.session?.user.id!==userId)return;
    await supabase.realtime.setAuth(data.session.access_token);if(current!==generation)return;
    channel=supabase.channel('household-groceries:'+hid+':'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'household_grocery_items',filter:'household_id=eq.'+hid},()=>void store.refresh()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'household_grocery_items',filter:'household_id=eq.'+hid},()=>void store.refresh()).subscribe(status=>{if(status==='SUBSCRIBED')void store.refresh();});
   })().catch(()=>{});
  }};
  if(AppState.currentState==='active')start();const listener=AppState.addEventListener('change',s=>s==='active'?start():stop());
  return()=>{stop();listener.remove();store.dispose();};
 },[store,hid,userId]);
 const requireReady=useCallback(()=>{if(!userId||householdLoading)throw Error('Wait for your grocery list to finish loading.');},[userId,householdLoading]);
 const addRows=useCallback(async(rows:GroceryItem[])=>{requireReady();await store.mutate(()=>{const opId=operationId();return {opId,kind:'add',items:rows.map((r,i)=>({id:r.name.trim().toLowerCase(),entryId:opId+':'+i,name:r.name.trim(),category:r.category,sources:Object.fromEntries(r.recipeIds.map((id,j)=>[id,r.sourceNames[j]])),checked:r.checked}))};});},[store,requireReady]);
 const addItem=useCallback(async(name:string)=>{const trimmed=name.trim();if(!trimmed)return;if(trimmed.length>200)throw Error('Use an item name of 200 characters or fewer.');await addRows([{id:trimmed.toLowerCase(),name:trimmed,recipeIds:['manual'],sourceNames:['Manually added'],checked:false,addedAt:Date.now(),category:categorizeIngredient(trimmed)}]);},[addRows]);
 const addRecipe=useCallback(async(recipe:Pick<DbRecipe,'id'|'title'|'ingredients_list'>):Promise<'added'|'already_added'>=>{
  const rows=recipe.ingredients_list.filter(name=>typeof name==='string'&&name.trim()).map(name=>({id:name.trim().toLowerCase(),name:name.trim(),recipeIds:[recipe.id],sourceNames:[recipe.title],checked:false,addedAt:Date.now(),category:categorizeIngredient(name)}));
  const current=store.getSnapshot().items;if(rows.every(row=>current.some(r=>r.id===row.id&&r.recipeIds.includes(recipe.id))))return 'already_added';await addRows(rows);return 'added';
 },[addRows,store]);
 const target=(r:GroceryItem)=>({id:r.id,entryId:r.entryId,revision:r.revision??1});
 const mutate=useCallback(async(make:(rows:GroceryItem[])=>GroceryOperation)=>{requireReady();await store.mutate(make);},[store,requireReady]);
 const toggleItem=useCallback((id:string)=>mutate(rows=>({opId:operationId(),kind:'check',items:rows.filter(r=>r.id===id).map(r=>({...target(r),checked:!r.checked}))})),[mutate]);
 const removeItem=useCallback((id:string)=>mutate(rows=>({opId:operationId(),kind:'remove',items:rows.filter(r=>r.id===id).map(target)})),[mutate]);
 const clearChecked=useCallback(()=>mutate(rows=>({opId:operationId(),kind:'remove',items:rows.filter(r=>r.checked).map(target)})),[mutate]);
 const clearAll=useCallback(()=>mutate(rows=>({opId:operationId(),kind:'remove',items:rows.map(target)})),[mutate]);
 const removeRecipe=useCallback((recipeId:string)=>mutate(rows=>({opId:operationId(),kind:'remove_recipe',items:rows.filter(r=>r.recipeIds.includes(recipeId)).map(r=>({...target(r),recipeId}))})),[mutate]);
 const hasRecipe=useCallback((id:string)=>state.items.some(r=>r.recipeIds.includes(id)),[state.items]);
 const [importCount,setImportCount]=useState(0);
 const importKey=hid?`groceries:v3:${userId}:personal`:'grocery_list_v2';
 const readImport=useCallback(async()=>{const legacyDone=await AsyncStorage.getItem('groceries:legacy-imported:'+userId);if(!hid&&legacyDone)return [];const raw=await AsyncStorage.getItem(importKey);const parsed=raw?JSON.parse(raw):null;const rows=readGroceryItems(hid?parsed?.items:parsed);if(hid&&!rows.length&&!legacyDone){const legacy=await AsyncStorage.getItem('grocery_list_v2');return readGroceryItems(legacy?JSON.parse(legacy):[]);}return rows;},[importKey,hid,userId]);
 useEffect(()=>{let alive=true;setImportCount(0);void readImport().then(rows=>{if(alive)setImportCount(rows.length);}).catch(()=>{});return()=>{alive=false;};},[readImport]);
 const importItems=useCallback(async()=>{await addRows(await readImport());if(!hid)await AsyncStorage.setItem('groceries:legacy-imported:'+userId,'true');setImportCount(0);},[addRows,readImport,hid,userId]);
 return {...state,loading:state.loading||householdLoading,household,checkedCount:state.items.filter(r=>r.checked).length,uncheckedCount:state.items.filter(r=>!r.checked).length,reload:store.refresh,addItem,addRecipe,removeRecipe,toggleItem,removeItem,clearChecked,clearAll,hasRecipe,importCount,importItems};
}
const Context=createContext<ReturnType<typeof useList>|null>(null);
export function GroceryProvider({children}:{children:React.ReactNode}){const value=useList();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useGroceryList(){const value=useContext(Context);if(!value)throw Error('GroceryProvider required');return value;}
