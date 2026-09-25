import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useTheme} from '@/context/ThemeContext';
import {useSession} from '@/hooks/useSession';
import {usePreferences} from '@/hooks/usePreferences';
import {useRecipes} from '@/hooks/useRecipes';
import {useCooking} from '@/context/CookingContext';
import {CookingForControl} from '@/components/CookingForControl';
import {RecipeImage} from '@/components/RecipeImage';
import {difficultyLabel} from '@/lib/types';
import {rememberIds} from '@/lib/discovery';
import {CHOICE_TITLES, choiceMode, rollMealChoices, type ChoiceMode, type ChoiceResult} from '@/lib/mealChoices';

// Keep recent choices for this app session, separately for each account and mode.
// Holds belong only to the open results page; they are not saved as favorites.
const recentChoices=new Map<string,string[]>();
type Selection={result:ChoiceResult; held:Set<string>; notice:string};

export default function MealChoicesScreen() {
  const {mode:requestedMode}=useLocalSearchParams<{mode?:string}>();
  const {userId}=useSession();
  const mode=choiceMode(requestedMode);
  const cooking=useCooking();
  return <MealChoices key={`${userId??'guest'}:${mode}:${cooking.key}`} mode={mode} userId={userId}/>;
}

function MealChoices({mode,userId}:{mode:ChoiceMode;userId:string|null}) {
  const router=useRouter(),{Colors}=useTheme();
  const {preferences}=usePreferences(userId);
  const cooking=useCooking();
  const {visibleRecipes,loading,error,refresh,toggleFavorite}=useRecipes(userId,preferences,cooking);
  const [selection,setSelection]=useState<Selection|null>(null);
  const current=useRef<Selection|null>(null);
  const historyKey=`${userId??'guest'}:${mode}:${cooking.key}`;
  const byId=useMemo(()=>new Map(visibleRecipes.map(r=>[r.id,r])),[visibleRecipes]);
  const eligibleKey=visibleRecipes.map(r=>r.id).sort().join(',');
  function commit(next:Selection){current.current=next;setSelection(next);}
  function roll(preserveAll=false) {
    const previous=current.current;
    const held=new Set([...(previous?.held??[])].filter(id=>byId.has(id)));
    const preserve=preserveAll?new Set(previous?.result.choices.flatMap(c=>c.recipe&&byId.has(c.recipe.id)?[c.recipe.id]:[])??[]):held;
    const result=rollMealChoices(mode,visibleRecipes,previous?.result.choices,preserve,recentChoices.get(historyKey));
    const ids=result.choices.flatMap(c=>c.recipe?[c.recipe.id]:[]);
    recentChoices.set(historyKey,rememberIds(ids,recentChoices.get(historyKey)??[]));
    const repeated=previous&&result.choices.some(c=>c.recipe&&!held.has(c.recipe.id)&&previous.result.choices.some(p=>p.recipe?.id===c.recipe?.id));
    commit({result,held,notice:!preserveAll&&repeated?'These are the available matches right now. Some choices may repeat.':''});
  }
  useEffect(()=>{
    if(loading||error)return;
    if(!current.current)roll();
    else if(current.current.result.choices.some(c=>c.recipe&&!byId.has(c.recipe.id)))roll(true);
    else if(current.current.result.choices.some(c=>!c.recipe))roll(true);
    // A favorite change updates card data but never reshuffles the current choices.
  },[loading,error,eligibleKey]);

  const choices=selection?.result.choices.map(c=>({...c,recipe:c.recipe?byId.get(c.recipe.id)??null:null}))??[];
  const count=choices.filter(c=>c.recipe).length;
  const heldCount=choices.filter(c=>c.recipe&&selection?.held.has(c.recipe.id)).length;
  const allHeld=count>0&&heldCount===count;
  function toggleHold(id:string) {
    const previous=current.current;if(!previous)return;
    const held=new Set(previous.held);held.has(id)?held.delete(id):held.add(id);
    commit({...previous,held,notice:''});
  }
  const s=useMemo(()=>StyleSheet.create({
    page:{flex:1,backgroundColor:Colors.background},
    header:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderColor:Colors.border},
    back:{width:44,height:44,alignItems:'center',justifyContent:'center'},
    title:{flex:1,minWidth:0,fontSize:21,fontWeight:'800',color:Colors.textPrimary},
    refresh:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderRadius:22,backgroundColor:Colors.accent},
    refreshText:{fontWeight:'700',color:'#fff',fontSize:14},
    content:{padding:16,gap:14,width:'100%',maxWidth:660,alignSelf:'center',paddingBottom:28},
    description:{fontSize:16,fontWeight:'700',color:Colors.textPrimary},
    hint:{fontSize:13,lineHeight:19,color:Colors.textSecondary},
    card:{borderWidth:1,borderColor:Colors.border,borderRadius:18,backgroundColor:Colors.surface,overflow:'hidden'},
    main:{flexDirection:'row',alignItems:'center',gap:14,padding:12},
    photo:{width:96,height:96,borderRadius:12},
    cardTitle:{fontSize:17,lineHeight:22,fontWeight:'700',color:Colors.textPrimary},
    label:{fontSize:12,fontWeight:'700',color:mode==='sweetTreat'?Colors.dessert:Colors.textSecondary},
    footer:{borderTopWidth:1,borderColor:Colors.border,flexDirection:'row',justifyContent:'space-between',paddingHorizontal:12},
    control:{minHeight:44,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:6},
    heldText:{fontSize:14,fontWeight:'700',color:Colors.accent},
    empty:{padding:20,borderRadius:16,backgroundColor:Colors.surface,gap:12},
  }),[Colors,mode]);

  return <SafeAreaView style={s.page} edges={['top','bottom','left','right']}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={()=>router.canGoBack()?router.back():router.replace('/(tabs)')} style={s.back}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary}/></Pressable>
      <Text accessibilityRole="header" style={s.title}>{CHOICE_TITLES[mode]}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh choices" accessibilityHint="Replace only recipes that are not held." disabled={loading||!!error||allHeld||count===0} onPress={()=>roll()} style={[s.refresh,(loading||!!error||allHeld||count===0)&&{opacity:0.45}]}><Ionicons name="refresh" size={17} color="#fff"/><Text style={s.refreshText}>Refresh</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      <CookingForControl/>
      {!!cooking.message&&<Text accessibilityRole="alert" style={s.hint}>{cooking.message}</Text>}
      {loading?<ActivityIndicator accessibilityLabel="Finding your choices" style={{marginTop:36}}/>:error?<View style={s.empty}><Text accessibilityRole="alert" style={s.hint}>Could not load your choices. Please try again.</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry choices" onPress={()=>void refresh()} style={s.control}><Text style={s.heldText}>Try again</Text></Pressable></View>:<>
        <View style={{gap:5}}><Text style={s.description}>{selection?.result.description}</Text><Text accessibilityLiveRegion="polite" style={s.hint}>{allHeld?'All choices held. Release one to refresh it.':heldCount?`${heldCount} held. Refresh will change the others.`:'Like an option? Hold it and refresh the rest.'}</Text></View>
        {count===0?<View style={s.empty}><Text style={s.description}>No matching recipes yet</Text><Text style={s.hint}>Try another meal button or review your food preferences in Settings.</Text></View>:choices.map(choice=>{
          const recipe=choice.recipe;
          if(!recipe)return <View key={choice.key} style={s.empty}><Text style={s.hint}>{choice.label?`No ${choice.label.toLowerCase()} matches your food preferences yet.`:'No additional matching recipe right now.'}</Text></View>;
          const held=selection?.held.has(recipe.id)??false;
          return <View key={choice.key} testID={`choice-${choice.key}`} style={[s.card,held&&{borderColor:Colors.accent}]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${recipe.title}`} onPress={()=>router.push(`/recipe/${recipe.id}`)} style={s.main}>
              <RecipeImage url={recipe.image_url} style={s.photo} iconSize={32} accessibilityLabel={recipe.title}/>
              <View style={{flex:1,minWidth:0,gap:6}}>{choice.label&&<Text style={s.label}>{choice.label}</Text>}<Text numberOfLines={3} style={s.cardTitle}>{recipe.title}</Text><Text style={s.hint}>{recipe.prep_time_mins} min · {difficultyLabel(recipe.effort_score)}</Text></View>
            </Pressable>
            <View style={[s.footer,{flexWrap:'wrap'}]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${held?'Release':'Hold'} ${recipe.title}`} accessibilityState={{selected:held}} accessibilityHint={held?'Allow this recipe to change on refresh.':'Keep this recipe when refreshing other choices.'} onPress={()=>toggleHold(recipe.id)} style={s.control}><Ionicons name={held?'lock-closed':'lock-open-outline'} size={18} color={held?Colors.accent:Colors.textSecondary}/><Text style={held?s.heldText:s.hint}>{held?'Held':'Hold'}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.is_favorited?'Unsave':'Save'} ${recipe.title}`} accessibilityState={{selected:recipe.is_favorited}} onPress={()=>void toggleFavorite(recipe.id)} style={s.control}><Ionicons name={recipe.is_favorited?'heart':'heart-outline'} size={19} color={recipe.is_favorited?Colors.accent:Colors.textSecondary}/><Text style={s.hint}>{recipe.is_favorited?'Saved':'Save'}</Text></Pressable>
            </View>
          </View>;
        })}
        {!!selection?.notice&&<Text accessibilityLiveRegion="polite" style={s.hint}>{selection.notice}</Text>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
