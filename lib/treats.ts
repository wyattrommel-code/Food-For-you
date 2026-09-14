import type { Recipe } from './types';
import { freshOrder } from './discovery';

export const TREAT_LABELS = { hot: 'Hot treat', cold: 'Cold treat', quick: 'Quick & easy' };
export type TreatKind = keyof typeof TREAT_LABELS;
export function isDessert(recipe: Pick<Recipe, 'meal_time'>) {
  return recipe.meal_time.includes('dessert');
}
export function hungryCandidates(recipes: Recipe[], maxPrep: number | null) {
  return recipes.filter(r => !isDessert(r) && (maxPrep === null || r.prep_time_mins <= maxPrep));
}
// Reviewed serving temperatures. Baking alone does not make a chilled dessert hot.
const HOT = new Set(['Chocolate Lava Cakes', 'Chocolate Peanut Butter Mug Cake', 'Cinnamon Sugar Toast Fingers', 'Microwave Smores', 'Oven Cinnamon Apple', 'Quick Rice Pudding with Raisins']);
const COLD = new Set(['Berry Banana Yogurt Parfaits', 'Chocolate Pudding and Cookie Cups', 'Chocolate Sauce Ice Cream Sundaes', 'Classic Tiramisu', 'Easy Banana Split', 'Mint Chip Cookie Ice Cream Sandwiches', 'No-Bake Cheesecake Dessert Cups', 'Peaches and Vanilla Cream Cups', 'Quick Banana Pudding Cups', 'Vanilla Yogurt Fruit Dip']);
export function treatKinds(recipe: Recipe): TreatKind[] {
  if (!isDessert(recipe)) return [];
  const kinds: TreatKind[] = [];
  if (HOT.has(recipe.title) || recipe.tags.includes('treat-hot')) kinds.push('hot');
  if (COLD.has(recipe.title) || recipe.tags.includes('treat-cold')) kinds.push('cold');
  if (recipe.prep_time_mins <= 15 && recipe.effort_score <= 2 && recipe.title !== 'Rice Krispie Treats') kinds.push('quick');
  return kinds;
}
export function pickTreats(recipes: Recipe[], previous: string[] = []) {
  const kinds: TreatKind[] = ['hot', 'cold', 'quick'];
  const pools = kinds.map(kind => freshOrder(recipes.filter(r => treatKinds(r).includes(kind)), previous));
  let best: (Recipe | null)[] = [null, null, null];
  function search(index: number, picked: (Recipe | null)[]): boolean {
    if (index === 3) {
      if (picked.filter(Boolean).length > best.filter(Boolean).length) best = [...picked];
      return picked.every(Boolean);
    }
    for (const r of pools[index]) {
      if (!picked.some(p => p?.id === r.id) && search(index + 1, [...picked, r])) return true;
    }
    return search(index + 1, [...picked, null]);
  }
  search(0, []);
  return kinds.map((kind, i) => ({ kind, recipe: best[i] }));
}
