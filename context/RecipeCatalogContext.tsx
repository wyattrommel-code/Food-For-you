import React,{createContext,useCallback,useContext,useState,useSyncExternalStore} from 'react';
import {useFocusEffect} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {createRecipeCache} from '@/lib/recipeCache';
import type {DbRecipe} from '@/lib/types';

async function fetchCatalog(userId:string|null):Promise<DbRecipe[]> {
  const rows:DbRecipe[]=[];
  for(let offset=0;;offset+=500){
    const query=()=>supabase.from('recipes').select('*')
      .or(`is_user_created.eq.false${userId?`,user_id.eq.${userId}`:''}`)
      .order('created_at',{ascending:false}).order('id').range(offset,offset+499);
    let result=await query();
    if(result.error&&(result.error.code==='PGRST303'||result.error.message.includes('JWT expired'))){
      const {data,error}=await supabase.auth.refreshSession();
      if(error||data.session?.user.id!==userId)throw result.error;
      result=await query();
    }
    if(result.error)throw result.error;
    rows.push(...(result.data??[]));
    if((result.data?.length??0)<500)return rows;
  }
}
const CatalogContext=createContext<ReturnType<typeof createRecipeCache<DbRecipe>>|null>(null);
// The account provider is keyed by user ID: changing accounts destroys this cache.
export function RecipeCatalogProvider({userId,children}:{userId:string|null;children:React.ReactNode}){
  const [cache]=useState(()=>createRecipeCache(()=>fetchCatalog(userId)));
  return <CatalogContext.Provider value={cache}>{children}</CatalogContext.Provider>;
}
export function useRecipeCatalog(){
  const cache=useContext(CatalogContext);
  if(!cache)throw Error('RecipeCatalogProvider is missing.');
  const state=useSyncExternalStore(cache.subscribe,cache.getSnapshot,cache.getSnapshot);
  useFocusEffect(useCallback(()=>{void cache.load();},[cache]));
  const refresh=useCallback(()=>cache.load(true),[cache]);
  return {...state,loading:!state.loaded&&!state.error,refresh,invalidate:cache.invalidate};
}
