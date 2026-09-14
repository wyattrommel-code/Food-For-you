import React from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '@/context/ThemeContext';
export default function MoreScreen(){const router=useRouter(),{Colors}=useTheme();return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:Colors.background}}><ScrollView contentContainerStyle={{padding:20,gap:16}}><Text style={{fontSize:28,fontWeight:'800',color:Colors.textPrimary}}>More</Text>{[
 {label:'Saved recipes',path:'/(tabs)/favorites',icon:'heart-outline'},
 {label:'Create a recipe',path:'/(tabs)/create',icon:'add-circle-outline'},
 {label:'Settings',path:'/(tabs)/settings',icon:'settings-outline'},
 {label:'Household',path:'/household',icon:'people-outline'},
].map(item=><Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.label} onPress={()=>router.push(item.path as never)} style={{minHeight:64,padding:18,borderRadius:16,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface,flexDirection:'row',gap:14,alignItems:'center'}}><Ionicons name={item.icon as any} size={24} color={Colors.accent}/><Text style={{fontSize:18,color:Colors.textPrimary,flex:1}}>{item.label}</Text><Text style={{color:Colors.textSecondary}}>›</Text></Pressable>)}</ScrollView></SafeAreaView>;}
