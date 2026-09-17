import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, StyleSheet, PanResponder} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router';
import {useSession} from '@/hooks/useSession';
import {usePreferences} from '@/hooks/usePreferences';
import {usePlanner} from '@/hooks/usePlanner';
import {useTheme} from '@/context/ThemeContext';
import {useLocalToday} from '@/hooks/useLocalToday';
import {RecipeImage} from '@/components/RecipeImage';
import {PlannerScopeControl} from '@/components/PlannerScopeControl';
import {useHouseholdPlanning} from '@/context/HouseholdPlanningContext';
import {useCooking} from '@/context/CookingContext';
import {matchesAudience,type PlannerScope} from '@/lib/householdPlanning';
import {useRecipeDislikes} from '@/context/RecipeDislikesContext';
import {useRecipeCatalog} from '@/context/RecipeCatalogContext';
import {isRecipeBanned} from '@/lib/types';
import {monthWeeks, shiftMonth} from '@/lib/plannerShopping';
import {parseDay, upcomingDays, shiftDay, dayLabel, PLAN_SLOTS, PlanSlot, PlanEntry} from '@/lib/planner';

type RecipeChoice = {id:string; title:string};
type Sheet = 'calendar'|'recipes'|'schedule'|'actions'|'shopping'|null;
type Drag = {entry:PlanEntry; originY:number; pointerY:number; originScroll:number; offset:number; target:string|null};

// The handle owns the gesture; the rest of a recipe card remains scrollable and tappable.
function DragHandle({label, disabled, start, move, end, cancel, onAccessibleMove, color}: {
  label:string; disabled:boolean; start:(y:number)=>void; move:(y:number)=>void;
  end:(y:number)=>void; cancel:()=>void; onAccessibleMove:()=>void; color:string;
}) {
  const current=useRef({disabled,start,move,end,cancel});
  current.current={disabled,start,move,end,cancel};
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!current.current.disabled,
    onMoveShouldSetPanResponder:()=>!current.current.disabled,
    onPanResponderGrant:(e)=>current.current.start(e.nativeEvent.pageY),
    onPanResponderMove:(e)=>current.current.move(e.nativeEvent.pageY),
    onPanResponderRelease:(e)=>current.current.end(e.nativeEvent.pageY),
    onPanResponderTerminate:()=>current.current.cancel(),
    onPanResponderTerminationRequest:()=>false,
  }),[]);
  return <View {...responder.panHandlers} accessible accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint="Drag to another day, or activate to choose a date."
    accessibilityActions={[{name:'activate',label:'Choose a date'}]} onAccessibilityAction={onAccessibleMove}
    style={{width:44,minHeight:64,alignItems:'center',justifyContent:'center',touchAction:'none'}}>
    <Ionicons name="reorder-two-outline" size={22} color={color}/>
  </View>;
}

export default function PlannerScreen(){
  const {userId}=useSession();
  return <Planner key={userId??'guest'} userId={userId}/>;
}

