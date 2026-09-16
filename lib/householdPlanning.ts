import type {DbRecipe, UserPreferences} from './types';
import {isRecipeBanned, recipeAffinityScore} from './types';
import {discoveryBonus} from './discovery';
import {normalizePreferences} from './preferences';

export type PlannerScope = 'personal'|'household';
export type PlanningSettings = {enabled:boolean; defaultPlanner:PlannerScope; sharePreferences:boolean};
export type CookingMember = {userId:string; name:string; planningEnabled:boolean; sharingPreferences:boolean; preferences:UserPreferences|null};
export type PlanningState = {householdId:string|null; settings:PlanningSettings; members:CookingMember[]};
export const PERSONAL_PLANNING:PlanningSettings = {enabled:false,defaultPlanner:'personal',sharePreferences:false};
export type CookingSelection = {mode:'personal'|'household'|'selected'; memberIds:string[]};

/** Missing consent or a failed refresh never silently becomes an unrestricted profile. */
export function cookingAudience(selection:CookingSelection, members:CookingMember[], userId:string|null, own:UserPreferences) {
  if(selection.mode==='personal')return {profiles:[own],ids:userId?[userId]:[],missing:[] as string[]};
  const ids=selection.mode==='household'?members.map(m=>m.userId):[...new Set(selection.memberIds)];
  const profiles:UserPreferences[]=[],missing:string[]=[];
  for(const id of ids){
    const member=members.find(m=>m.userId===id);
    if(!member){missing.push('A selected member');continue;}
    if(id===userId)profiles.push(own);
    else if(member.sharingPreferences&&member.preferences)profiles.push(normalizePreferences(member.preferences));
    else missing.push(member.name);
  }
  return {profiles,ids,missing};
}

export function matchesAudience(recipe:DbRecipe, profiles:readonly UserPreferences[]) {
  return profiles.length>0&&profiles.every(p=>!isRecipeBanned(recipe,p));
}
/** Each diner has equal influence; one person's favorites don't dominate a shared meal. */
export function audienceScore(recipe:DbRecipe, profiles:readonly UserPreferences[]) {
  if(!profiles.length)return 0;
  return profiles.reduce((sum,p)=>sum+Math.min(12,recipeAffinityScore(recipe,p,[])+discoveryBonus(recipe,p)),0)/profiles.length;
}

export function plannerDestination(userId:string|null, scope:PlannerScope, householdId:string|null) {
  if(scope==='household')return {table:'household_meal_plans',purchases:'household_meal_plan_purchases',column:'household_id',id:householdId,key:`household:${householdId??'unavailable'}`};
  return {table:'meal_plans',purchases:'meal_plan_purchases',column:'user_id',id:userId,key:`personal:${userId??'guest'}`};
}
