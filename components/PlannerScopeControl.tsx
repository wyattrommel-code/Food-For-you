import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useTheme} from '@/context/ThemeContext';
import {useHousehold} from '@/context/HouseholdContext';
import {useHouseholdPlanning} from '@/context/HouseholdPlanningContext';
import type {PlannerScope} from '@/lib/householdPlanning';

export function PlannerScopeControl({value,onChange,disabled=false,label='Planner'}:{value:PlannerScope;onChange:(v:PlannerScope)=>void;disabled?:boolean;label?:string}){
  const {Colors}=useTheme(),{household}=useHousehold(),planning=useHouseholdPlanning(),router=useRouter();
  return <View style={{gap:7}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'}}>
      {(['personal','household'] as PlannerScope[]).filter(v=>v==='personal'||planning.settings.enabled).map(v=><Pressable key={v} accessibilityRole="button" accessibilityLabel={`${label}: ${v}`} aria-pressed={value===v} accessibilityState={{selected:value===v}} disabled={disabled||planning.loading} onPress={()=>onChange(v)} style={{minHeight:44,paddingHorizontal:14,paddingVertical:10,borderRadius:22,borderWidth:1,borderColor:value===v?Colors.accent:Colors.border,backgroundColor:value===v?Colors.accent:Colors.surface,opacity:disabled?0.5:1}}><Text style={{fontWeight:'700',color:value===v?'#fff':Colors.textPrimary}}>{v==='personal'?'Personal':'Household'}{planning.settings.defaultPlanner===v?' · Main':''}</Text></Pressable>)}
      {household&&!planning.settings.enabled&&<Pressable accessibilityRole="button" onPress={()=>router.push('/household')} disabled={disabled} style={{minHeight:44,justifyContent:'center',padding:8}}><Text style={{color:Colors.accent,fontWeight:'600'}}>Set up household planning</Text></Pressable>}
    </View>
    {!!planning.error&&<Pressable accessibilityRole="button" onPress={()=>void planning.refresh()}><Text style={{color:Colors.textSecondary,fontSize:13}}>{planning.error} Tap to retry.</Text></Pressable>}
  </View>;
}
