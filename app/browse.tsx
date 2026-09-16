import React,{useMemo} from 'react';
import {View,Text,FlatList,Pressable,ActivityIndicator,RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '@/context/ThemeContext';
import {useSession} from '@/hooks/useSession';
import {usePreferences} from '@/hooks/usePreferences';
import {useRecipes} from '@/hooks/useRecipes';
import {RecipeImage} from '@/components/RecipeImage';
import {QuickPlanButton} from '@/components/QuickPlanButton';
import {useCooking} from '@/context/CookingContext';
import {CookingForControl} from '@/components/CookingForControl';
import {difficultyLabel,type MealTime} from '@/lib/types';

export default function BrowseScreen(){
  const {Colors}=useTheme(),router=useRouter();
  const {category:rawCategory,title:rawTitle}=useLocalSearchParams<{category?:string;title?:string}>();
  const category=(Array.isArray(rawCategory)?rawCategory[0]:rawCategory) as MealTime;
  const title=(Array.isArray(rawTitle)?rawTitle[0]:rawTitle)||'Browse';
  const {userId}=useSession(),{preferences}=usePreferences(userId),cooking=useCooking();
  const {visibleRecipes,loading,refreshing,error,refresh,toggleFavorite}=useRecipes(userId,preferences,cooking,category==='smoothie');
  const recipes=useMemo(()=>visibleRecipes.filter(r=>r.meal_time.includes(category)||(category==='smoothie'&&r.tags.includes('smoothies-and-shakes'))).sort((a,b)=>a.title.localeCompare(b.title)),[visibleRecipes,category]);
  const muted={color:Colors.textSecondary,fontSize:13} as const;
  return <SafeAreaView edges={['top','bottom','left','right']} style={{flex:1,backgroundColor:Colors.background}}>
    <View style={{width:'100%',maxWidth:720,alignSelf:'center',flex:1}}>
      <View style={{padding:12,flexDirection:'row',alignItems:'center',gap:8}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>router.back()} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color={Colors.textPrimary}/></Pressable>
        <Text accessibilityRole="header" style={{flex:1,fontSize:22,fontWeight:'800',color:Colors.textPrimary}}>{title}</Text>
      </View>
      <View style={{paddingHorizontal:20,paddingBottom:12,gap:8}}><CookingForControl/>{!!cooking.message&&<Text accessibilityRole="alert" style={muted}>{cooking.message}</Text>}</View>
      {category==='smoothie'&&<Pressable accessibilityRole="button" accessibilityLabel="Add a smoothie or shake" onPress={()=>router.push('/(tabs)/create?category=smoothie' as never)} style={{minHeight:48,paddingHorizontal:20,justifyContent:'center'}}><Text style={{color:Colors.accent,fontWeight:'700'}}>+ Add a smoothie or shake</Text></Pressable>}
      {!!error&&<View style={{padding:20}}><Text accessibilityRole="alert" style={muted}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>void refresh()} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:Colors.accent}}>Retry recipes</Text></Pressable></View>}
      {loading?<ActivityIndicator accessibilityLabel="Loading recipes" color={Colors.accent}/>:<FlatList
        data={recipes} keyExtractor={item=>item.id} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={7}
        contentContainerStyle={{paddingHorizontal:20,paddingBottom:24,gap:10}} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh()}/>}
        ListHeaderComponent={<Text style={{...muted,paddingBottom:4}}>{recipes.length} recipe{recipes.length===1?'':'s'}</Text>}
        ListEmptyComponent={<Text style={{...muted,paddingVertical:24}}>{category==='smoothie'?'No matching smoothies or shakes yet. You can add your own above.':'No recipes match these preferences yet.'}</Text>}
        renderItem={({item})=><View testID="category-recipe-row" style={{flexDirection:'row',alignItems:'center',minHeight:82,borderRadius:16,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface,paddingRight:10}}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={()=>router.push(`/recipe/${item.id}`)} style={{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',padding:10,gap:12}}>
            <RecipeImage url={item.image_url} accessibilityLabel={item.title} style={{width:58,height:58,borderRadius:11}} iconSize={24}/>
            <View style={{flex:1,minWidth:0,gap:4}}><Text numberOfLines={2} style={{fontSize:15,lineHeight:20,fontWeight:'700',color:Colors.textPrimary}}>{item.title}</Text><Text style={muted}>{item.prep_time_mins} min · {difficultyLabel(item.effort_score)}</Text></View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.is_favorited?'Unsave':'Save'} ${item.title}`} onPress={()=>void toggleFavorite(item.id)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name={item.is_favorited?'heart':'heart-outline'} size={21} color={item.is_favorited?Colors.accent:Colors.textSecondary}/></Pressable>
          <QuickPlanButton recipe={item}/>
        </View>}
      />}
    </View>
  </SafeAreaView>;
}
