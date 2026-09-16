import React from 'react';
import {Pressable,Text} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';

export function QuickPlanButton({recipe,overlay=false}:{recipe:{id:string;title:string};overlay?:boolean}){
  const router=useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Add ${recipe.title} to planner`}
    onPress={event=>{event.stopPropagation();router.push({pathname:'/(tabs)/planner',params:{recipeId:recipe.id}});}}
    style={{...(overlay?{position:'absolute' as const,top:8,left:8}:{}),minHeight:44,paddingHorizontal:9,borderRadius:14,backgroundColor:overlay?'rgba(0,0,0,0.65)':'#FF3B30',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4}}>
    <Ionicons name="calendar-outline" size={16} color="#fff"/><Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Plan</Text>
  </Pressable>;
}
