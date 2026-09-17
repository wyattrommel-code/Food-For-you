import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePreferenceState} from './PreferencesContext';

type RecipeRef={id:string;title:string};
type Value={ids:Set<string>;ready:boolean;setDisliked:(recipe:RecipeRef,hidden:boolean)=>Promise<void>};
const Context=createContext<Value|null>(null);
export function RecipeDislikesProvider({children}:{children:React.ReactNode}){
  const {preferences,loading,updatePreferences}=usePreferenceState(),insets=useSafeAreaInsets();
  const ids=useMemo(()=>new Set(preferences.disliked_recipe_ids??[]),[preferences.disliked_recipe_ids]);
  const [notice,setNotice]=useState<{recipe:RecipeRef;hidden:boolean;failed?:boolean}|null>(null);
  const revision=useRef(0);
  const setDisliked=useCallback(async(recipe:RecipeRef,hidden:boolean)=>{
    const ticket=++revision.current;setNotice({recipe,hidden});
    const saved=await updatePreferences(current=>({disliked_recipe_ids:hidden
      ?[...new Set([...(current.disliked_recipe_ids??[]),recipe.id])]
      :(current.disliked_recipe_ids??[]).filter(id=>id!==recipe.id)}));
    if(!saved&&ticket===revision.current)setNotice({recipe,hidden,failed:true});
  },[updatePreferences]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),8000);return()=>clearTimeout(timer);},[notice]);
  return <Context.Provider value={{ids,ready:!loading,setDisliked}}>{children}
    {notice&&<View accessibilityLiveRegion="polite" style={{position:'absolute',bottom:82+insets.bottom,left:16,right:16,maxWidth:650,alignSelf:'center',backgroundColor:'#242424',borderRadius:14,padding:12,flexDirection:'row',alignItems:'center',gap:10,zIndex:100,elevation:10}}>
      <Text style={{color:'#fff',flex:1,fontSize:13}}>{notice.failed?'Could not save. Please try again.':notice.hidden?'Recipe disliked. Restore it anytime in Settings.':'Recipe restored to your ideas.'}</Text>
      {!notice.failed&&<Pressable accessibilityRole="button" accessibilityLabel="Undo recipe dislike change" onPress={()=>void setDisliked(notice.recipe,!notice.hidden)} style={{minHeight:44,padding:8,justifyContent:'center'}}><Text style={{color:'#fff',fontWeight:'800'}}>Undo</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss recipe message" onPress={()=>setNotice(null)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontSize:22}}>×</Text></Pressable>
    </View>}
  </Context.Provider>;
}
export function useRecipeDislikes(){const value=useContext(Context);if(!value)throw Error('RecipeDislikesProvider required');return value;}
