import type { UserPreferences } from './types';
import { MEAL_STYLES } from './discovery';
export const DEFAULT_PREFERENCES: UserPreferences = {
  disliked_ingredients: [], disliked_cuisines: [], liked_ingredients: [], liked_cuisines: [],
  diet_style: 'any', preferred_meal_styles: [], max_cook_time_mins: null,
  prefer_easy: false, household_size: null, onboarding_completed_at: null,
};
const words = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((v): v is string=>typeof v==='string').map(v=>v.trim().toLowerCase()).filter(Boolean))].slice(0,150) : [];
export function normalizePreferences(raw: Partial<UserPreferences> | null | undefined): UserPreferences {
  const p=raw ?? {};
  return {
    disliked_ingredients: words(p.disliked_ingredients), disliked_cuisines: words(p.disliked_cuisines),
    liked_ingredients: words(p.liked_ingredients), liked_cuisines: words(p.liked_cuisines),
    diet_style: ['vegetarian','vegan'].includes(p.diet_style ?? '') ? p.diet_style! : 'any',
    preferred_meal_styles: words(p.preferred_meal_styles).filter(v=>MEAL_STYLES.some(s=>s.value===v)),
    max_cook_time_mins: [15,30,45,60].includes(p.max_cook_time_mins ?? 0) ? p.max_cook_time_mins! : null,
    prefer_easy: p.prefer_easy===true,
    household_size: Number.isInteger(p.household_size) && p.household_size!>=1 && p.household_size!<=6 ? p.household_size! : null,
    onboarding_completed_at: typeof p.onboarding_completed_at==='string' && Number.isFinite(Date.parse(p.onboarding_completed_at)) ? p.onboarding_completed_at : null,
  };
}
export function readPreferenceCache(raw: string | null): { preferences: UserPreferences; pending: boolean } {
  try {const data=raw?JSON.parse(raw):null;return {preferences:normalizePreferences(data?.preferences ?? data),pending:data?.pending===true};}
  catch {return {preferences:normalizePreferences(null),pending:false};}
}
export function preferenceSummary(p: UserPreferences): string {
  return [p.diet_style && p.diet_style!=='any'?p.diet_style:null,
    p.preferred_meal_styles?.length?`${p.preferred_meal_styles.length} meal styles`:null,
    p.max_cook_time_mins?`usually ${p.max_cook_time_mins} min`:null,
    p.household_size?`cooking for ${p.household_size}`:null,
    p.disliked_ingredients.length?`${p.disliked_ingredients.length} foods avoided`:null,
  ].filter(Boolean).join(' · ') || 'An open mix of meals';
}
