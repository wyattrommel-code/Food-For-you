import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {type PlannedRecipe,type Purchase,purchaseKey} from '@/lib/plannerShopping';
import {plannerDestination,type PlannerScope} from '@/lib/householdPlanning';

export function usePlannedGroceries(userId:string|null,start:string,scope:PlannerScope='personal',householdId:string|null=null){
  const target=plannerDestination(userId,scope,householdId),key=`${userId}:${target.key}:${start}`;
  const [snapshot,setSnapshot]=useState({key:'',plans:[] as PlannedRecipe[],checks:[] as Purchase[]});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const generation=useRef(0),locked=useRef(false),owner=useRef(key),alive=useRef(true);owner.current=key;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
  const reload=useCallback(async(quiet=false)=>{
    const ticket=++generation.current;if(!quiet)setLoading(true);setError('');
    if(!userId||!target.id){setSnapshot({key,plans:[],checks:[]});setLoading(false);return;}
    try{
      const plans:PlannedRecipe[]=[],checks:Purchase[]=[];
      for(let offset=0;;offset+=500){const result=await supabase.from(target.table).select('*,recipes(title,ingredients_list,shopping_list)').eq(target.column,target.id).gte('plan_date',start).order('plan_date').order('id').range(offset,offset+499);if(result.error)throw result.error;plans.push(...(result.data??[]) as PlannedRecipe[]);if((result.data?.length??0)<500)break;}
      for(let offset=0;;offset+=500){const result=await supabase.from(target.purchases).select('plan_id,ingredient_key,checked').eq(target.column,target.id).order('plan_id').order('ingredient_key').range(offset,offset+499);if(result.error)throw result.error;checks.push(...(result.data??[]));if((result.data?.length??0)<500)break;}
      if(alive.current&&ticket===generation.current&&owner.current===key)setSnapshot({key,plans,checks});
    }catch{if(alive.current&&ticket===generation.current&&owner.current===key){setSnapshot({key,plans:[],checks:[]});setError('Could not load planned groceries. Check your connection and retry.');}}
    finally{if(alive.current&&ticket===generation.current&&owner.current===key)setLoading(false);}
  },[userId,start,target.id,target.table,target.purchases,target.column,key]);
  useFocusEffect(useCallback(()=>{
    void reload();const timer=scope==='household'?setInterval(()=>{if(AppState.currentState==='active'&&!locked.current)void reload(true);},15000):undefined;
    const listener=AppState.addEventListener('change',s=>{if(s==='active')void reload(true);});
    return()=>{generation.current++;if(timer)clearInterval(timer);listener.remove();};
  },[reload,scope]));
  const setBought=async(refs:Purchase[],checked:boolean)=>{
    if(!userId||!target.id)throw Error('This planner is unavailable. Check household access.');
    if(locked.current)throw Error('Wait for the current change to finish.');
    locked.current=true;setBusy(true);
    try{
      const {data:auth}=await supabase.auth.getSession();
      if(!alive.current||owner.current!==key||auth.session?.user.id!==userId)throw Error('Your account or planner changed. Try again.');
      if(refs.some(r=>!snapshot.plans.some(p=>p.id===r.plan_id)))throw Error('These groceries changed. Refresh and try again.');
      const rows=refs.map(r=>({[target.column]:target.id,plan_id:r.plan_id,ingredient_key:r.ingredient_key,checked}));
      const {error}=await supabase.from(target.purchases).upsert(rows,{onConflict:'plan_id,ingredient_key'}).setHeader('Authorization','Bearer '+auth.session.access_token);
      if(error)throw Error('Could not save shopping progress. Check your connection and try again.');
      if(alive.current&&owner.current===key){generation.current++;setLoading(false);setSnapshot(current=>{const map=new Map(current.checks.map(r=>[purchaseKey(r),r]));refs.forEach(r=>map.set(purchaseKey(r),{...r,checked}));return {...current,checks:[...map.values()]};});}
    }finally{locked.current=false;if(alive.current)setBusy(false);}
  };
  return {plans:snapshot.key===key?snapshot.plans:[],checks:snapshot.key===key?snapshot.checks:[],loading:loading||snapshot.key!==key,busy,error,reload:()=>reload(),setBought};
}
