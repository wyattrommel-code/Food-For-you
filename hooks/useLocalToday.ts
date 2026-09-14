import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {dateKey} from '@/lib/planner';
export function useLocalToday(){
 const [today,setToday]=useState(()=>dateKey(new Date()));
 useEffect(()=>{const update=()=>setToday(dateKey(new Date()));const timer=setInterval(update,30000);const sub=AppState.addEventListener('change',state=>{if(state==='active')update();});return()=>{clearInterval(timer);sub.remove();};},[]);
 return today;
}
