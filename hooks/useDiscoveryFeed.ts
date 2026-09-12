import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {MealTime, Recipe} from '@/lib/types';
import {freshOrder, rememberIds} from '@/lib/discovery';
const sections: MealTime[]=['breakfast','lunch','dinner','snack','dessert','sides'];
type Order=Partial<Record<MealTime,string[]>>;
export function useDiscoveryFeed(recipes: Recipe[], userId: string|null, preferenceKey: string) {
  const key=`discovery:v1:${userId ?? 'guest'}`;
  const [state,setState]=useState<{key:string; orders:Order}>({key,orders:{}});
  const [readyKey,setReadyKey]=useState<string|null>(null);
  const recent=useRef<Order>({}),orders=useRef<Order>({}),latest=useRef(recipes);
  latest.current=recipes;
  const liveKey=useRef(key);liveKey.current=key;
  useEffect(()=>{let active=true;recent.current={};orders.current={};setState({key,orders:{}});
    void AsyncStorage.getItem(key).then(raw=>{if(!active)return;try {const parsed=JSON.parse(raw||'{}');for(const s of sections)recent.current[s]=Array.isArray(parsed[s])?parsed[s].filter((x:unknown)=>typeof x==='string').slice(0,18):[];}catch {} })
      .catch(()=>{}).finally(()=>{if(active)setReadyKey(key);});
    return()=>{active=false;};
  },[key]);
  const reroll=useCallback(()=>{
    if(readyKey!==key || liveKey.current!==key)return;
    const next:Order={};
    for(const s of sections){const history=rememberIds((orders.current[s]??[]).slice(0,6),recent.current[s]??[]);recent.current[s]=history;
      next[s]=freshOrder(latest.current.filter(r=>r.meal_time.includes(s)),history).map(r=>r.id);}
    orders.current=next;setState({key,orders:next});
    // Save the leading cards now so reopening the app can start with fresh ideas.
    const persisted=Object.fromEntries(sections.map(s=>[s,rememberIds((next[s]??[]).slice(0,6),recent.current[s]??[])]));
    void AsyncStorage.setItem(key,JSON.stringify(persisted)).catch(()=>{});
  },[key,readyKey]);
  const eligibleKey=recipes.map(r=>r.id).sort().join(',');
  useEffect(()=>{reroll();},[eligibleKey,preferenceKey,reroll]);
  const byId=useMemo(()=>new Map(recipes.map(r=>[r.id,r])),[recipes]);
  const getCarouselRecipes=useCallback((section:MealTime):Recipe[]=>state.key!==key?[]:(state.orders[section]??[]).map(id=>byId.get(id)).filter((r):r is Recipe=>!!r),[state,key,byId]);
  return {getCarouselRecipes,reroll,ready:readyKey===key};
}
