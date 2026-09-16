import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useHousehold} from './HouseholdContext';
import {useSession} from '@/hooks/useSession';
import {supabase} from '@/lib/supabase';
import {PERSONAL_PLANNING,type PlanningState,type PlanningSettings,type PlannerScope} from '@/lib/householdPlanning';

type Value=PlanningState&{loading:boolean;error:string;busy:boolean;activePlanner:PlannerScope;setActivePlanner:(s:PlannerScope)=>void;refresh:()=>Promise<void>;save:(patch:Partial<PlanningSettings>)=>Promise<void>};
const Context=createContext<Value|null>(null);
export function HouseholdPlanningProvider({children}:{children:React.ReactNode}){
  const {household,loading:membershipLoading}=useHousehold(),{userId}=useSession();
  // Keep the navigator mounted when membership loads or changes. Data is scoped
  // below, so a different household still cannot reuse the previous snapshot.
  return <PlanningProvider userId={userId} householdId={household?.id??null} membershipLoading={membershipLoading}>{children}</PlanningProvider>;
}
function PlanningProvider({children,userId,householdId,membershipLoading}:{children:React.ReactNode;userId:string|null;householdId:string|null;membershipLoading:boolean}){
  const key=`${userId}:${householdId??'none'}`;
  const [snapshot,setSnapshot]=useState<{key:string;state:PlanningState}|null>(null);
  const state:PlanningState=snapshot?.key===key?snapshot.state:{householdId:null,settings:PERSONAL_PLANNING,members:[]};
  const [loading,setLoading]=useState(!!householdId),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [view,setView]=useState<{key:string;scope:PlannerScope}|null>(null);
  const alive=useRef(true),revision=useRef(0),lock=useRef(false),liveKey=useRef(key);liveKey.current=key;
  const request=useCallback(async(patch?:Partial<PlanningSettings>)=>{
    if(!userId||!householdId)throw Error('Join a household first.');
    const {data:auth}=await supabase.auth.getSession();
    if(!alive.current||liveKey.current!==key||auth.session?.user.id!==userId)throw Error('Your account or household changed. Reopen Household.');
    const {data,error:failure}=await supabase.rpc('household_planning_action',{p_household:householdId,p_settings:patch??null}).setHeader('Authorization','Bearer '+auth.session.access_token);
    if(failure)throw Error(patch?'Could not save household settings. Check your connection and retry.':'Could not refresh household planning. Reconnect or retry.');
    if(data?.householdId!==householdId)throw Error('Household access has changed. Reopen Household.');
    return data as PlanningState;
  },[householdId,userId,key]);
  const refresh=useCallback(async()=>{
    if(!householdId||lock.current)return;
    const ticket=++revision.current;
    try{const next=await request();if(alive.current&&liveKey.current===key&&ticket===revision.current){setSnapshot({key,state:next});setError('');}}
    catch(e){if(alive.current&&liveKey.current===key&&ticket===revision.current){setError(e instanceof Error?e.message:'Could not refresh household planning.');setSnapshot(current=>({key,state:{householdId:null,settings:current?.key===key?current.state.settings:PERSONAL_PLANNING,members:[]}}));}}
    finally{if(alive.current&&liveKey.current===key&&ticket===revision.current)setLoading(false);}
  },[householdId,request,key]);
  const save=useCallback(async(patch:Partial<PlanningSettings>)=>{
    if(lock.current)throw Error('Please wait for the current change.');
    lock.current=true;revision.current++;setBusy(true);
    try{const next=await request(patch);if(alive.current&&liveKey.current===key){setSnapshot({key,state:next});setError('');if(patch.defaultPlanner!==undefined||patch.enabled===false)setView(null);}}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  },[request,key]);
  useEffect(()=>{
    alive.current=true;setSnapshot(null);setView(null);setError('');setLoading(!!householdId);void refresh();
    const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},15000);
    const listener=AppState.addEventListener('change',s=>{if(s==='active')void refresh();});
    return()=>{alive.current=false;revision.current++;clearInterval(timer);listener.remove();};
  },[refresh,householdId]);
  const activePlanner=state.settings.enabled?(view?.key===key?view.scope:state.settings.defaultPlanner):'personal';
  const setActivePlanner=useCallback((scope:PlannerScope)=>setView({key,scope}),[key]);
  return <Context.Provider value={{...state,loading:membershipLoading||(!!householdId&&(loading||snapshot?.key!==key)),error:snapshot?.key===key?error:'',busy,activePlanner,setActivePlanner,refresh,save}}>{children}</Context.Provider>;
}
export function useHouseholdPlanning(){const value=useContext(Context);if(!value)throw Error('HouseholdPlanningProvider required');return value;}
