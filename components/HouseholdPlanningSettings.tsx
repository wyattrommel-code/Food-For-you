import React,{useState} from 'react';
import {View,Text,Switch,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useTheme} from '@/context/ThemeContext';
import {useHouseholdPlanning} from '@/context/HouseholdPlanningContext';
import type {PlanningSettings,PlannerScope} from '@/lib/householdPlanning';

export function HouseholdPlanningSettings(){
  const {Colors}=useTheme(),planning=useHouseholdPlanning(),router=useRouter(),[error,setError]=useState('');
  const text={color:Colors.textPrimary,fontSize:16} as const,muted={color:Colors.textSecondary,fontSize:13,lineHeight:19} as const;
  async function save(patch:Partial<PlanningSettings>){setError('');try{await planning.save(patch);}catch(e){setError(e instanceof Error?e.message:'Could not save settings. Try again.');}}
  const disabled=planning.loading||planning.busy||!!planning.error;
  return <View style={{borderWidth:1,borderColor:Colors.border,borderRadius:18,padding:16,gap:16,backgroundColor:Colors.surface}}>
    <Text style={{...text,fontSize:20,fontWeight:'800'}}>Plan together</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:4}}><Text style={{...text,fontWeight:'700'}}>Use household planning</Text><Text style={muted}>Share a meal calendar and its shopping progress. Your personal planner stays private.</Text></View><Switch accessibilityLabel="Use household planning" value={planning.settings.enabled} disabled={disabled} onValueChange={enabled=>void save({enabled})} trackColor={{true:Colors.accent}}/></View>
    {planning.settings.enabled&&<View style={{gap:8}}><Text style={{...text,fontWeight:'700'}}>My main planner</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(['personal','household'] as PlannerScope[]).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={`Make ${value} my main planner`} aria-pressed={planning.settings.defaultPlanner===value} accessibilityState={{selected:planning.settings.defaultPlanner===value}} disabled={disabled} onPress={()=>void save({defaultPlanner:value})} style={{minHeight:44,padding:12,borderRadius:12,borderWidth:1,borderColor:Colors.border,backgroundColor:planning.settings.defaultPlanner===value?Colors.accent:Colors.background}}><Text style={{...text,fontWeight:'600',color:planning.settings.defaultPlanner===value?'#fff':Colors.textPrimary}}>{value==='personal'?'Personal':'Household'}</Text></Pressable>)}</View><Text style={muted}>This is your starting view. Switching planners doesn't change your main planner.</Text></View>}
    <View style={{height:1,backgroundColor:Colors.border}}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:4}}><Text style={{...text,fontWeight:'700'}}>Share food preferences</Text><Text style={muted}>Let household members use your likes, avoided foods, diet and cooking preferences to find meals for you. Switch this off any time.</Text></View><Switch accessibilityLabel="Share food preferences" value={planning.settings.sharePreferences} disabled={disabled} onValueChange={sharePreferences=>void save({sharePreferences})} trackColor={{true:Colors.accent}}/></View>
    <Text style={muted}>Changes to your food preferences in Settings also update what your household uses.</Text>
    {!!(error||planning.error)&&<Text accessibilityRole="alert" style={{...text,color:Colors.accent}}>{error||planning.error}</Text>}
    {!!planning.error&&<Pressable accessibilityRole="button" onPress={()=>void planning.refresh()} style={{padding:12,minHeight:44}}><Text style={{...text,color:Colors.accent}}>Retry household planning</Text></Pressable>}
    {planning.settings.enabled&&<Pressable accessibilityRole="button" onPress={()=>{planning.setActivePlanner(planning.settings.defaultPlanner);router.push('/(tabs)/planner');}} style={{padding:12,minHeight:44}}><Text style={{...text,fontWeight:'700',color:Colors.accent}}>Open planner →</Text></Pressable>}
  </View>;
}
