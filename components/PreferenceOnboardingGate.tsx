import {useEffect} from 'react';
import {useRouter,useSegments} from 'expo-router';
import {usePreferenceState} from '@/context/PreferencesContext';
export function PreferenceOnboardingGate() {
  const {userId,loading,preferences}=usePreferenceState(),segments=useSegments(),router=useRouter();
  useEffect(()=>{if(userId&&!loading&&segments[0]==='(tabs)'&&!preferences.onboarding_completed_at)router.replace('/onboarding');},[userId,loading,preferences.onboarding_completed_at,segments,router]);
  return null;
}
