import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {type PlanEntry,type PlanSlot,parseDay} from '@/lib/planner';
import {plannerDestination,type PlannerScope} from '@/lib/householdPlanning';

export function usePlanner(userId:string|null,start:string,end:string,scope:PlannerScope='personal',householdId:string|null=null){
  const target=plannerDestination(userId,scope,householdId),key=`${userId}:${target.key}:${start}:${end}`;
  const [snapshot,setSnapshot]=useState({key:'',entries:[] as PlanEntry[]});
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const lock=useRef(false),revision=useRef(0),live=useRef(key),alive=useRef(true);live.current=key;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;revision.current++;};},[]);
  const load=useCallback(async(quiet=false)=>{
    const ticket=++revision.current;if(!quiet)setLoading(true);setError('');
    if(!userId||!target.id){setSnapshot({key,entries:[]});setLoading(false);return;}
    try{
      const rows:PlanEntry[]=[];
      for(let offset=0;;offset+=500){
        const result=await supabase.from(target.table).select('*').eq(target.column,target.id).gte('plan_date',start).lte('plan_date',end).order('created_at').order('id').range(offset,offset+499);
        if(result.error)throw result.error;rows.push(...(result.data??[]));if((result.data?.length??0)<500)break;
      }
      if(alive.current&&ticket===revision.current&&live.current===key)setSnapshot({key,entries:rows});
    }catch{if(alive.current&&ticket===revision.current&&live.current===key){setError('Could not load this planner. Check your connection and retry.');setSnapshot({key,entries:[]});}}
    finally{if(alive.current&&ticket===revision.current&&live.current===key)setLoading(false);}
  },[userId,target.table,target.column,target.id,start,end,key]);
  useFocusEffect(useCallback(()=>{
    void load();
    const timer=scope==='household'?setInterval(()=>{if(AppState.currentState==='active'&&!lock.current)void load(true);},15000):undefined;
    const listener=AppState.addEventListener('change',s=>{if(s==='active')void load(true);});
    return()=>{revision.current++;if(timer)clearInterval(timer);listener.remove();};
  },[load,scope]));
  async function change(operation:(token:string)=>PromiseLike<{error:any}>){
    if(!userId||!target.id)throw Error('This planner is unavailable. Check your household settings.');
    if(lock.current)throw Error('Please wait for the current change to finish.');
    lock.current=true;setBusy(true);setError('');
    try{
      const {data:auth}=await supabase.auth.getSession();
      if(!alive.current||live.current!==key||auth.session?.user.id!==userId)throw Error('Your account or planner changed. Try again.');
      const {error}=await operation(auth.session.access_token);
      if(error)throw Error(error.code==='23505'?'This recipe is already planned for that day and meal.':error.code==='PGRST116'?'This meal changed on another device. Refresh the planner and try again.':'Could not save this planner. Check your connection and household access, then retry.');
      if(alive.current&&live.current===key)await load(true);
    }finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  const filterEntry=(entry:PlanEntry)=>{
    if((scope==='household'?entry.household_id:entry.user_id)!==target.id)throw Error('This meal belongs to another planner.');
  };
  return {entries:snapshot.key===key?snapshot.entries:[],loading:loading||snapshot.key!==key,error,busy,reload:()=>load(),
    add:(date:string,slot:PlanSlot,recipe:{id:string;title:string},destination:PlannerScope=scope)=>{parseDay(date);const to=plannerDestination(userId,destination,householdId);if(!to.id)throw Error('This planner is unavailable. Check household access.');return change(token=>supabase.from(to.table).upsert({[to.column]:to.id,...(destination==='household'?{created_by:userId}:{}),plan_date:date,meal_slot:slot,recipe_id:recipe.id,recipe_title:recipe.title},{onConflict:`${to.column},plan_date,meal_slot,recipe_id`,ignoreDuplicates:true}).setHeader('Authorization','Bearer '+token));},
    move:(entry:PlanEntry,date:string,slot:PlanSlot)=>{parseDay(date);filterEntry(entry);return change(token=>supabase.from(target.table).update({plan_date:date,meal_slot:slot}).eq('id',entry.id).eq(target.column,target.id!).eq('plan_date',entry.plan_date).eq('meal_slot',entry.meal_slot).select().single().setHeader('Authorization','Bearer '+token));},
    remove:(entry:PlanEntry)=>{filterEntry(entry);return change(token=>supabase.from(target.table).delete().eq('id',entry.id).eq(target.column,target.id!).eq('plan_date',entry.plan_date).eq('meal_slot',entry.meal_slot).select().single().setHeader('Authorization','Bearer '+token));},
  };
}
