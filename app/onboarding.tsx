import React,{useEffect,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useTheme} from '@/context/ThemeContext';
import {usePreferences} from '@/hooks/usePreferences';
import {MEAL_STYLES} from '@/lib/discovery';
import {normalizePreferences} from '@/lib/preferences';
import type {UserPreferences} from '@/lib/types';
import {LoadingScreen} from '@/components/LoadingScreen';

const avoidedFoods=['mushrooms','onions','cilantro','olives','fish','shellfish','peanuts','dairy','eggs','gluten'];
const headings=['What sounds good?','Anything you’d rather skip?','What fits your day?','How many are you cooking for?'];
const descriptions=[
  'Pick any favorites. We’ll mix in other ideas so dinner stays interesting.',
  'We’ll filter listed ingredients and keep these choices in Settings.',
  'These choices favor meals that fit your routine. Longer meals can still appear for variety.',
  'We’ll start recipe portions here. You can change the amount for any meal.',
];
export default function OnboardingScreen() {
  const {Colors}=useTheme(),router=useRouter();
  const {from}=useLocalSearchParams<{from?:string}>(),editing=from==='settings';
  const {userId,preferences,loading,syncError,updatePreferences}=usePreferences(null);
  const [draft,setDraft]=useState<UserPreferences|null>(null),[step,setStep]=useState(0),[custom,setCustom]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{if(!loading&&!draft)setDraft(normalizePreferences(preferences));},[loading,preferences,draft]);
  useEffect(()=>{if(!userId&&!loading)router.replace('/login');},[userId,loading,router]);
  const finishRoute=()=>router.replace(editing?'/(tabs)/settings':'/(tabs)');
  const save=async(skip=false)=>{
    if(saving||!draft)return;
    if(skip&&editing){finishRoute();return;}
    setSaving(true);
    const saved=await updatePreferences(skip?{onboarding_completed_at:new Date().toISOString()}:{...draft,onboarding_completed_at:new Date().toISOString()});
    setSaving(false);if(saved)finishRoute();
  };
  if(loading||!draft)return <LoadingScreen message="Loading your food preferences…"/>;
  const change=(patch:Partial<UserPreferences>)=>setDraft({...draft,...patch});
  const toggle=(field:'preferred_meal_styles'|'disliked_ingredients',value:string)=>{
    const values=draft[field]??[];change({[field]:values.includes(value)?values.filter(v=>v!==value):[...values,value]});
  };
  const addCustom=()=>{const value=custom.trim().toLowerCase();if(value&&!draft.disliked_ingredients.includes(value))change({disliked_ingredients:[...draft.disliked_ingredients,value]});setCustom('');};
  const chip=(label:string,selected:boolean,onPress:()=>void)=> <Pressable key={label} accessibilityRole="checkbox" aria-checked={selected} accessibilityState={{checked:selected,disabled:saving}} accessibilityLabel={label} disabled={saving} onPress={onPress} style={[styles.chip,{borderColor:selected?Colors.accent:Colors.border,backgroundColor:selected?Colors.accent:Colors.surface}]}><Text style={[styles.chipText,{color:selected?'#fff':Colors.textPrimary}]}>{selected?'✓ ':''}{label}</Text></Pressable>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:Colors.background}]} edges={['top','bottom','left','right']}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.column}>
        <View style={styles.top}><Text style={{color:Colors.textSecondary}}>Food preferences · {step+1} of 4</Text><Pressable accessibilityRole="button" disabled={saving} onPress={()=>void save(true)} style={styles.smallButton}><Text style={{color:Colors.accent,fontWeight:'700'}}>{editing?'Cancel':'Skip for now'}</Text></Pressable></View>
        <ScrollView key={step} style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[styles.title,{color:Colors.textPrimary}]}>{headings[step]}</Text>
          <Text style={[styles.description,{color:Colors.textSecondary}]}>{descriptions[step]}</Text>
          {step===0&&<View style={styles.chips}>{MEAL_STYLES.map(s=>chip(s.label,draft.preferred_meal_styles?.includes(s.value)??false,()=>toggle('preferred_meal_styles',s.value)))}</View>}
          {step===1&&<>
            <Text style={[styles.label,{color:Colors.textPrimary}]}>How do you eat?</Text>
            <View style={styles.chips}>{[['any','Anything'],['vegetarian','Vegetarian'],['vegan','Vegan']].map(([v,label])=>chip(label,draft.diet_style===v,()=>change({diet_style:v as UserPreferences['diet_style']})))}</View>
            <Text style={[styles.label,{color:Colors.textPrimary}]}>Foods to avoid</Text>
            <View style={styles.chips}>{[...new Set([...avoidedFoods,...draft.disliked_ingredients])].map(v=>chip(v,draft.disliked_ingredients.includes(v),()=>toggle('disliked_ingredients',v)))}</View>
            <View style={styles.inputRow}><TextInput accessibilityLabel="Another ingredient to avoid" value={custom} onChangeText={setCustom} maxLength={80} placeholder="Another ingredient" placeholderTextColor={Colors.textMuted} style={[styles.input,{color:Colors.textPrimary,borderColor:Colors.border}]} onSubmitEditing={addCustom} autoCapitalize="none" returnKeyType="done"/><Pressable accessibilityRole="button" accessibilityLabel="Add ingredient to avoid" style={styles.smallButton} onPress={addCustom}><Text style={{color:Colors.accent,fontWeight:'700'}}>Add</Text></Pressable></View>
            <Text style={[styles.note,{color:Colors.textSecondary}]}>Ingredient filters can miss packaged ingredients and cross-contact. Always check labels if you have an allergy.</Text>
          </>}
          {step===2&&<>
            <Text style={[styles.label,{color:Colors.textPrimary}]}>Usually, I have…</Text>
            <View style={styles.chips}>{[15,30,45,null].map(value=>chip(value?`${value} minutes`:'No time preference',draft.max_cook_time_mins===value,()=>change({max_cook_time_mins:value})))}</View>
            <Text style={[styles.label,{color:Colors.textPrimary}]}>How much effort?</Text>
            <View style={styles.chips}>{chip('Favor easy recipes',draft.prefer_easy===true,()=>change({prefer_easy:!draft.prefer_easy}))}</View>
            <Text style={[styles.note,{color:Colors.textSecondary}]}>“I’m Hungry Now” still looks for quick meals. “Feeling Bold” is there when you want a challenge.</Text>
          </>}
          {step===3&&<View style={styles.chips}>{[1,2,3,4,5,6,null].map(value=>chip(value?(value===1?'Just me':`${value} people`):'Use each recipe’s portions',draft.household_size===value,()=>change({household_size:value})))}</View>}
          <Text style={[styles.note,{color:Colors.textSecondary}]}>Change these anytime in Settings → Food Preferences.</Text>
          {syncError&&<Text accessibilityRole="alert" style={[styles.note,{color:Colors.accent}]}>{syncError}</Text>}
        </ScrollView>
        <View style={[styles.footer,{borderTopColor:Colors.border}]}>
          {step>0&&<Pressable accessibilityRole="button" style={styles.back} disabled={saving} onPress={()=>setStep(step-1)}><Text style={{color:Colors.textPrimary,fontWeight:'700'}}>Back</Text></Pressable>}
          <Pressable accessibilityRole="button" disabled={saving} onPress={()=>step<3?setStep(step+1):void save()} style={[styles.continue,{backgroundColor:Colors.accent,opacity:saving?0.6:1}]}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.continueText}>{step===3?'Save my preferences':'Continue'}</Text>}</Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1},column:{flex:1,width:'100%',maxWidth:640,alignSelf:'center'},top:{paddingHorizontal:20,paddingTop:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'},
  smallButton:{minHeight:48,minWidth:48,paddingHorizontal:10,justifyContent:'center',alignItems:'center'},scroll:{flex:1},body:{padding:20,paddingBottom:32},title:{fontSize:28,fontWeight:'800',marginBottom:12},description:{fontSize:16,lineHeight:24,marginBottom:24},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:10},chip:{borderWidth:1,borderRadius:12,paddingVertical:12,paddingHorizontal:14,minHeight:48,maxWidth:'100%',justifyContent:'center'},chipText:{fontSize:16,fontWeight:'600',flexShrink:1},label:{fontSize:17,fontWeight:'700',marginTop:12,marginBottom:12},
  note:{fontSize:14,lineHeight:21,marginTop:24},inputRow:{flexDirection:'row',gap:8,marginTop:18},input:{flex:1,minWidth:0,minHeight:48,borderWidth:1,borderRadius:10,paddingHorizontal:12,fontSize:16},footer:{borderTopWidth:1,padding:16,flexDirection:'row',gap:12},back:{minHeight:52,paddingHorizontal:16,justifyContent:'center'},continue:{flex:1,minHeight:52,borderRadius:14,padding:14,justifyContent:'center',alignItems:'center'},continueText:{color:'#fff',fontSize:16,fontWeight:'700',textAlign:'center'},
});
