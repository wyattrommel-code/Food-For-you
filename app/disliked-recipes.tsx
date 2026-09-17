import React,{useMemo} from 'react';
import {ActivityIndicator,FlatList,Pressable,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useRecipeCatalog} from '@/context/RecipeCatalogContext';
import {useRecipeDislikes} from '@/context/RecipeDislikesContext';
import {usePreferenceState} from '@/context/PreferencesContext';
import {useTheme} from '@/context/ThemeContext';
import {RecipeImage} from '@/components/RecipeImage';

export default function DislikedRecipes(){
  const {Colors}=useTheme(),router=useRouter(),catalog=useRecipeCatalog(),{ids,ready,setDisliked}=useRecipeDislikes();
  const {syncError,refresh}=usePreferenceState();
  const rows=useMemo(()=>{const byId=new Map(catalog.rows.map(r=>[r.id,r]));return [...ids].map(id=>byId.get(id)??{id,title:'Recipe no longer available',image_url:''}).sort((a,b)=>a.title.localeCompare(b.title));},[ids,catalog.rows]);
  return <SafeAreaView edges={['top','bottom','left','right']} style={{flex:1,backgroundColor:Colors.background}}><View style={{flex:1,width:'100%',maxWidth:720,alignSelf:'center'}}>
    <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:8}}><Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={()=>router.back()} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color={Colors.textPrimary}/></Pressable><Text accessibilityRole="header" style={{fontSize:23,fontWeight:'800',color:Colors.textPrimary,flex:1}}>Disliked recipes</Text></View>
    <Text style={{paddingHorizontal:20,paddingBottom:16,color:Colors.textSecondary}}>Hidden from your ideas, just for you. Restore any recipe to see it again. Existing planned meals stay in place.</Text>
    {!!syncError&&<Pressable accessibilityRole="button" accessibilityLabel="Retry syncing disliked recipes" onPress={()=>void refresh()} style={{padding:20,minHeight:44}}><Text style={{color:Colors.accent}}>{syncError} Tap to retry.</Text></Pressable>}
    {!!catalog.error&&<Pressable accessibilityRole="button" onPress={()=>void catalog.refresh()} style={{padding:20,minHeight:44}}><Text style={{color:Colors.accent}}>Could not refresh recipe names and photos. Tap to retry.</Text></Pressable>}
    {!ready||catalog.loading?<ActivityIndicator accessibilityLabel="Loading disliked recipes"/>:<FlatList data={rows} keyExtractor={r=>r.id} contentContainerStyle={{padding:20,paddingBottom:130,gap:10}} initialNumToRender={10}
      ListEmptyComponent={<Text style={{color:Colors.textSecondary}}>No disliked recipes. Use the thumbs-down button on a recipe to hide it here.</Text>}
      renderItem={({item})=><View style={{flexDirection:'row',alignItems:'center',gap:12,padding:10,borderWidth:1,borderColor:Colors.border,borderRadius:16,backgroundColor:Colors.surface,minHeight:82}}>
        <RecipeImage url={item.image_url} accessibilityLabel={item.title} style={{width:58,height:58,borderRadius:11}} iconSize={24}/><Text numberOfLines={2} style={{flex:1,minWidth:0,color:Colors.textPrimary,fontWeight:'700',fontSize:15}}>{item.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Restore ${item.title}`} onPress={()=>void setDisliked(item,false)} style={{minHeight:44,padding:10,justifyContent:'center'}}><Text style={{color:Colors.accent,fontWeight:'700'}}>Restore</Text></Pressable>
      </View>}/>}</View></SafeAreaView>;
}
