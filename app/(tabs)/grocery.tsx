import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,TextInput,ScrollView,Pressable,Modal,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '@/context/ThemeContext';
import {useSession} from '@/hooks/useSession';
import {useGroceryList} from '@/hooks/useGroceryList';
import {usePlannedGroceries} from '@/hooks/usePlannedGroceries';
import {useLocalToday} from '@/hooks/useLocalToday';
import {dayLabel,parseDay,shiftDay,weekDays} from '@/lib/planner';
import {plannedShopping,purchaseKey,type ShoppingScope,type PlannedItem} from '@/lib/plannerShopping';
import {CATEGORY_ORDER,CATEGORY_META,categorizeIngredient,type GroceryItem} from '@/lib/groceryHelpers';
import {mergeIngredientsIntoUserPantry,parseGroceryLineToPantryIngredients} from '@/lib/groceryPantrySync';

export default function GroceryScreen(){const {userId}=useSession();return <Groceries key={userId??'guest'} userId={userId}/>;}
function Groceries({userId}:{userId:string|null}){
 const {Colors}=useTheme(),router=useRouter(),params=useLocalSearchParams<{scope?:string;day?:string}>(),today=useLocalToday();
 const [scope,setScope]=useState<ShoppingScope>('all'),[day,setDay]=useState(today),[input,setInput]=useState('');
 const previousToday=useRef(today);
 useEffect(()=>{if(day===previousToday.current)setDay(today);previousToday.current=today;},[today,day]);
 useEffect(()=>{if(['day','week','all'].includes(params.scope??''))setScope(params.scope as ShoppingScope);if(params.day){try{parseDay(params.day);setDay(params.day);}catch{setDay(today);}}},[params.scope,params.day]);
 const week=weekDays(day),start=week[0]<today?week[0]:today;
 const planned=usePlannedGroceries(userId,start),list=useGroceryList();
 useFocusEffect(useCallback(()=>{void list.reload();},[list.reload]));
 const rows=useMemo(()=>plannedShopping(planned.plans,planned.checks,scope,day,today),[planned.plans,planned.checks,scope,day,today]);
 const extras=scope==='all'?list.items:[];
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false);
 const [ack,setAck]=useState<string[]>([]),[ackLoaded,setAckLoaded]=useState(false),[popup,setPopup]=useState<{ids:string[];names:string[]}|null>(null);
 const [confirm,setConfirm]=useState<'clear'|'import'|null>(null);
 const lock=useRef(false),ackKey=`pantry-shopping-prompts:v1:${userId}`;
 useEffect(()=>{let alive=true;AsyncStorage.getItem(ackKey).then(raw=>{if(!alive)return;const parsed=raw?JSON.parse(raw):[];setAck(Array.isArray(parsed)?parsed.filter(x=>typeof x==='string'):[]);setAckLoaded(true);}).catch(()=>setError('Could not read shopping completion history. Reopen Grocery to retry.'));return()=>{alive=false;};},[ackKey]);
 const extraKey=(r:GroceryItem)=>'extra:'+JSON.stringify([r.id,r.entryId??r.addedAt]);
 const complete=rows.length+extras.length>0&&rows.every(r=>r.checked)&&extras.every(r=>r.checked);
 const remaining=rows.filter(r=>!r.checked).length+extras.filter(r=>!r.checked).length;
 const transfer=useMemo(()=>{
  const seen=new Set(ack),ids:string[]=[],names:string[]=[];
  for(const r of rows){const fresh=r.references.filter(p=>p.checked&&!seen.has(purchaseKey(p)));if(fresh.length){ids.push(...fresh.map(purchaseKey));names.push(r.name);}}
  for(const r of extras)if(r.checked&&!seen.has(extraKey(r))){ids.push(extraKey(r));names.push(r.name);}
  return {ids,names:[...new Set(names)]};
 },[rows,extras,ack]);
 useEffect(()=>{if(complete&&ackLoaded&&!planned.loading&&!planned.error&&!list.loading&&!working&&!popup&&transfer.ids.length)setPopup(transfer);},[complete,ackLoaded,planned.loading,planned.error,list.loading,working,popup,transfer]);
 async function run(action:()=>Promise<unknown>){if(lock.current)return;lock.current=true;setWorking(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Could not save. Please try again.');}finally{lock.current=false;setWorking(false);}}
 async function saveAck(next:string[]){const unique=[...new Set(next)].slice(-5000);await AsyncStorage.setItem(ackKey,JSON.stringify(unique));setAck(unique);}
 async function togglePlan(row:PlannedItem){await run(async()=>{await planned.setBought(row.references,!row.checked);if(row.checked){const ids=new Set(row.references.map(purchaseKey));await saveAck(ack.filter(id=>!ids.has(id)));}});}
 async function toggleExtra(row:GroceryItem){await run(async()=>{await list.toggleItem(row.id);if(row.checked)await saveAck(ack.filter(id=>id!==extraKey(row)));});}
 async function finishPantry(add:boolean){if(!popup)return;const current=popup;await run(async()=>{if(add){const count=await mergeIngredientsIntoUserPantry(current.names.flatMap(parseGroceryLineToPantryIngredients));setNotice(count?`Added ${count} new ingredient${count===1?'':'s'} to your pantry.`:'Your pantry already contains these ingredients.');}await saveAck([...ack,...current.ids]);setPopup(null);});}
 const button=(label:string,onPress:()=>void,active=false,disabled=false)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{selected:active,disabled}} onPress={onPress} style={{minHeight:46,padding:12,borderRadius:12,borderWidth:1,borderColor:active?Colors.accent:Colors.border,backgroundColor:active?Colors.accent:Colors.surface,opacity:disabled?0.5:1,justifyContent:'center'}}><Text style={{color:active?'#fff':Colors.textPrimary,fontWeight:'600'}}>{label}</Text></Pressable>;
 const text={color:Colors.textPrimary,fontSize:16} as const,muted={color:Colors.textSecondary,fontSize:13} as const;
 const box={padding:16,borderRadius:16,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface,gap:10} as const;
 function groceryRow(id:string,name:string,detail:string,checked:boolean,toggle:()=>void,disabled:boolean,remove?:()=>void){return <View key={id} style={{flexDirection:'row',gap:8,alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.border}}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Mark ${name} as ${checked?'needed':'bought'}`} aria-checked={checked} accessibilityState={{checked,disabled}} disabled={disabled} onPress={toggle} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:25,height:25,borderWidth:2,borderColor:Colors.accent,backgroundColor:checked?Colors.accent:'transparent',borderRadius:7}}>{checked&&<Text style={{color:'#fff',textAlign:'center'}}>✓</Text>}</View></Pressable><View style={{flex:1}}><Text style={[text,checked&&{textDecorationLine:'line-through',color:Colors.textSecondary}]}>{name}</Text><Text style={muted}>{detail}</Text></View>{remove&&<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+name} disabled={disabled} onPress={remove} style={{minWidth:44,minHeight:44,justifyContent:'center',alignItems:'center'}}><Text style={text}>×</Text></Pressable>}</View>;}
 const selectedTitle=scope==='all'?'All upcoming meals + added items':scope==='day'?dayLabel(day):`${dayLabel(week[0])} – ${dayLabel(week[6])}`;
 return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:Colors.background}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:16,maxWidth:850,width:'100%',alignSelf:'center',paddingBottom:32}}>
  <Text style={{...text,fontSize:28,fontWeight:'800'}}>Grocery List</Text><Text style={muted}>{remaining} remaining · {selectedTitle}</Text>
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{button('Day',()=>setScope('day'),scope==='day')}{button('Week',()=>setScope('week'),scope==='week')}{button('All',()=>setScope('all'),scope==='all')}</View>
  {scope!=='all'&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{button(scope==='day'?'Previous day':'Previous week',()=>setDay(shiftDay(day,scope==='day'?-1:-7)))}{button(scope==='day'?'Today':'This week',()=>setDay(today))}{button(scope==='day'?'Next day':'Next week',()=>setDay(shiftDay(day,scope==='day'?1:7)))}</View>}
  <Text style={muted}>{scope==='all'?'Includes future planned meals and your added shopping items.':"Shopping for the selected dates. Manually added and household items are under All."} Repeated quantities appear as “2 × 1 cup milk”.</Text>
  {!!error&&<Text accessibilityRole="alert" style={{...text,color:Colors.accent}}>{error}</Text>}{!!notice&&<Text accessibilityLiveRegion="polite" style={text}>{notice}</Text>}
  {!!planned.error&&<View style={box}><Text accessibilityRole="alert" style={text}>{planned.error}</Text>{button('Retry planned groceries',()=>void planned.reload())}</View>}
  {planned.loading?<ActivityIndicator accessibilityLabel="Loading planned groceries"/>:<>
   <Text style={{...text,fontWeight:'800'}}>From your meal plan</Text>
   {!rows.length&&<View style={box}><Text style={text}>No ingredients planned for these dates.</Text>{button('Open planner',()=>router.push('/(tabs)/planner' as never))}</View>}
   {CATEGORY_ORDER.map(category=>{const group=rows.filter(r=>categorizeIngredient(r.name)===category);return group.length?<View key={category} style={box}><Text style={{...text,fontWeight:'700'}}>{CATEGORY_META[category].emoji} {CATEGORY_META[category].label}</Text>{group.map(r=>groceryRow('plan:'+r.id,r.count>1?`${r.count} × ${r.name}`:r.name,`${r.sources.join('\n')}\n${r.references.filter(p=>p.checked).length}/${r.count} bought`,r.checked,()=>void togglePlan(r),working||planned.busy||!!planned.error))}</View>:null;})}
  </>}
  {scope==='all'&&<View style={box}>
   <Text style={{...text,fontWeight:'800'}}>{list.household?list.household.name+' · Shared shopping':'Added shopping items'}</Text>
   {button(list.household?'Manage household':'Share a list with your household',()=>router.push('/household'))}
   <Text style={muted}>{list.pending.length?`${list.pending.length} changes waiting to sync`:list.syncing?'Syncing shared list…':list.household?'Household list is shared. Calendar purchases above are personal.':'Extra items are saved on this phone.'}</Text>
   {list.error&&<><Text accessibilityRole="alert" style={text}>{list.error}</Text>{button('Retry added items',()=>void list.reload())}</>}
   {list.importCount>0&&button(`Import saved items (${list.importCount})`,()=>setConfirm('import'))}
   <View style={{flexDirection:'row',gap:8}}><TextInput accessibilityLabel="Grocery item" placeholder="Add an item…" placeholderTextColor={Colors.textMuted} value={input} onChangeText={setInput} maxLength={200} style={{...text,flex:1,borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:12,minWidth:0}}/>{button('Add',()=>void run(async()=>{await list.addItem(input);setInput('');}),false,working||!input.trim())}</View>
   {extras.map(r=>groceryRow('extra:'+r.id,r.name,r.sourceNames.join(', '),r.checked,()=>void toggleExtra(r),working,()=>void run(()=>list.removeItem(r.id))))}
   {list.checkedCount>0&&button('Clear bought extra items',()=>setConfirm('clear'))}
  </View>}
  {complete&&<View style={box}><Text style={{...text,fontWeight:'800'}}>Shopping complete ✓</Text><Text style={muted}>Checked items stay on the list so you can review them.</Text>{button('Update pantry',()=>setPopup({ids:[...rows.flatMap(r=>r.references.map(purchaseKey)),...extras.map(extraKey)],names:[...rows.map(r=>r.name),...extras.map(r=>r.name)]}))}</View>}
 </ScrollView>
 <Modal transparent visible={!!popup} animationType="fade" onRequestClose={()=>{if(!working)void finishPantry(false);}}><View style={{flex:1,backgroundColor:'#0008',padding:24,justifyContent:'center'}}><View style={[box,{maxWidth:500,width:'100%',alignSelf:'center'}]}><Text style={{...text,fontSize:22,fontWeight:'800'}}>Shopping complete!</Text><Text style={text}>Add the bought groceries to your pantry?</Text><Text style={muted}>Adds new ingredient names and keeps what is already there. Quantities and expiry dates are not tracked yet.</Text>{!!error&&<Text accessibilityRole="alert" style={text}>{error}</Text>}{button('Yes, update pantry',()=>void finishPantry(true),true,working)}{button('Not now',()=>void finishPantry(false),false,working)}</View></View></Modal>
 <Modal transparent visible={!!confirm} animationType="fade" onRequestClose={()=>setConfirm(null)}><View style={{flex:1,backgroundColor:'#0008',padding:24,justifyContent:'center'}}><View style={box}><Text style={text}>{confirm==='clear'?'Remove bought items from your added list? Planned ingredients are kept.':list.household?'Copy saved personal items into the list your household can see?':'Import the items saved by the older app on this phone?'}</Text>{button('Continue',()=>void run(async()=>{if(confirm==='clear')await list.clearChecked();else await list.importItems();setConfirm(null);}),true,working)}{button('Cancel',()=>setConfirm(null),false,working)}</View></View></Modal>
 </SafeAreaView>;
}
