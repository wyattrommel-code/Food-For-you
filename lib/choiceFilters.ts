import type {MealTime,Recipe} from './types';

export const MEAL_FILTERS: {value:MealTime;label:string}[] = [
  {value:'breakfast',label:'Breakfast'},{value:'lunch',label:'Lunch'},{value:'dinner',label:'Dinner'},
  {value:'snack',label:'Snacks'},{value:'dessert',label:'Desserts'},{value:'sides',label:'Side dishes'},
  {value:'smoothie',label:'Smoothies & shakes'},
];
export const PROTEIN_FILTERS = [
  {value:'chicken',label:'Chicken',pattern:/\bchicken\b/i},
  {value:'beef',label:'Beef',pattern:/\b(beef|steak|ground chuck|ground round|hamburger patties)\b/i},
  {value:'pork',label:'Pork',pattern:/\b(pork|bacon|ham|prosciutto|pancetta)\b/i},
  {value:'turkey',label:'Turkey',pattern:/\bturkey\b/i},
  {value:'seafood',label:'Fish & seafood',pattern:/\b(fish|salmon|tuna|cod|tilapia|trout|haddock|shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?)\b/i},
  {value:'eggs',label:'Eggs',pattern:/\beggs?\b/i},
  {value:'beans',label:'Beans & lentils',pattern:/\b(beans?|lentils?|chickpeas?|garbanzo)\b/i},
  {value:'tofu',label:'Tofu',pattern:/\b(tofu|tempeh)\b/i},
] as const;
export type ProteinFilter = typeof PROTEIN_FILTERS[number]['value'];
export type ChoiceFilters = {meals:MealTime[];proteins:ProteinFilter[];cuisines:string[];maxMinutes:number|null};
export const EMPTY_CHOICE_FILTERS:ChoiceFilters={meals:[],proteins:[],cuisines:[],maxMinutes:null};
export const cuisineKey=(value:string)=>value.trim().toLowerCase();
export function availableCuisines(recipes:Recipe[]):string[]{
  return [...new Set(recipes.flatMap(r=>r.cuisine?.trim()?[cuisineKey(r.cuisine)]:[]))].sort();
}
export function filterCount(filters:ChoiceFilters):number {
  return filters.meals.length+filters.proteins.length+filters.cuisines.length+(filters.maxMinutes===null?0:1);
}
/** OR within each group; AND across groups. Never widen the preference-filtered input. */
export function filterMealChoices(recipes:Recipe[],filters:ChoiceFilters):Recipe[]{
  return recipes.filter(recipe=>{
    if(filters.meals.length&&!filters.meals.some(meal=>recipe.meal_time.includes(meal)))return false;
    if(filters.cuisines.length&&!filters.cuisines.includes(cuisineKey(recipe.cuisine??'')))return false;
    if(filters.maxMinutes!==null&&recipe.prep_time_mins>filters.maxMinutes)return false;
    if(filters.proteins.length){
      // Match actual ingredients, excluding stocks, flavorings and meat substitutes.
      const ingredients=(recipe.ingredients_list??[]).filter(line=>! /\b(broth|stock|bouillon|seasoning|flavou?r|vegan|vegetarian|plant.based)\b/i.test(line)).join(' ');
      if(!filters.proteins.some(protein=>PROTEIN_FILTERS.find(option=>option.value===protein)?.pattern.test(ingredients)))return false;
    }
    return true;
  });
}
