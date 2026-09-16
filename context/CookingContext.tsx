import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {usePreferenceState} from './PreferencesContext';
import {useHouseholdPlanning} from './HouseholdPlanningContext';
import {useHousehold} from './HouseholdContext';
import {cookingAudience,type CookingSelection} from '@/lib/householdPlanning';
import type {UserPreferences} from '@/lib/types';

type Value={selection:CookingSelection;choose:(s:CookingSelection)=>void;profiles:UserPreferences[];ready:boolean;message:string;label:string;key:string;group:boolean};
const Context=createContext<Value|null>(null);
export function CookingProvider({children}:{children:React.ReactNode}){
  const own=usePreferenceState(),planning=useHouseholdPlanning(),{household}=useHousehold();
  const ownerKey=`${own.userId}:${household?.id??'none'}`;
  const [stored,setStored]=useState<{key:string;selection:CookingSelection}|null>(null);
  useEffect(()=>setStored(null),[ownerKey]);
  const selection:CookingSelection=useMemo(()=>stored?.key===ownerKey?stored.selection:{mode:'personal',memberIds:[]},[stored,ownerKey]);
  const choose=useCallback((next:CookingSelection)=>setStored({key:ownerKey,selection:next}),[ownerKey]);
  const group=selection.mode!=='personal';
  const audience=useMemo(()=>cookingAudience(selection,planning.members,own.userId,own.preferences),[selection,planning.members,own.userId,own.preferences]);
  const ready=!own.loading&&(!group||(!planning.loading&&!planning.error&&!!planning.householdId&&audience.ids.length>0&&audience.missing.length===0));
  const message=!group?'':planning.error||(!household?'Join a household to cook together.':planning.loading?'Loading household preferences…':audience.missing.length?`${audience.missing.join(', ')} ${audience.missing.length===1?'hasn’t':'haven’t'} shared food preferences. Choose people with shared preferences, or ask them to enable sharing in Household.`:!audience.ids.length?'Choose at least one person.':'');
  const label=!group?'Just me':selection.mode==='household'?'Household':audience.ids.length===1?planning.members.find(m=>m.userId===audience.ids[0])?.name??'Selected person':`${audience.ids.length} people`;
  const key=JSON.stringify([own.userId,group?household?.id:null,selection.mode,[...audience.ids].sort()]);
  return <Context.Provider value={{selection,choose,profiles:audience.profiles,ready,message,label,key,group}}>{children}</Context.Provider>;
}
export function useCooking(){const value=useContext(Context);if(!value)throw Error('CookingProvider required');return value;}
