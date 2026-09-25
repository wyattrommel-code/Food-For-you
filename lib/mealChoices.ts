import {applyMealTimePreferencePool, getPreferredMealTimesForHour, type Recipe} from './types';
import {freshOrder, rememberIds} from './discovery';
import {hungryCandidates, treatKinds, TREAT_LABELS, type TreatKind} from './treats';

export const CHOICE_TITLES = {
  helpMeDecide: 'Help Me Decide',
  hungryNow: "I'm hungry now",
  sweetTreat: 'A sweet treat',
  pickForMe: 'Pick for me',
  feelingBold: 'Feeling bold',
};
export type ChoiceMode = keyof typeof CHOICE_TITLES;
export type MealChoice = {key:string; label:string|null; recipe:Recipe|null};
export type ChoiceResult = {choices:MealChoice[]; description:string};
export function choiceMode(value:unknown):ChoiceMode {
  return typeof value==='string'&&Object.prototype.hasOwnProperty.call(CHOICE_TITLES,value)?value as ChoiceMode:'hungryNow';
}

/** Pools always start with the account's already preference-filtered recipes. */
export function rollMealChoices(
  mode:ChoiceMode, recipes:Recipe[], previous:MealChoice[]=[], held:ReadonlySet<string>=new Set(),
  history:readonly string[]=[], hour=new Date().getHours(), random=Math.random,
):ChoiceResult {
  let keys=['0','1','2'], description='', pool=recipes;
  if(mode==='hungryNow') {
    const preferred=getPreferredMealTimesForHour(hour);
    const forTime=(items:Recipe[])=>{
      const matches=preferred?items.filter(r=>r.meal_time.some(mt=>preferred.includes(mt))):items;
      return matches.length>=3?matches:items;
    };
    pool=forTime(hungryCandidates(recipes,30));description='Ready in 30 minutes or less';
    if(pool.length<3){pool=forTime(hungryCandidates(recipes,45));description='Ready in 45 minutes or less';}
    if(pool.length<3){pool=forTime(hungryCandidates(recipes,null));description='Ideas that fit your food preferences';}
  } else if(mode==='helpMeDecide') {
    description='Three ideas for you';
  } else if(mode==='pickForMe') {
    keys=['0'];pool=applyMealTimePreferencePool(recipes,hour);description='One idea to make the decision easier';
  } else if(mode==='feelingBold') {
    pool=recipes.filter(r=>r.effort_score===3);description='Try something a little more adventurous';
  } else {keys=['hot','cold','quick'];description='Something for every sweet craving';}

  const byId=new Map(recipes.map(r=>[r.id,r]));
  const validForSlot=(r:Recipe,key:string)=>mode==='sweetTreat'?treatKinds(r).includes(key as TreatKind)
    :mode==='hungryNow'?!r.meal_time.includes('dessert'):mode==='feelingBold'?r.effort_score===3:true;
  const fixed=keys.map(key=>{
    const old=previous.find(c=>c.key===key)?.recipe;
    const current=old&&held.has(old.id)?byId.get(old.id):undefined;
    return current&&validForSlot(current,key)?current:null;
  });
  const fixedIds=new Set(fixed.flatMap(r=>r?[r.id]:[]));
  const previousIds=previous.flatMap(c=>c.recipe?[c.recipe.id]:[]);
  const recent=rememberIds(previousIds,history);
  const candidates=keys.map(key=>freshOrder(pool.filter(r=>!fixedIds.has(r.id)&&validForSlot(r,key)),recent,random).slice(0,keys.length));
  // At most three slots: considering the first three unique candidates per slot
  // suffices to fill every possible slot, without an expensive full-catalog search.
  // Prefer a full set, then the most replacements. Held slots never participate.
  let best:(Recipe|null)[]=keys.map(()=>null),bestScore=-1;
  function assign(index:number, picked:(Recipe|null)[],score:number) {
    if(index===keys.length){if(score>bestScore){best=[...picked];bestScore=score;}return;}
    if(fixed[index]){assign(index+1,[...picked,fixed[index]],score+10);return;}
    for(const r of candidates[index])if(!picked.some(p=>p?.id===r.id)) {
      assign(index+1,[...picked,r],score+10+(previousIds.includes(r.id)?0:1));
    }
    assign(index+1,[...picked,null],score);
  }
  assign(0,[],0);
  return {description,choices:keys.map((key,i)=>({key,label:mode==='sweetTreat'?TREAT_LABELS[key as TreatKind]:null,recipe:best[i]}))};
}
