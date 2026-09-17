import React from 'react';
import {Pressable,Text} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRecipeDislikes} from '@/context/RecipeDislikesContext';
import {useTheme} from '@/context/ThemeContext';

export function RecipeDislikeButton({recipe,overlay=false,label=false}:{recipe:{id:string;title:string};overlay?:boolean;label?:boolean}){
  const {ids,ready,setDisliked}=useRecipeDislikes(),{Colors}=useTheme(),hidden=ids.has(recipe.id);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${hidden?'Restore':'Dislike'} ${recipe.title}`} accessibilityHint={hidden?'Show this recipe in your ideas again.':'Hide from your ideas. You can undo this in Settings.'} accessibilityState={{selected:hidden,disabled:!ready}} disabled={!ready}
    onPress={event=>{event.stopPropagation();void setDisliked(recipe,!hidden);}}
    style={{...(overlay?{position:'absolute' as const,top:54,right:8,backgroundColor:'rgba(0,0,0,0.65)'}:{}),minWidth:44,minHeight:44,paddingHorizontal:8,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}}>
    <Ionicons name={hidden?'thumbs-down':'thumbs-down-outline'} size={20} color={overlay?'#fff':hidden?Colors.accent:Colors.textSecondary}/>
    {label&&<Text style={{color:Colors.textSecondary,fontSize:14}}>{hidden?'Restore recipe':'Dislike'}</Text>}
  </Pressable>;
}