function Planner({userId}:{userId:string|null}) {
  const router=useRouter(), {Colors}=useTheme();
  const {recipeId}=useLocalSearchParams<{recipeId?:string}>();
  const {preferences}=usePreferences(userId);
  const dislikes=useRecipeDislikes();
  const planning=useHouseholdPlanning(),cooking=useCooking(),activePlanner=planning.activePlanner;
  const [saveScope,setSaveScope]=useState<PlannerScope>(activePlanner);
  const today=useLocalToday();
  const [anchor,setAnchor]=useState(today), [calendarMonth,setCalendarMonth]=useState(today);
  const previousToday=useRef(today);
  const days=useMemo(()=>upcomingDays(anchor),[anchor]);
  const planner=usePlanner(userId,days[0],days[6],activePlanner,planning.householdId);
  const [sheet,setSheet]=useState<Sheet>(null), [selected,setSelected]=useState<PlanEntry|null>(null);
  const [candidate,setCandidate]=useState<RecipeChoice|null>(null), [moving,setMoving]=useState<PlanEntry|null>(null);
  const [date,setDate]=useState(today), [slot,setSlot]=useState<PlanSlot>('menu'), [query,setQuery]=useState('');
  const {rows:catalog,loading:catalogLoading,error:catalogError,refresh:refreshCatalog}=useRecipeCatalog();
  const [error,setError]=useState(''), [message,setMessage]=useState('');
  const scroll=useRef<ScrollView>(null), viewport=useRef<View>(null);
  const scrollY=useRef(0), contentHeight=useRef(0), frame=useRef({y:0,height:0});
  const dayLayouts=useRef<Record<string,{y:number;height:number}>>({});
  const dragRef=useRef<Drag|null>(null), [drag,setDrag]=useState<Drag|null>(null);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(timer);},[message]);
  useEffect(()=>{
    if(anchor===previousToday.current)setAnchor(today);
    previousToday.current=today;
  },[today,anchor]);
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});scrollY.current=0;},[days[0]]);
  useFocusEffect(useCallback(()=>{
    setAnchor(today);
    scroll.current?.scrollTo({y:0,animated:false});
  },[today]));
  const handledRecipe=useRef<string|null>(null);
  useEffect(()=>{
    if(!recipeId){handledRecipe.current=null;return;}
    if(planning.loading||catalogLoading||!catalog.length||handledRecipe.current===recipeId)return;
    handledRecipe.current=recipeId;
    const recipe=catalog.find(r=>r.id===recipeId);
    if(recipe){setCandidate(recipe);setSaveScope(recipe.is_user_created?'personal':activePlanner);setMoving(null);setDate(today);setCalendarMonth(today);setSlot('menu');setSheet('schedule');setError('');}
    else setError('This recipe is no longer available to your account.');
  },[recipeId,catalog,catalogLoading,today,planning.loading,activePlanner]);
  const byId=useMemo(()=>new Map(catalog.map(r=>[r.id,r])),[catalog]);
  const results=useMemo(()=>catalog.filter(r=>!dislikes.ids.has(r.id)&&(activePlanner==='personal'||!r.is_user_created)&&cooking.ready&&(cooking.group?matchesAudience(r,cooking.profiles):!isRecipeBanned(r,preferences))&&`${r.title} ${r.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())),[catalog,preferences,query,activePlanner,dislikes.ids,cooking.ready,cooking.group,cooking.profiles]);
  const monthTitle=parseDay(anchor).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const weeks=useMemo(()=>monthWeeks(calendarMonth),[calendarMonth]);
  const thisWeek=days[0]===today;
  const s=useMemo(()=>StyleSheet.create({
    page:{flex:1,backgroundColor:Colors.background}, header:{paddingHorizontal:20,paddingTop:12,paddingBottom:12,width:'100%',maxWidth:720,alignSelf:'center',gap:12},
    row:{flexDirection:'row',alignItems:'center',gap:10}, spread:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
    title:{fontSize:24,fontWeight:'800',color:Colors.textPrimary}, text:{fontSize:16,color:Colors.textPrimary}, muted:{fontSize:13,color:Colors.textSecondary},
    icon:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22},
    content:{paddingHorizontal:20,paddingBottom:28,width:'100%',maxWidth:720,alignSelf:'center'},
    day:{paddingTop:16,paddingBottom:18,borderTopWidth:1,borderColor:Colors.border,minHeight:88,gap:8},
    date:{width:42,alignItems:'center',gap:2}, dateNumber:{fontSize:22,fontWeight:'800',color:Colors.textPrimary}, weekday:{fontSize:11,fontWeight:'700',color:Colors.textSecondary},
    dayTitle:{fontSize:17,fontWeight:'700',color:Colors.textPrimary}, empty:{color:Colors.textMuted,fontSize:13,marginLeft:52,marginTop:-6},
    card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,borderRadius:16,minHeight:82},
    cardMain:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:12,padding:10}, thumb:{width:58,height:58,borderRadius:11}, cardTitle:{fontSize:15,fontWeight:'700',color:Colors.textPrimary,lineHeight:20},
    pill:{paddingHorizontal:12,minHeight:40,justifyContent:'center',borderRadius:20,backgroundColor:Colors.surface},
    backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.42)',justifyContent:'flex-end'}, sheet:{backgroundColor:Colors.background,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'90%',width:'100%',maxWidth:640,alignSelf:'center'},
    sheetContent:{padding:20,gap:16,paddingBottom:28}, sheetTitle:{fontSize:22,fontWeight:'800',color:Colors.textPrimary,flex:1},
    button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:Colors.surface,justifyContent:'center'}, primary:{backgroundColor:Colors.accent}, white:{color:'#fff',fontWeight:'700',textAlign:'center',fontSize:16},
    input:{minHeight:48,borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:12,color:Colors.textPrimary,fontSize:16},
    calendarRow:{flexDirection:'row'}, cell:{width:'14.285714%',minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:12,gap:3},
    selected:{backgroundColor:Colors.accent}, chipRow:{flexDirection:'row',flexWrap:'wrap',gap:8}, chip:{padding:12,minHeight:44,borderRadius:12,backgroundColor:Colors.surface},
    notice:{paddingHorizontal:20,paddingVertical:8}, error:{color:Colors.accent,fontSize:14},
  }),[Colors]);
  function close(){if(planner.busy)return;setSheet(null);setCandidate(null);setMoving(null);setSelected(null);setError('');router.setParams({recipeId:undefined});}
  function chooseDay(d:string){setSaveScope(activePlanner);setDate(d);setSlot('menu');setCandidate(null);setMoving(null);setQuery('');setError('');setSheet('recipes');}
  function editEntry(entry:PlanEntry){setSelected(entry);setError('');setSheet('actions');}
  function schedule(entry:PlanEntry){setSaveScope(activePlanner);setDate(entry.plan_date);setSlot(entry.meal_slot);setCandidate({id:entry.recipe_id,title:entry.recipe_title});setMoving(entry);setCalendarMonth(entry.plan_date);setSheet('schedule');setError('');}
  async function save(){
    if(!candidate||planning.loading)return;setError('');
    try{
      if(saveScope==='household'&&(!planning.settings.enabled||!planning.householdId))throw Error('Enable household planning before saving here.');
      if(saveScope==='household'&&byId.get(candidate.id)?.is_user_created)throw Error('Personal recipes stay in your personal planner. Choose Personal to save this recipe.');
      if(moving)await planner.move(moving,date,slot);else await planner.add(date,slot,candidate,saveScope);
      planning.setActivePlanner(saveScope);
      setAnchor(date>=days[0]&&date<=days[6]?anchor:date);setMessage(`${candidate.title} ${moving?'moved':'added'} to ${dayLabel(date)}.`);
      setSheet(null);setCandidate(null);setMoving(null);router.setParams({recipeId:undefined});
    }catch(e){setError(e instanceof Error?e.message:'Could not save your meal. Please retry.');}
  }
  async function remove(){
    if(!selected)return;setError('');
    try{await planner.remove(selected);setMessage(`${selected.recipe_title} removed from ${dayLabel(selected.plan_date)}.`);setSheet(null);setSelected(null);}
    catch(e){setError(e instanceof Error?e.message:'Could not remove your meal. Please retry.');}
  }
  function groceries(scope:'day'|'week'|'all',d=anchor){setSheet(null);router.push({pathname:'/(tabs)/grocery',params:{scope,day:d,window:'rolling'}} as never);}
  function targetAt(y:number){
    if(y<frame.current.y||y>frame.current.y+frame.current.height)return null;
    const local=y-frame.current.y+scrollY.current;
    return days.find(d=>{const box=dayLayouts.current[d];return box&&local>=box.y&&local<box.y+box.height;})??null;
  }
  function updateDrag(y:number){
    const current=dragRef.current;if(!current)return;
    const next={...current,pointerY:y,offset:y-current.originY+scrollY.current-current.originScroll,target:targetAt(y)};
    dragRef.current=next;setDrag(next);
  }
  function startDrag(entry:PlanEntry,y:number){
    if(planner.busy)return;
    viewport.current?.measureInWindow((_x,top,_w,height)=>{frame.current={y:top,height};});
    const value={entry,originY:y,pointerY:y,originScroll:scrollY.current,offset:0,target:entry.plan_date};
    dragRef.current=value;setDrag(value);setError('');setMessage('');
  }
  function cancelDrag(){dragRef.current=null;setDrag(null);}
  async function endDrag(y:number){
    const current=dragRef.current;const target=targetAt(y);cancelDrag();
    if(!current)return;
    if(Math.abs(y-current.originY)<5&&scrollY.current===current.originScroll){schedule(current.entry);return;}
    if(!target||target===current.entry.plan_date)return;
    try{await planner.move(current.entry,target,current.entry.meal_slot);setMessage(`${current.entry.recipe_title} moved to ${dayLabel(target)}.`);}
    catch(e){setError(e instanceof Error?e.message:'Could not move your meal. Please retry.');}
  }
  useEffect(()=>{
    if(!drag)return;
    const timer=setInterval(()=>{
      const current=dragRef.current;if(!current)return;
      const relative=current.pointerY-frame.current.y;
      const step=relative<60?-12:relative>frame.current.height-60?12:0;
      if(!step)return;
      const next=Math.max(0,Math.min(contentHeight.current-frame.current.height,scrollY.current+step));
      if(next===scrollY.current)return;
      scrollY.current=next;scroll.current?.scrollTo({y:next,animated:false});updateDrag(current.pointerY);
    },50);
    return()=>clearInterval(timer);
  },[!!drag,days]);
  const icon=(name:React.ComponentProps<typeof Ionicons>['name'],label:string,action:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action} style={[s.icon,disabled&&{opacity:0.4}]}><Ionicons name={name} size={22} color={Colors.textPrimary}/></Pressable>;
  const action=(label:string,fn:()=>void,primary=false)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={planner.busy} onPress={fn} style={[s.button,primary&&s.primary,planner.busy&&{opacity:0.5}]}><Text style={primary?s.white:s.text}>{label}</Text></Pressable>;
  const calendar=(selectedDate:string,onSelect:(d:string)=>void)=><View style={{gap:8}}>
    <View style={s.spread}>{icon('chevron-back','Previous month',()=>setCalendarMonth(shiftMonth(calendarMonth,-1)),planner.busy)}<Text style={[s.text,{fontWeight:'700'}]}>{parseDay(calendarMonth).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text>{icon('chevron-forward','Next month',()=>setCalendarMonth(shiftMonth(calendarMonth,1)),planner.busy)}</View>
    <View style={s.calendarRow}>{['M','T','W','T','F','S','S'].map((d,i)=><View key={i} style={[s.cell,{minHeight:24}]}><Text style={s.muted}>{d}</Text></View>)}</View>
    {weeks.map(w=><View key={w[0]} style={s.calendarRow}>{w.map(d=><Pressable key={d} accessibilityRole="button" accessibilityLabel={`Choose ${dayLabel(d)}, ${parseDay(d).getFullYear()}`} accessibilityState={{selected:d===selectedDate}} disabled={planner.busy} onPress={()=>onSelect(d)} style={[s.cell,d===selectedDate&&s.selected]}><Text style={[s.text,d===selectedDate?{color:'#fff',fontWeight:'700'}:d.slice(0,7)!==calendarMonth.slice(0,7)?{color:Colors.textMuted}:null]}>{parseDay(d).getDate()}</Text>{d===today&&<View style={{width:4,height:4,borderRadius:2,backgroundColor:d===selectedDate?'#fff':Colors.accent}}/>}</Pressable>)}</View>)}
  </View>;
  return <SafeAreaView style={s.page} edges={['top']}>
    <View style={s.header}>
      <View style={s.spread}><Text accessibilityRole="header" style={s.title}>Meal planner</Text><View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to today" onPress={()=>{setAnchor(today);scroll.current?.scrollTo({y:0,animated:true});}} style={s.pill}><Text style={[s.muted,{fontWeight:'700'}]}>Today</Text></Pressable>
        {icon('cart-outline','Planner shopping lists',()=>setSheet('shopping'),!userId)}
      </View></View>
      <PlannerScopeControl value={activePlanner} onChange={value=>{cancelDrag();setSheet(null);setError('');setMessage('');planning.setActivePlanner(value);}} disabled={planner.busy||!!drag}/>
      <View style={s.spread}>
        {icon('chevron-back','Previous week',()=>setAnchor(shiftDay(anchor,-7)),planner.busy||!!drag)}
        <Pressable accessibilityRole="button" accessibilityLabel="Choose calendar date" onPress={()=>{setCalendarMonth(anchor);setSheet('calendar');}} style={{flex:1,alignItems:'center',minHeight:48,justifyContent:'center',gap:3}}>
          <View style={s.row}><Text style={[s.text,{fontWeight:'700'}]}>{thisWeek?'Next 7 days':`${parseDay(days[0]).toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${parseDay(days[6]).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`}</Text><Ionicons name="chevron-down" size={14} color={Colors.textSecondary}/></View>
          <Text style={s.muted}>{monthTitle}</Text>
        </Pressable>
        {icon('chevron-forward','Next week',()=>setAnchor(shiftDay(anchor,7)),planner.busy||!!drag)}
      </View>
    </View>
    {!userId?<View style={[s.content,{gap:16}]}><Text style={s.text}>Sign in to plan your meals.</Text>{action('Sign in',()=>router.push('/login'),true)}</View>:<>
      {!!message&&!sheet&&<Text accessibilityLiveRegion="polite" style={[s.muted,s.notice]}>{message}</Text>}
      {!!error&&!sheet&&<Text accessibilityRole="alert" style={[s.error,s.notice]}>{error}</Text>}
      {!!planner.error&&<View style={s.notice}><Text accessibilityRole="alert" style={s.error}>{planner.error}</Text>{action('Retry menu',()=>void planner.reload())}</View>}
      {!!catalogError&&!sheet&&<View style={s.notice}><Text accessibilityRole="alert" style={s.error}>{catalogError}</Text>{action('Retry recipes',()=>void refreshCatalog())}</View>}
      <View ref={viewport} style={{flex:1}} onLayout={()=>viewport.current?.measureInWindow((_x,y,_w,height)=>{frame.current={y,height};})}>
        <ScrollView ref={scroll} scrollEnabled={!drag} scrollEventThrottle={16} onScroll={e=>{scrollY.current=e.nativeEvent.contentOffset.y;}} onContentSizeChange={(_w,h)=>{contentHeight.current=h;}} contentContainerStyle={s.content}>
          {planner.loading||planning.loading?<ActivityIndicator accessibilityLabel="Loading weekly menu" style={{margin:24}}/>:days.map(d=>{
            const entries=planner.entries.filter(e=>e.plan_date===d).sort((a,b)=>Object.keys(PLAN_SLOTS).indexOf(a.meal_slot)-Object.keys(PLAN_SLOTS).indexOf(b.meal_slot));
            const isToday=d===today, isDragging=drag?.entry.plan_date===d;
            return <View key={d} testID={`planner-day-${d}`} onLayout={e=>{dayLayouts.current[d]=e.nativeEvent.layout;}} style={[s.day,isDragging&&{zIndex:5},drag?.target===d&&{backgroundColor:Colors.surface,borderColor:Colors.accent}]}>
              <View style={s.spread}><View style={s.row}><View style={s.date}><Text style={s.weekday}>{parseDay(d).toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</Text><Text style={[s.dateNumber,isToday&&{color:Colors.accent}]}>{parseDay(d).getDate()}</Text></View><Text style={[s.dayTitle,d<today&&{color:Colors.textSecondary}]}>{isToday?'Today':d===shiftDay(today,1)?'Tomorrow':d===shiftDay(today,-1)?'Yesterday':parseDay(d).toLocaleDateString(undefined,{weekday:'long'})}</Text></View>{icon('add',`Add recipe to ${dayLabel(d)}`,()=>chooseDay(d),planner.busy||!!drag)}</View>
              {entries.length===0&&isToday&&<Text style={s.empty}>What sounds good today?</Text>}
              {entries.map(entry=><View key={entry.id} style={[s.card,drag?.entry.id===entry.id&&{transform:[{translateY:drag.offset}],zIndex:10,elevation:8,opacity:0.9,borderColor:Colors.accent}]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${entry.recipe_title}`} onPress={()=>editEntry(entry)} disabled={planner.busy||!!drag} style={s.cardMain}>
                  <RecipeImage url={byId.get(entry.recipe_id)?.image_url} style={s.thumb} iconSize={24} accessibilityLabel={entry.recipe_title}/>
                  <View style={{flex:1,minWidth:0,gap:4}}><Text numberOfLines={2} style={s.cardTitle}>{entry.recipe_title}</Text><Text style={s.muted}>{PLAN_SLOTS[entry.meal_slot]}</Text></View>
                  <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted}/>
                </Pressable>
                <DragHandle label={`Move ${entry.recipe_title}`} color={Colors.textMuted} disabled={planner.busy} start={y=>startDrag(entry,y)} move={updateDrag} end={y=>void endDrag(y)} cancel={cancelDrag} onAccessibleMove={()=>schedule(entry)}/>
              </View>)}
            </View>;
          })}
        </ScrollView>
      </View>
    </>}
    <Modal visible={sheet!==null} transparent animationType="slide" onRequestClose={close}>
      <View style={s.backdrop}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss planner dialog" onPress={close} style={StyleSheet.absoluteFill}/><SafeAreaView edges={['bottom']} style={s.sheet}>
        <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
          <View style={s.spread}><Text accessibilityRole="header" style={s.sheetTitle}>{sheet==='calendar'?'Choose a date':sheet==='recipes'?'Add a meal':sheet==='schedule'?(moving?'Move meal':'Plan this meal'):sheet==='shopping'?'Shopping lists':'Meal options'}</Text>{icon('close','Close planner dialog',close,planner.busy)}</View>
          {sheet==='calendar'&&<>{calendar(anchor,d=>{setAnchor(d);setSheet(null);})}{action('Back to today',()=>{setAnchor(today);setSheet(null);})}</>}
          {sheet==='recipes'&&<>
            <Text style={s.muted}>Cooking for: {cooking.label}</Text>
            {!!cooking.message&&<Text accessibilityRole="alert" style={s.muted}>{cooking.message}</Text>}
            <Text style={s.muted}>{dayLabel(date)}</Text><TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="Find a recipe" placeholderTextColor={Colors.textMuted} accessibilityLabel="Search planner recipes"/>
            {catalogLoading?<ActivityIndicator accessibilityLabel="Loading recipes"/>:results.slice(0,50).map(r=><Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Plan ${r.title}`} onPress={()=>{setCandidate(r);setCalendarMonth(date);setSheet('schedule');}} style={s.cardMain}><RecipeImage url={r.image_url} style={s.thumb} iconSize={24}/><View style={{flex:1,minWidth:0,gap:4}}><Text style={s.cardTitle}>{r.title}</Text><Text style={s.muted}>{r.prep_time_mins} min</Text></View><Ionicons name="add" size={20} color={Colors.accent}/></Pressable>)}
            {!catalogLoading&&!results.length&&!catalogError&&<Text style={s.muted}>No matches. Try another search.</Text>}
            {!catalogLoading&&results.length>50&&<Text style={s.muted}>Search to find more recipes.</Text>}
            {!!catalogError&&<><Text accessibilityRole="alert" style={s.error}>{catalogError}</Text>{action('Retry recipe list',()=>void refreshCatalog())}</>}
          </>}
          {sheet==='schedule'&&candidate&&<>
            <View style={s.row}><RecipeImage url={byId.get(candidate.id)?.image_url} style={s.thumb} iconSize={24}/><Text style={[s.cardTitle,{flex:1}]}>{candidate.title}</Text></View>
            {!moving&&<PlannerScopeControl label="Save to" value={saveScope} onChange={setSaveScope} disabled={planner.busy}/>}
            <Text style={s.muted}>{saveScope==='household'?'Shared with household members who use planning.':'Only you can see this meal.'}</Text>
            {calendar(date,setDate)}<Text style={[s.text,{fontWeight:'700'}]}>Meal</Text><View style={s.chipRow}>{(Object.keys(PLAN_SLOTS) as PlanSlot[]).map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={PLAN_SLOTS[k]} accessibilityState={{selected:k===slot}} disabled={planner.busy} onPress={()=>setSlot(k)} style={[s.chip,k===slot&&s.selected]}><Text style={[s.muted,k===slot&&{color:'#fff',fontWeight:'700'}]}>{PLAN_SLOTS[k]}</Text></Pressable>)}</View>
            {action(planner.busy?'Saving…':moving?'Move meal':'Save meal',()=>void save(),true)}
          </>}
          {sheet==='actions'&&selected&&<>
            <View style={s.row}><RecipeImage url={byId.get(selected.recipe_id)?.image_url} style={s.thumb} iconSize={24}/><View style={{flex:1,gap:4}}><Text style={s.cardTitle}>{selected.recipe_title}</Text><Text style={s.muted}>{dayLabel(selected.plan_date)} · {PLAN_SLOTS[selected.meal_slot]}</Text></View></View>
            {action('View recipe',()=>{setSheet(null);router.push(`/recipe/${selected.recipe_id}`);})}
            {action('Move or change meal',()=>schedule(selected))}
            {action('Groceries for this day',()=>groceries('day',selected.plan_date))}
            {action(dislikes.ids.has(selected.recipe_id)?'Restore recipe to ideas':'Dislike recipe',()=>{void dislikes.setDisliked({id:selected.recipe_id,title:selected.recipe_title},!dislikes.ids.has(selected.recipe_id));close();})}
            {action('Remove from plan',()=>void remove())}
          </>}
          {sheet==='shopping'&&<>{action('Today’s groceries',()=>groceries('day',today))}{action(thisWeek?'These 7 days':'Selected week’s groceries',()=>groceries('week'))}{action('Entire grocery list',()=>groceries('all'))}</>}
          {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
      </SafeAreaView></View>
    </Modal>
  </SafeAreaView>;
}
