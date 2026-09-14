import {useCallback,useRef,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {type PlannedRecipe,type Purchase,purchaseKey} from '@/lib/plannerShopping';
export function usePlannedGroceries(userId:string|null,start:string){
 const [plans,setPlans]=useState<PlannedRecipe[]>([]),[checks,setChecks]=useState<Purchase[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),locked=useRef(false),owner=useRef(userId);owner.current=userId;
 const reload=useCallback(async()=>{
  const ticket=++generation.current;setLoading(true);setError('');
  if(!userId){setPlans([]);setChecks([]);setLoading(false);return;}
  try{
   const rows:PlannedRecipe[]=[];for(let offset=0;;offset+=500){const result=await supabase.from('meal_plans').select('*,recipes(title,ingredients_list,shopping_list)').eq('user_id',userId).gte('plan_date',start).order('plan_date').order('id').range(offset,offset+499);if(result.error)throw result.error;rows.push(...(result.data??[]) as PlannedRecipe[]);if((result.data?.length??0)<500)break;}
   const bought:Purchase[]=[];for(let offset=0;;offset+=500){const result=await supabase.from('meal_plan_purchases').select('plan_id,ingredient_key,checked').eq('user_id',userId).order('plan_id').order('ingredient_key').range(offset,offset+499);if(result.error)throw result.error;bought.push(...(result.data??[]));if((result.data?.length??0)<500)break;}
   if(ticket===generation.current&&owner.current===userId){setPlans(rows);setChecks(bought);}
  }catch{if(ticket===generation.current)setError('Could not load planned groceries. Check your connection and retry.');}
  finally{if(ticket===generation.current)setLoading(false);}
 },[userId,start]);
 useFocusEffect(useCallback(()=>{void reload();return()=>{generation.current++;};},[reload]));
 const setBought=async(refs:Purchase[],checked:boolean)=>{
  if(!userId)throw Error('Sign in to save your shopping progress.');if(locked.current)throw Error('Wait for the current change to finish.');
  locked.current=true;setBusy(true);try{
   const rows=refs.map(r=>({user_id:userId,plan_id:r.plan_id,ingredient_key:r.ingredient_key,checked}));
   const {error}=await supabase.from('meal_plan_purchases').upsert(rows,{onConflict:'plan_id,ingredient_key'});if(error)throw Error('Could not save shopping progress. Check your connection and try again.');
   if(owner.current===userId){generation.current++;setLoading(false);setChecks(current=>{const map=new Map(current.map(r=>[purchaseKey(r),r]));rows.forEach(r=>map.set(purchaseKey(r),r));return [...map.values()];});}
  }finally{locked.current=false;if(owner.current===userId)setBusy(false);}
 };
 return {plans,checks,loading,busy,error,reload,setBought};
}
