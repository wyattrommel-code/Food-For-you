import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { PlanEntry, PlanSlot } from '@/lib/planner';
import { parseDay } from '@/lib/planner';

export function usePlanner(userId: string | null, start: string, end: string) {
  const [entries,setEntries]=useState<PlanEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false), revision=useRef(0);
  const owner=useRef(userId); owner.current=userId;
  const load=useCallback(async()=>{
    const ticket=++revision.current;
    setLoading(true);setError('');
    if(!userId){setEntries([]);setLoading(false);return;}
    const {data,error}=await supabase.from('meal_plans').select('*').eq('user_id',userId).gte('plan_date',start).lte('plan_date',end).order('created_at');
    if(ticket!==revision.current || owner.current!==userId)return;
    if(error){setError('Could not load your menu. Check your connection and retry.');setEntries([]);}
    else setEntries(data??[]);
    setLoading(false);
  },[userId,start,end]);
  useEffect(()=>{setEntries([]);return()=>{revision.current++;};},[userId,start,end]);
  useFocusEffect(useCallback(()=>{void load();return()=>{revision.current++;};},[load]));
  async function change(operation:()=>PromiseLike<{error:any}>) {
    if(!userId)throw new Error('Sign in to save your menu.');
    if(lock.current)throw new Error('Please wait for the current change to finish.');
    lock.current=true;setBusy(true);setError('');
    try {const {error}=await operation();if(error)throw new Error(error.code==='23505'?'This recipe is already planned for that day and meal.':'Could not save your menu. Check your connection and try again.');if(owner.current===userId)await load();}
    finally {lock.current=false;if(owner.current===userId)setBusy(false);}
  }
  return {entries,loading,error,busy,reload:load,
    add:(date:string,slot:PlanSlot,recipe:{id:string;title:string})=>{parseDay(date);return change(()=>supabase.from('meal_plans').upsert({user_id:userId,plan_date:date,meal_slot:slot,recipe_id:recipe.id,recipe_title:recipe.title},{onConflict:'user_id,plan_date,meal_slot,recipe_id'}));},
    move:(entry:PlanEntry,date:string,slot:PlanSlot)=>{parseDay(date);return change(()=>supabase.from('meal_plans').update({plan_date:date,meal_slot:slot}).eq('id',entry.id).eq('user_id',userId!).select().single());},
    remove:(entry:PlanEntry)=>change(()=>supabase.from('meal_plans').delete().eq('id',entry.id).eq('user_id',userId!).select().single()),
  };
}
