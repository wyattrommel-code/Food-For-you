import React,{useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '@/context/ThemeContext';
import {availableCuisines,EMPTY_CHOICE_FILTERS,filterCount,filterMealChoices,MEAL_FILTERS,PROTEIN_FILTERS,type ChoiceFilters} from '@/lib/choiceFilters';
import type {Recipe} from '@/lib/types';

export function ChoiceFilterSheet({recipes,value,onApply}:{recipes:Recipe[];value:ChoiceFilters;onApply:(filters:ChoiceFilters)=>void}){
  const {Colors}=useTheme();
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(value);
  const count=filterCount(value),matches=filterMealChoices(recipes,draft).length;
  const toggle=(key:'meals'|'proteins'|'cuisines',value:string)=>setDraft(current=>({...current,[key]:current[key].includes(value as never)?current[key].filter(v=>v!==value):[...current[key],value]}));
  const option=(label:string,checked:boolean,onPress:()=>void)=> <Pressable key={label} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} aria-checked={checked} onPress={onPress} style={{minHeight:44,paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:checked?Colors.accent:Colors.border,backgroundColor:checked?Colors.accentSoft:Colors.surface,flexDirection:'row',gap:7,alignItems:'center'}}><Ionicons name={checked?'checkbox':'square-outline'} size={18} color={checked?Colors.accent:Colors.textSecondary}/><Text style={{color:Colors.textPrimary,fontSize:14,flexShrink:1}}>{label}</Text></Pressable>;
  const heading=(title:string)=><Text accessibilityRole="header" style={{color:Colors.textPrimary,fontSize:16,fontWeight:'700'}}>{title}</Text>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={count?`Open filters, ${count} selected`:'Open filters'} accessibilityHint="Choose meal type, protein, cuisine and cooking time." onPress={()=>{setDraft({...value});setOpen(true);}} style={{minHeight:44,minWidth:48,paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:count?Colors.accent:Colors.border,backgroundColor:Colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5}}><Ionicons name="options-outline" size={23} color={Colors.textPrimary}/>{count>0&&<Text style={{color:Colors.accent,fontWeight:'700'}}>{count}</Text>}</Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'#0006',justifyContent:'flex-end'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel filters" onPress={()=>setOpen(false)} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
        <SafeAreaView edges={['top','bottom','left','right']} accessibilityViewIsModal style={{maxHeight:'92%',width:'100%',maxWidth:640,alignSelf:'center',backgroundColor:Colors.background,borderTopLeftRadius:24,borderTopRightRadius:24}}>
          <View style={{paddingHorizontal:20,paddingTop:12,flexDirection:'row',alignItems:'center',gap:12}}><Text accessibilityRole="header" style={{flex:1,fontSize:22,fontWeight:'800',color:Colors.textPrimary}}>Filters</Text><Pressable accessibilityRole="button" accessibilityLabel="Reset filters" onPress={()=>setDraft(EMPTY_CHOICE_FILTERS)} style={{minHeight:44,justifyContent:'center',padding:8}}><Text style={{color:Colors.accent,fontWeight:'700'}}>Reset</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={()=>setOpen(false)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={24} color={Colors.textPrimary}/></Pressable></View>
          <ScrollView contentContainerStyle={{padding:20,gap:14}}>
            <Text style={{color:Colors.textSecondary,fontSize:13}}>Choose any that sound good. Leave a section empty for any option. Your food preferences still apply.</Text>
            {heading('Meal type')}<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{MEAL_FILTERS.map(o=>option(o.label,draft.meals.includes(o.value),()=>toggle('meals',o.value)))}</View>
            {heading('Protein')}<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{PROTEIN_FILTERS.map(o=>option(o.label,draft.proteins.includes(o.value),()=>toggle('proteins',o.value)))}</View>
            {heading('Cuisine')}<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{availableCuisines(recipes).map(cuisine=>option(cuisine.replace(/\b\w/g,c=>c.toUpperCase()),draft.cuisines.includes(cuisine),()=>toggle('cuisines',cuisine)))}</View>
            {heading('Cooking time')}<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[null,15,30,45,60].map(minutes=>option(minutes===null?'Any time':`${minutes} min or less`,draft.maxMinutes===minutes,()=>setDraft(current=>({...current,maxMinutes:minutes}))))}</View>
          </ScrollView>
          <View style={{padding:16,borderTopWidth:1,borderColor:Colors.border,gap:8}}><Text accessibilityLiveRegion="polite" style={{color:Colors.textSecondary,fontSize:13}}>{matches} matching recipe{matches===1?'':'s'}{matches===0?' · Try fewer filters.':''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Apply filters" onPress={()=>{onApply({...draft});setOpen(false);}} style={{minHeight:48,padding:12,borderRadius:14,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Show my choices</Text></Pressable></View>
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}
