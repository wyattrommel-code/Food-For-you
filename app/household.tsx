import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Alert,Share,ActivityIndicator,KeyboardAvoidingView,Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '@/context/ThemeContext';
import {useHousehold} from '@/context/HouseholdContext';
import {useSession} from '@/hooks/useSession';
import {useGroceryList} from '@/hooks/useGroceryList';

export default function HouseholdScreen(){
 const {Colors}=useTheme(),router=useRouter(),{userId}=useSession();const {household,loading,error,refresh,action}=useHousehold();const {pending}=useGroceryList();
 const [mode,setMode]=useState<'create'|'join'>('create'),[name,setName]=useState('Our household'),[displayName,setDisplayName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[invite,setInvite]=useState<{code:string;expiresAt:string}|null>(null);
 useEffect(()=>{if(!household?.inviteExpiresAt)setInvite(null);},[household?.inviteExpiresAt]);
 const button=(title:string,onPress:()=>void,secondary=false)=> <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={{minHeight:48,padding:14,borderRadius:12,marginTop:10,backgroundColor:secondary?Colors.surfaceElevated:Colors.accent,borderWidth:secondary?1:0,borderColor:Colors.border,justifyContent:'center'}}><Text style={{textAlign:'center',fontWeight:'700',color:secondary?Colors.textPrimary:'#fff'}}>{title}</Text></Pressable>;
 const input=(label:string,value:string,setValue:(s:string)=>void,placeholder:string,maxLength:number)=> <View style={{marginTop:16}}><Text style={{color:Colors.textPrimary,fontWeight:'600',marginBottom:8}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={Colors.textMuted} maxLength={maxLength} autoCorrect={false} autoCapitalize={label==='Invitation code'?'characters':'words'} style={{color:Colors.textPrimary,borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:14,minHeight:48}} /></View>;
 async function run(kind:string,data:Record<string,string>={}){setBusy(true);try{const result=await action(kind,data);if(result.invite)setInvite(result.invite);else if(kind==='revoke'||kind==='remove')setInvite(null);}catch(e){Alert.alert('Household',e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 const confirmLeave=()=>{if(pending.length){Alert.alert('Changes are waiting to sync','Reconnect and sync your grocery changes before leaving the household.');return;}Alert.alert('Leave household?',household?.ownerId===userId?'The next member will become the owner. If you are the last member, the household and shared list will be deleted.':'You will lose access to this shared list. Your personal list stays on this phone.',[{text:'Cancel',style:'cancel'},{text:'Leave',style:'destructive',onPress:()=>void run('leave')}]);};
 const owner=household?.ownerId===userId;
 return <SafeAreaView edges={['top','bottom','left','right']} style={{flex:1,backgroundColor:Colors.background}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><View style={{flexDirection:'row',alignItems:'center',padding:12,gap:8}}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>router.back()} style={{padding:12}}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary}/></Pressable><Text style={{fontSize:24,fontWeight:'800',color:Colors.textPrimary,flex:1}}>Household</Text></View>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,paddingTop:4,gap:12,width:'100%',maxWidth:600,alignSelf:'center'}}>
 <Text style={{fontSize:16,lineHeight:24,color:Colors.textSecondary}}>One grocery list, separate logins. Add what you need at home and check it off together at the store. Your food preferences stay yours.</Text>
 {error&&<View><Text accessibilityRole="alert" style={{color:Colors.textSecondary}}>{error}</Text>{button('Retry',()=>void refresh(),true)}</View>}
 {loading?<ActivityIndicator color={Colors.accent}/>:household?<>
  <Text style={{fontSize:24,fontWeight:'800',color:Colors.textPrimary}}>{household.name}</Text>
  <Text style={{color:Colors.textSecondary}}>The Grocery tab now uses this shared list. {household.members.length} of 8 members.</Text>
  {household.members.map(m=><View key={m.userId} style={{borderBottomWidth:1,borderColor:Colors.border,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{fontWeight:'700',color:Colors.textPrimary}}>{m.name}{m.userId===userId?' (you)':''}</Text><Text style={{color:Colors.textSecondary}}>{m.isOwner?'Owner':'Member'}</Text></View>{owner&&m.userId!==userId&&<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+m.name} disabled={busy} onPress={()=>Alert.alert('Remove '+m.name+'?','They will lose access to the shared grocery list.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void run('remove',{userId:m.userId})}])} style={{padding:12}}><Text style={{color:Colors.accent}}>Remove</Text></Pressable>}</View>)}
  {owner&&<>
   {button(invite||household.inviteExpiresAt?'Create a new invitation':'Invite someone',()=>void run('invite'))}
   <Text style={{color:Colors.textSecondary}}>One person can use each code within 24 hours. Creating another code replaces the previous invitation.</Text>
   {invite&&<View style={{padding:16,borderRadius:12,backgroundColor:Colors.surfaceElevated}}><Text selectable style={{fontWeight:'700',fontSize:18,color:Colors.textPrimary,letterSpacing:1}}>{invite.code.match(/.{1,8}/g)?.join('-')}</Text><Text style={{color:Colors.textSecondary,marginTop:8}}>Expires {new Date(invite.expiresAt).toLocaleString()}</Text>{button('Share invitation',()=>void Share.share({message:'Join my Mealsolved household: '+invite.code.match(/.{1,8}/g)?.join('-')+'. In Mealsolved, open Settings → Household → Join household. Sign in with your own account. This code works once and expires in 24 hours.'}).catch(()=>Alert.alert('Share invitation','You can select and copy the code above.')),true)}</View>}
   {(invite||household.inviteExpiresAt)&&button('Cancel invitation',()=>void run('revoke'),true)}
  </>}
  {button('Open shared groceries',()=>router.push('/(tabs)/grocery'),true)}
  {button('Leave household',confirmLeave,true)}
 </>:<>
  <View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}>{button('Create household',()=>setMode('create'),mode!=='create')}</View><View style={{flex:1}}>{button('Join household',()=>setMode('join'),mode!=='join')}</View></View>
  {input('Your name in this household',displayName,setDisplayName,'First name or nickname',60)}
  {mode==='create'?input('Household name',name,setName,'Our household',60):input('Invitation code',code,setCode,'Paste the code you received',64)}
  <Text style={{color:Colors.textSecondary}}>Your existing items stay personal. After connecting, you can choose to copy them into the shared list.</Text>
  {button(busy?'Connecting…':mode==='create'?'Create shared list':'Join shared list',()=>{if(!displayName.trim()||(mode==='create'?!name.trim():!code.trim())){Alert.alert('Almost there','Fill in your name and '+(mode==='create'?'household name.':'invitation code.'));return;}void run(mode,mode==='create'?{name:name.trim(),displayName:displayName.trim()}:{code,displayName:displayName.trim()});})}
 </>}
 {busy&&<ActivityIndicator color={Colors.accent}/>}
 </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
