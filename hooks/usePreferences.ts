import {useMemo} from 'react';
import {usePreferenceState} from '@/context/PreferencesContext';
import type {UserPreferences} from '@/lib/types';

/** One account-scoped store is shared by onboarding, Settings and recipe discovery. */
export function usePreferences(_userId:string|null) {
  const state=usePreferenceState();
  const {preferences,updatePreferences}=state;
  const mutators=useMemo(()=>{
    const add=(key:'disliked_ingredients'|'disliked_cuisines'|'liked_ingredients'|'liked_cuisines',value:string)=>{
      const word=value.trim().toLowerCase();if(!word)return;
      return updatePreferences(current=>({[key]:[...new Set([...current[key],word])]} as Partial<UserPreferences>));
    };
    const remove=(key:'disliked_ingredients'|'disliked_cuisines'|'liked_ingredients'|'liked_cuisines',value:string)=>updatePreferences(current=>({[key]:current[key].filter(x=>x!==value)}));
    return {
      addDislikedIngredient:(v:string)=>add('disliked_ingredients',v),removeDislikedIngredient:(v:string)=>remove('disliked_ingredients',v),
      addDislikedCuisine:(v:string)=>add('disliked_cuisines',v),removeDislikedCuisine:(v:string)=>remove('disliked_cuisines',v),
      addLikedIngredient:(v:string)=>add('liked_ingredients',v),removeLikedIngredient:(v:string)=>remove('liked_ingredients',v),
      addLikedCuisine:(v:string)=>add('liked_cuisines',v),removeLikedCuisine:(v:string)=>remove('liked_cuisines',v),
    };
  },[preferences,updatePreferences]);
  return {...state,...mutators};
}
