import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,Modal,ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTheme} from '@/context/ThemeContext';
import {useCooking} from '@/context/CookingContext';
import {useHouseholdPlanning} from '@/context/HouseholdPlanningContext';
import {useHousehold} from '@/context/HouseholdContext';
import {useSession} from '@/hooks/useSession';

export function CookingForControl({compact=false,inline=false}:{compact?:boolean;inline?:boolean}){
  const {Colors}=useTheme(),cooking=useCooking(),planning=useHouseholdPlanning(),{household}=useHousehold(),{userId}=useSession(),router=useRouter();
  const [open,setOpen]=useState(false),[selected,setSelected]=useState<string[]>([]);
  useEffect(()=>{if(open)setSelected(ids=>ids.filter(id=>planning.members.some(m=>m.userId===id&&(id===userId||m.sharingPreferences))));},[open,planning.members,userId]);
  const openSheet=()=>{setSelected(cooking.selection.mode==='selected'?cooking.selection.memberIds:cooking.selection.mode==='household'?planning.members.filter(m=>m.userId===userId||m.sharingPreferences).map(m=>m.userId):userId?[userId]:[]);setOpen(true);void planning.refresh();};
  const text={color:Colors.textPrimary,fontSize:16} as const;
  const button=(title:string,action:()=>void,active=false,disabled=false)=><Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={action} style={{padding:14,minHeight:48,borderRadius:14,borderWidth:1,borderColor:active?Colors.accent:Colors.border,backgroundColor:active?Colors.accent:Colors.surface,opacity:disabled?0.45:1,justifyContent:'center'}}><Text style={{...text,color:active?'#fff':Colors.textPrimary,fontWeight:'700'}}>{title}</Text></Pressable>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Cooking for: ${cooking.label}`} onPress={openSheet} style={{minHeight:inline?44:48,minWidth:64,maxWidth:compact?108:undefined,paddingHorizontal:10,paddingVertical:8,borderRadius:14,backgroundColor:Colors.surface,borderWidth:1,borderColor:cooking.group?Colors.accent:Colors.border,alignItems:'center',justifyContent:'center',gap:3,flexDirection:compact&&!inline?'column':'row'}}>
      <Ionicons name={cooking.group?'people':'person-outline'} size={19} color={Colors.accent}/><Text numberOfLines={1} style={{fontSize:12,fontWeight:'700',color:Colors.textPrimary}}>{compact?cooking.label:`Cooking for: ${cooking.label}`}</Text>
    </Pressable>
    <Modal transparent visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}><View style={{flex:1,backgroundColor:'#0006',justifyContent:'flex-end'}}><SafeAreaView edges={['bottom','left','right']} style={{maxHeight:'90%',backgroundColor:Colors.background,borderTopLeftRadius:24,borderTopRightRadius:24,width:'100%',maxWidth:620,alignSelf:'center'}}><ScrollView contentContainerStyle={{padding:20,gap:14}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Text style={{...text,fontSize:24,fontWeight:'800',flex:1}}>Who’s eating?</Text><Pressable accessibilityRole="button" accessibilityLabel="Close cooking filter" onPress={()=>setOpen(false)} style={{padding:12}}><Ionicons name="close" size={24} color={Colors.textPrimary}/></Pressable></View>
      <Text style={{...text,color:Colors.textSecondary,fontSize:14}}>Meal ideas use everyone you choose. Avoided foods come first; likes help choose between the matches.</Text>
      {button('Just me',()=>{cooking.choose({mode:'personal',memberIds:[]});setOpen(false);},!cooking.group)}
      {household?<>
        {button('View for household',()=>{cooking.choose({mode:'household',memberIds:[]});setOpen(false);},cooking.selection.mode==='household',planning.loading||!!planning.error)}
        <Text style={{...text,fontWeight:'700'}}>Or choose people</Text>
        {planning.members.map(m=>{const allowed=m.userId===userId||m.sharingPreferences;return <Pressable key={m.userId} accessibilityRole="checkbox" accessibilityLabel={`Cook for ${m.name}`} aria-checked={selected.includes(m.userId)} accessibilityState={{checked:selected.includes(m.userId),disabled:!allowed}} disabled={!allowed} onPress={()=>setSelected(ids=>ids.includes(m.userId)?ids.filter(id=>id!==m.userId):[...ids,m.userId])} style={{minHeight:56,flexDirection:'row',gap:12,alignItems:'center',paddingVertical:8}}><Ionicons name={selected.includes(m.userId)?'checkbox':'square-outline'} size={24} color={allowed?Colors.accent:Colors.textMuted}/><View style={{flex:1}}><Text style={text}>{m.name}{m.userId===userId?' (you)':''}</Text>{!allowed&&<Text style={{color:Colors.textSecondary,fontSize:13}}>Hasn’t shared food preferences yet</Text>}</View></Pressable>;})}
        {button('Use selected people',()=>{cooking.choose({mode:'selected',memberIds:selected});setOpen(false);},true,!selected.length||planning.loading||!!planning.error)}
        {!!planning.error&&<Text accessibilityRole="alert" style={text}>{planning.error}</Text>}
        <Text style={{color:Colors.textSecondary,fontSize:13}}>Each member can enable food-preference sharing in Household. Your personal food settings aren’t changed by this filter.</Text>
      </>:<Text style={text}>Join a household to choose who you’re cooking for.</Text>}
      {button(household?'Household settings':'Set up household',()=>{setOpen(false);router.push('/household');})}
    </ScrollView></SafeAreaView></View></Modal>
  </>;
}
