import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '@/lib/supabase';
import {useSession} from '@/hooks/useSession';

export type Household={id:string;name:string;ownerId:string;members:{userId:string;name:string;isOwner:boolean}[];inviteExpiresAt:string|null};
type Result={household:Household|null;invite?:{code:string;expiresAt:string};error?:string};
type Value={household:Household|null;loading:boolean;error:string|null;refresh:()=>Promise<void>;action:(kind:string,data?:Record<string,string>)=>Promise<Result>};
const Context=createContext<Value|null>(null);
export function HouseholdProvider({children}:{children:React.ReactNode}){
 const {userId}=useSession();const [household,setHousehold]=useState<Household|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
 const alive=useRef(true);const serial=useRef(Promise.resolve());const cacheKey='household:v1:'+userId;
 const action=useCallback((kind:string,data:Record<string,string>={}):Promise<Result>=>{
  const task=serial.current.then(async()=>{
   if(!userId||!alive.current)throw Error('Sign in to use a household.');
   const {data:auth}=await supabase.auth.getSession();
   if(!alive.current||auth.session?.user.id!==userId)throw Error('Your account changed. Reopen Household in Settings.');
   const {data:result,error:failure}=await supabase.rpc('household_action',{p_action:kind,p_data:data}).setHeader('Authorization','Bearer '+auth.session.access_token);
   if(failure)throw Error(failure.message);const value=result as Result;if(value.error)throw Error(value.error);
   if(alive.current){setHousehold(value.household);setError(null);setLoading(false);await AsyncStorage.setItem(cacheKey,JSON.stringify(value.household)).catch(()=>setError('Household is connected, but offline details could not be saved.'));}
   return value;
  });serial.current=task.then(()=>{},()=>{});return task;
 },[userId,cacheKey]);
 const refresh=useCallback(async()=>{if(!userId){setLoading(false);return;}try{await action('get');}catch{if(alive.current){setError('Could not check household access. Reconnect to sync.');setLoading(false);}}},[action,userId]);
 useEffect(()=>{alive.current=true;let timer:ReturnType<typeof setInterval>|undefined;
  const start=()=>{if(timer)clearInterval(timer);timer=setInterval(()=>void refresh(),15000);};
  void (async()=>{try{const raw=await AsyncStorage.getItem(cacheKey);const cached=raw?JSON.parse(raw):null;if(alive.current&&cached&&typeof cached.id==='string'&&Array.isArray(cached.members)&&cached.members.some((m:{userId:string})=>m.userId===userId))setHousehold(cached);}catch{}await refresh();})();
  if(userId&&AppState.currentState==='active')start();
  const listener=AppState.addEventListener('change',state=>{if(timer)clearInterval(timer);if(state==='active'&&userId){void refresh();start();}});
  return()=>{alive.current=false;if(timer)clearInterval(timer);listener.remove();};
 },[refresh,userId,cacheKey]);
 return <Context.Provider value={{household,loading,error,refresh,action}}>{children}</Context.Provider>;
}
export function useHousehold(){const value=useContext(Context);if(!value)throw Error('HouseholdProvider required');return value;}
