import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View,Text,Pressable,ScrollView,TextInput,Modal,ActivityIndicator,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useSession} from '@/hooks/useSession';
import {usePreferences} from '@/hooks/usePreferences';
import {usePlanner} from '@/hooks/usePlanner';
import {useTheme} from '@/context/ThemeContext';
import {supabase} from '@/lib/supabase';
import {DbRecipe,isRecipeBanned} from '@/lib/types';
import {dateKey,weekDays,shiftDay,dayLabel,PLAN_SLOTS,PlanSlot,PlanEntry} from '@/lib/planner';

export default function PlannerScreen(){
  const {userId}=useSession();
  return <Planner key={userId??'guest'} userId={userId}/>;
}
function Planner({userId}:{userId:string|null}){
  const router=useRouter(),{Colors}=useTheme();
  const params=useLocalSearchParams<{recipeId?:string}>();
  const recipeId=typeof params.recipeId==='string'?params.recipeId:undefined;
  const {preferences}=usePreferences(userId);
  const [day,setDay]=useState(()=>dateKey(new Date()));
  const days=useMemo(()=>weekDays(day),[day]);
  const planner=usePlanner(userId,days[0],days[6]);
  const [slot,setSlot]=useState<PlanSlot>('menu');
  const [candidate,setCandidate]=useState<{id:string;title:string}|null>(null);
  const [moving,setMoving]=useState<PlanEntry|null>(null);
  const [picker,setPicker]=useState(false),[query,setQuery]=useState('');
  const [catalog,setCatalog]=useState<DbRecipe[]>([]),[catalogLoading,setCatalogLoading]=useState(false),[catalogError,setCatalogError]=useState('');
  const [message,setMessage]=useState(''),[actionError,setActionError]=useState('');
  const [retry,setRetry]=useState(0);
  const scroll=useRef<ScrollView>(null);
  useEffect(()=>{if(candidate)scroll.current?.scrollTo({y:0,animated:true});},[candidate]);
  useEffect(()=>{
    if(!userId)return;
    let active=true;setCatalogLoading(true);setCatalogError('');
    // RLS restricts this query to the shared catalog and this account's private recipes.
    supabase.from('recipes').select('*').order('title').then(({data,error})=>{
      if(!active)return;
      setCatalogLoading(false);
      if(error){setCatalogError('Could not load recipes. Please retry.');return;}
      setCatalog(data??[]);
      if(recipeId){const recipe=data?.find(r=>r.id===recipeId);if(recipe)setCandidate(recipe);else setCatalogError('This recipe is no longer available to your account.');}
    });
    return()=>{active=false;};
  },[userId,recipeId,retry]);
  const results=useMemo(()=>catalog.filter(r=>!isRecipeBanned(r,preferences)&&`${r.title} ${r.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())),[catalog,preferences,query]);
  const s=useMemo(()=>StyleSheet.create({
    page:{flex:1,backgroundColor:Colors.background},content:{padding:20,gap:16,width:'100%',maxWidth:800,alignSelf:'center'},
    row:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},title:{fontSize:28,fontWeight:'800',color:Colors.textPrimary},text:{color:Colors.textPrimary,fontSize:16},muted:{color:Colors.textSecondary,fontSize:14},
    button:{minHeight:44,paddingHorizontal:14,paddingVertical:12,borderRadius:14,backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,justifyContent:'center'},
    chosen:{borderColor:Colors.accent,backgroundColor:Colors.accent},chosenText:{color:'#fff',fontWeight:'700'},
    box:{backgroundColor:Colors.surface,borderRadius:18,padding:16,gap:12,borderWidth:1,borderColor:Colors.border},input:{minHeight:48,padding:12,borderWidth:1,borderColor:Colors.border,borderRadius:12,color:Colors.textPrimary},
  }),[Colors]);
  const button=(label:string,onPress:()=>void,selected=false,disabled=false,accessibilityLabel=label)=><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.button,selected&&s.chosen,disabled&&{opacity:0.5}]}><Text style={selected?s.chosenText:s.text}>{label}</Text></Pressable>;
  async function save(){
    if(!candidate)return;setActionError('');setMessage('');
    try{if(moving)await planner.move(moving,day,slot);else await planner.add(day,slot,candidate);setMessage(`${candidate.title} ${moving?'moved':'added'} to ${dayLabel(day)} · ${PLAN_SLOTS[slot]}.`);setCandidate(null);setMoving(null);router.setParams({recipeId:undefined});}
    catch(e){setActionError(e instanceof Error?e.message:'Could not save. Try again.');}
  }
  function choose(date:string){setDay(date);setSlot('menu');setMoving(null);setCandidate(null);setQuery('');setPicker(true);setActionError('');}
  return <SafeAreaView style={s.page} edges={['top','bottom']}>
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {button('Back',()=>router.canGoBack()?router.back():router.replace('/(tabs)'))}
      <Text style={s.title}>Weekly planner</Text><Text style={s.muted}>Build a menu for each day. Add a recipe to a meal, or keep it in the day’s menu.</Text>
      {!userId?<><Text style={s.text}>Sign in to save your weekly menu.</Text>{button('Sign in',()=>router.push('/login'))}</>:<>
      <View style={s.row}>{button('Previous week',()=>setDay(shiftDay(day,-7)),false,planner.busy)}{button('This week',()=>setDay(dateKey(new Date())),false,planner.busy)}{button('Next week',()=>setDay(shiftDay(day,7)),false,planner.busy)}</View>
      <Text style={s.text}>{dayLabel(days[0])} – {dayLabel(days[6])}</Text>
      {catalogLoading&&recipeId&&<ActivityIndicator accessibilityLabel="Loading recipe"/>}
      {!!catalogError&&<View><Text accessibilityRole="alert" style={s.text}>{catalogError}</Text>{button('Retry recipes',()=>setRetry(n=>n+1))}</View>}
      {candidate&&<View style={s.box}>
        <Text style={s.title}>{moving?'Move recipe':'Add to planner'}</Text><Text style={s.text}>{candidate.title}</Text>
        <Text style={s.muted}>Choose a day</Text><View style={s.row}>{days.map(d=><View key={d}>{button(dayLabel(d),()=>setDay(d),d===day,planner.busy)}</View>)}</View>
        <Text style={s.muted}>Choose a meal or the day’s menu</Text><View style={s.row}>{(Object.keys(PLAN_SLOTS) as PlanSlot[]).map(k=><View key={k}>{button(PLAN_SLOTS[k],()=>setSlot(k),k===slot,planner.busy)}</View>)}</View>
        {button(planner.busy?'Saving…':moving?'Move recipe':'Save to day',()=>void save(),true,planner.busy)}
        {button('Cancel',()=>{setCandidate(null);setMoving(null);router.setParams({recipeId:undefined});},false,planner.busy)}
      </View>}
      {!!actionError&&<Text accessibilityRole="alert" style={s.text}>{actionError}</Text>}
      {!!message&&<Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text>}
      {!!planner.error&&<View><Text accessibilityRole="alert" style={s.text}>{planner.error}</Text>{button('Retry menu',()=>void planner.reload())}</View>}
      {planner.loading?<ActivityIndicator accessibilityLabel="Loading weekly menu"/>:days.map(date=><View key={date} style={s.box}>
        <Text style={[s.text,{fontWeight:'800'}]}>{dayLabel(date)}{date===dateKey(new Date())?' · Today':''}</Text>
        {planner.entries.filter(e=>e.plan_date===date).length===0&&<Text style={s.muted}>No recipes planned yet.</Text>}
        {(Object.keys(PLAN_SLOTS) as PlanSlot[]).flatMap(k=>planner.entries.filter(e=>e.plan_date===date&&e.meal_slot===k).map(entry=><View key={entry.id} style={{gap:6}}>
          <Text style={s.muted}>{PLAN_SLOTS[k]}</Text>
          {button(entry.recipe_title,()=>router.push(`/recipe/${entry.recipe_id}`))}
          <View style={s.row}>{button('Move',()=>{setDay(date);setSlot(entry.meal_slot);setCandidate({id:entry.recipe_id,title:entry.recipe_title});setMoving(entry);setActionError('');},false,planner.busy,`Move ${entry.recipe_title}`)}{button('Remove',()=>{setActionError('');void planner.remove(entry).catch(e=>setActionError(e.message));},false,planner.busy,`Remove ${entry.recipe_title}`)}</View>
        </View>))}
        {button('+ Add recipe',()=>choose(date),false,planner.busy,`Add recipe to ${dayLabel(date)}`)}
      </View>)}
      </>}
    </ScrollView>
    <Modal visible={picker} animationType="slide" onRequestClose={()=>setPicker(false)}>
      <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Choose a recipe</Text><Text style={s.muted}>{dayLabel(day)} · Matches your food preferences. Includes your own recipes.</Text>
        {button('Close recipe picker',()=>setPicker(false))}
        <TextInput accessibilityLabel="Search planner recipes" placeholder="Search recipes" placeholderTextColor={Colors.textMuted} value={query} onChangeText={setQuery} style={s.input}/>
        {catalogLoading?<ActivityIndicator/>:results.map(r=><View key={r.id}>{button(r.title,()=>{setCandidate(r);setPicker(false);})}</View>)}
        {!catalogLoading&&results.length===0&&<Text style={s.text}>No matching recipes. Try another search or add your own recipe in Create.</Text>}
        {!!catalogError&&<><Text accessibilityRole="alert" style={s.text}>{catalogError}</Text>{button('Retry recipe list',()=>setRetry(n=>n+1))}</>}
      </ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
