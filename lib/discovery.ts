import type { Recipe, UserPreferences } from './types';

export const MEAL_STYLES = [
  { value: 'tacos', label: 'Tacos & burritos' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'sandwiches', label: 'Burgers & sandwiches' },
  { value: 'chicken', label: 'Chicken dinners' },
  { value: 'rice', label: 'Rice bowls' },
  { value: 'breakfast', label: 'Breakfast for dinner' },
  { value: 'soup', label: 'Soups & stews' },
  { value: 'meatless', label: 'Meatless meals' },
] as const;

const styleTerms: Record<string, RegExp> = {
  tacos: /\b(taco|tacos|burrito|burritos|enchilada|enchiladas|quesadilla|quesadillas)\b/i,
  pasta: /\b(pasta|spaghetti|noodles?|macaroni|ravioli|tortellini|lasagna|ziti)\b/i,
  sandwiches: /\b(burger|burgers|sandwich|sandwiches|sliders?|wraps?|subs?)\b/i,
  chicken: /\bchicken\b/i,
  rice: /\brice\b/i,
  breakfast: /\b(breakfast|pancakes?|waffles?|omelette|scrambled eggs|french toast)\b/i,
  soup: /\b(soups?|stews?|chowder|chili)\b/i,
  meatless: /\b(vegetarian|vegan|meatless)\b/i,
};

export function discoveryBonus(recipe: Pick<Recipe, 'title'|'tags'|'prep_time_mins'|'effort_score'>, prefs: UserPreferences): number {
  const text = [recipe.title, ...recipe.tags].join(' ');
  const styles = (prefs.preferred_meal_styles ?? []).some(s => styleTerms[s]?.test(text));
  return (styles ? 4 : 0) + (prefs.prefer_easy && recipe.effort_score <= 2 ? 2 : 0)
    + (prefs.max_cook_time_mins && recipe.prep_time_mins <= prefs.max_cook_time_mins ? 2 : 0);
}

/** Bounded weights keep every eligible meal discoverable, including an empty profile. */
export function weightedShuffle<T extends { _score?: number }>(items: readonly T[], random = Math.random): T[] {
  return items.map(item => {
    const score = Number.isFinite(item._score) ? item._score! : 0;
    const weight = 1 + Math.min(12, Math.max(0, score)) / 3;
    const u = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, random()));
    return { item, key: -Math.log(u) / weight };
  }).sort((a,b) => a.key-b.key).map(x=>x.item);
}

/** Recent IDs are newest first. Never widens the already-filtered eligible pool. */
export function freshOrder<T extends { id: string; _score?: number }>(items: readonly T[], recent: readonly string[] = [], random = Math.random): T[] {
  const unique = [...new Map(items.map(r=>[r.id,r])).values()];
  const seen = new Set(recent);
  const fresh = weightedShuffle(unique.filter(r=>!seen.has(r.id)), random);
  const repeats = weightedShuffle(unique.filter(r=>seen.has(r.id)), random)
    .sort((a,b)=>recent.indexOf(b.id)-recent.indexOf(a.id));
  const ordered = [...fresh, ...repeats];
  if (ordered.length > 1 && ordered[0].id === recent[0]) [ordered[0],ordered[1]]=[ordered[1],ordered[0]];
  return ordered;
}

export function rememberIds(current: readonly string[], recent: readonly string[], limit = 18): string[] {
  return [...new Set([...current, ...recent])].slice(0,limit);
}

export function tabBarMetrics(bottom: number, fontScale = 1) {
  const paddingBottom = Math.max(8, bottom);
  // Include navigator item padding, the icon box, label line and our top gap.
  const contentHeight = 72 + Math.ceil(16 * Math.max(0, fontScale - 1));
  return { height: contentHeight + paddingBottom, paddingBottom, paddingTop: 8 };
}
