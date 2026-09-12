import type { Recipe } from '@/lib/types';

/** Case-insensitive: pantry item matches if it appears as a substring of the ingredient line. */
export function ingredientLineMatchesPantry(
  ingredientLine: string,
  pantryLower: string[]
): boolean {
  const line = ingredientLine.trim().toLowerCase();
  if (!line) return false;
  return pantryLower.some((p) => p.length > 0 && line.includes(p));
}

export interface RecipePantryMatch {
  recipe: Recipe;
  matchedCount: number;
  total: number;
  pct: number;
  missingCount: number;
}

export function matchRecipeToPantry(
  recipe: Recipe,
  pantryNames: string[]
): RecipePantryMatch | null {
  const list = recipe.ingredients_list;
  if (!list || list.length === 0) return null;

  const pantryLower = pantryNames
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);

  let matched = 0;
  for (const line of list) {
    if (ingredientLineMatchesPantry(line, pantryLower)) matched++;
  }

  const total = list.length;
  const pct = (matched / total) * 100;
  return {
    recipe,
    matchedCount: matched,
    total,
    pct,
    missingCount: total - matched,
  };
}

export function rankRecipesByPantry(
  recipes: Recipe[],
  pantryNames: string[]
): RecipePantryMatch[] {
  const out: RecipePantryMatch[] = [];
  for (const r of recipes) {
    const m = matchRecipeToPantry(r, pantryNames);
    if (m) out.push(m);
  }
  out.sort((a, b) => b.pct - a.pct);
  return out;
}
