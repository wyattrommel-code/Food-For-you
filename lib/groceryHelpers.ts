// ─── Types ────────────────────────────────────────────────────

export type GroceryCategory = 'protein' | 'produce' | 'pantry';

export interface GroceryItem {
  /**
   * Stable ID: the normalized (lowercase, trimmed) ingredient name.
   * e.g. "garlic" — shared across all recipes that use this ingredient.
   */
  id: string;
  /** Display name — casing from the first recipe that contributed it. */
  name: string;
  /** IDs of every recipe that uses this ingredient. */
  recipeIds: string[];
  /** Recipe titles parallel to recipeIds, used for the source subtitle. */
  sourceNames: string[];
  checked: boolean;
  addedAt: number;
  category: GroceryCategory;
}

export const CATEGORY_META: Record<
  GroceryCategory,
  { label: string; emoji: string; color: string }
> = {
  protein: { label: 'Protein & Meat', emoji: '🥩', color: '#EF4444' },
  produce: { label: 'Produce',        emoji: '🥦', color: '#22C55E' },
  pantry:  { label: 'Pantry & Other', emoji: '🥫', color: '#F59E0B' },
};

export const CATEGORY_ORDER: GroceryCategory[] = ['protein', 'produce', 'pantry'];

// ─── Keyword lists ────────────────────────────────────────────
// Sorted from most-specific to least to reduce false positives.

const PROTEIN_KEYWORDS = [
  'salmon', 'chicken', 'beef', 'pork', 'shrimp', 'lamb', 'tuna', 'turkey',
  'eggs', 'egg', 'tofu', 'bacon', 'sausage', 'steak', 'ribeye', 'bulgogi',
  'prawn', 'cod', 'tilapia', 'crab', 'lobster', 'venison', 'duck', 'tempeh',
  'seitan', 'clam', 'oyster', 'scallop', 'anchovy', 'sardine', 'mackerel',
  'trout', 'halibut', 'ham', 'salami', 'pepperoni', 'prosciutto', 'chorizo',
  'kielbasa', 'fish', 'meat', 'mince', 'ground beef', 'ground pork',
  'chicken breast', 'chicken thigh', 'chicken leg', 'chicken wing',
];

const PRODUCE_KEYWORDS = [
  'tomato', 'onion', 'garlic', 'avocado', 'spinach', 'pepper', 'cucumber',
  'lemon', 'lime', 'banana', 'mango', 'berries', 'berry', 'basil', 'parsley',
  'ginger', 'cilantro', 'mint', 'kale', 'broccoli', 'carrot', 'celery',
  'zucchini', 'mushroom', 'corn', 'potato', 'lettuce', 'cabbage', 'fennel',
  'leek', 'scallion', 'green onion', 'chive', 'thyme', 'rosemary', 'oregano',
  'sage', 'dill', 'tarragon', 'apple', 'orange', 'grape', 'pear', 'plum',
  'peach', 'apricot', 'cherry', 'watermelon', 'melon', 'pineapple', 'papaya',
  'fig', 'pomegranate', 'asparagus', 'artichoke', 'eggplant', 'squash',
  'pumpkin', 'beet', 'radish', 'turnip', 'yam', 'sweet potato', 'microgreen',
  'arugula', 'chard', 'bok choy', 'açaí', 'acai', 'herb', 'shallot',
  'jalapeño', 'jalapeno', 'chili', 'bell pepper', 'lemongrass', 'edamame',
  'snap pea', 'snow pea', 'okra', 'artichoke', 'endive', 'radicchio',
];

// ─── Categorization function ──────────────────────────────────

/**
 * Auto-sorts an ingredient string into one of three categories based on
 * keyword matching. Checks protein first, then produce, then defaults
 * to pantry for anything that doesn't match.
 */
export function categorizeIngredient(ingredient: string): GroceryCategory {
  const lower = ingredient.toLowerCase();

  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k))) return 'protein';
  if (PRODUCE_KEYWORDS.some((k) => lower.includes(k))) return 'produce';
  return 'pantry';
}

// ─── Grouping helper ──────────────────────────────────────────

/**
 * Given a flat list of GroceryItems, returns them grouped by category in
 * display order (protein → produce → pantry). Within each group, unchecked
 * items come first (sorted by name), checked items last (sorted by name).
 */
export function groupByCategory(
  items: GroceryItem[]
): Record<GroceryCategory, GroceryItem[]> {
  const groups: Record<GroceryCategory, GroceryItem[]> = {
    protein: [],
    produce: [],
    pantry:  [],
  };

  for (const item of items) {
    groups[item.category].push(item);
  }

  for (const cat of CATEGORY_ORDER) {
    groups[cat].sort((a, b) => {
      // Unchecked before checked
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }

  return groups;
}
