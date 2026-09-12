import React,{createContext,useContext,useEffect,useMemo,useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '@/lib/supabase';
import {createPreferenceStore} from '@/lib/preferenceStore';
type Store=ReturnType<typeof createPreferenceStore>;
const Context=createContext<{userId:string|null;store:Store}|null>(null);
export function PreferencesProvider({userId,children}:{userId:string|null;children:React.ReactNode}) {
  const store=useMemo(()=>createPreferenceStore({
    readCache:()=>AsyncStorage.getItem(`prefs:${userId}`),
    writeCache:value=>AsyncStorage.setItem(`prefs:${userId}`,value),
    readCloud:async()=>{const {data,error}=await supabase.from('user_preferences').select('*').eq('user_id',userId!).maybeSingle();if(error)throw error;return data;},
    writeCloud:async preferences=>{const {error}=await supabase.from('user_preferences').upsert({user_id:userId!,...preferences,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;},
  },!!userId),[userId]);
  useEffect(()=>{void store.refresh();},[store]);
  const value=useMemo(()=>({userId,store}),[userId,store]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferenceState() {
  const value=useContext(Context);if(!value)throw Error('PreferencesProvider is required');
  const state=useSyncExternalStore(value.store.subscribe,value.store.getSnapshot,value.store.getSnapshot);
  return {...state,userId:value.userId,updatePreferences:value.store.update,refresh:value.store.refresh};
}
