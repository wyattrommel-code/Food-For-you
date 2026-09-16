import {dateKey,parseDay,shiftDay,weekDays,upcomingDays, type PlanEntry} from './planner';
export type ShoppingScope = 'day'|'week'|'all';
export interface PlannedRecipe extends PlanEntry { recipes: {title:string;ingredients_list:string[];shopping_list:string[]|null}|null }
export interface Purchase {plan_id:string;ingredient_key:string;checked:boolean}
export interface PlannedItem {id:string;name:string;count:number;checked:boolean;references:Purchase[];sources:string[]}
export function monthBounds(day:string){const d=parseDay(day);return {start:dateKey(new Date(d.getFullYear(),d.getMonth(),1,12)),end:dateKey(new Date(d.getFullYear(),d.getMonth()+1,0,12))};}
export function shiftMonth(day:string,amount:number){const d=parseDay(day);return dateKey(new Date(d.getFullYear(),d.getMonth()+amount,1,12));}
export function monthWeeks(day:string){const {start,end}=monthBounds(day);const weeks:string[][]=[];for(let cursor=weekDays(start)[0];cursor<=end;cursor=shiftDay(cursor,7))weeks.push(weekDays(cursor));return weeks;}
export function inShoppingScope(date:string,scope:ShoppingScope,day:string,today:string,rolling=false){if(scope==='all')return date>=today;if(scope==='day')return date===day;const week=rolling?upcomingDays(day):weekDays(day);return date>=week[0]&&date<=week[6];}
export const ingredientKey=(line:string)=>line.trim().toLowerCase().replace(/\s+/g,' ');
export const purchaseKey=(p:Pick<Purchase,'plan_id'|'ingredient_key'>)=>JSON.stringify([p.plan_id,p.ingredient_key]);
// Combine only identical measured lines. Never invent conversions for cans, cups or ambiguous units.
export function plannedShopping(plans:PlannedRecipe[],checks:Purchase[],scope:ShoppingScope,day:string,today:string,rolling=false):PlannedItem[]{
 const purchased=new Map(checks.map(c=>[purchaseKey(c),c.checked]));const items=new Map<string,PlannedItem>();
 for(const plan of plans.filter(p=>inShoppingScope(p.plan_date,scope,day,today,rolling))){
  if(!plan.recipes)continue;const lines=plan.recipes.shopping_list?.length?plan.recipes.shopping_list:plan.recipes.ingredients_list;
  for(const line of [...new Set(lines.map(s=>s.trim()).filter(Boolean))]){
   const id=ingredientKey(line);if(/^(?:[\d./ ]+\s+)?(?:cups?\s+)?(?:cold |hot |warm )?water$/i.test(line))continue;
   const ref={plan_id:plan.id,ingredient_key:id,checked:false};ref.checked=purchased.get(purchaseKey(ref))??false;
   const item=items.get(id)??{id,name:line,count:0,checked:true,references:[],sources:[]};
   // The same recipe on another day is another purchase requirement.
   if(item.references.some(r=>purchaseKey(r)===purchaseKey(ref)))continue;
   item.count++;item.checked&&=ref.checked;item.references.push(ref);item.sources.push(`${plan.plan_date} · ${plan.recipe_title}`);items.set(id,item);
  }
 }
 return [...items.values()].sort((a,b)=>Number(a.checked)-Number(b.checked)||a.name.localeCompare(b.name));
}
