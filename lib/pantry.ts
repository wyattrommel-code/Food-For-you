/**
 * Preset pantry ingredients and shared types for "Cook What I Have".
 */

export type PantryItem = {
  name: string;
  category: string;
  isCustom: boolean;
};

export const USER_PANTRY_KEY = 'user_pantry';

const mk = (name: string, category: string): PantryItem => ({
  name,
  category,
  isCustom: false,
});

/** All preset ingredients (non-custom), grouped by category label. */
export const PRESET_PANTRY_BY_CATEGORY: { title: string; data: PantryItem[] }[] = [
  {
    title: 'Proteins',
    data: [
      mk('chicken breast', 'Proteins'),
      mk('ground beef', 'Proteins'),
      mk('eggs', 'Proteins'),
      mk('bacon', 'Proteins'),
      mk('tuna', 'Proteins'),
      mk('shrimp', 'Proteins'),
      mk('pork chops', 'Proteins'),
      mk('salmon', 'Proteins'),
    ],
  },
  {
    title: 'Dairy',
    data: [
      mk('milk', 'Dairy'),
      mk('butter', 'Dairy'),
      mk('heavy cream', 'Dairy'),
      mk('sour cream', 'Dairy'),
      mk('cheddar cheese', 'Dairy'),
      mk('mozzarella', 'Dairy'),
      mk('parmesan', 'Dairy'),
      mk('cream cheese', 'Dairy'),
      mk('yogurt', 'Dairy'),
    ],
  },
  {
    title: 'Produce',
    data: [
      mk('garlic', 'Produce'),
      mk('onion', 'Produce'),
      mk('tomatoes', 'Produce'),
      mk('potatoes', 'Produce'),
      mk('carrots', 'Produce'),
      mk('broccoli', 'Produce'),
      mk('spinach', 'Produce'),
      mk('bell pepper', 'Produce'),
      mk('lemon', 'Produce'),
      mk('lime', 'Produce'),
      mk('avocado', 'Produce'),
      mk('celery', 'Produce'),
      mk('mushrooms', 'Produce'),
    ],
  },
  {
    title: 'Pantry',
    data: [
      mk('olive oil', 'Pantry'),
      mk('vegetable oil', 'Pantry'),
      mk('flour', 'Pantry'),
      mk('sugar', 'Pantry'),
      mk('brown sugar', 'Pantry'),
      mk('salt', 'Pantry'),
      mk('black pepper', 'Pantry'),
      mk('pasta', 'Pantry'),
      mk('rice', 'Pantry'),
      mk('breadcrumbs', 'Pantry'),
      mk('soy sauce', 'Pantry'),
      mk('ketchup', 'Pantry'),
      mk('mustard', 'Pantry'),
      mk('hot sauce', 'Pantry'),
      mk('vinegar', 'Pantry'),
      mk('chicken broth', 'Pantry'),
      mk('beef broth', 'Pantry'),
      mk('canned tomatoes', 'Pantry'),
    ],
  },
  {
    title: 'Bread',
    data: [
      mk('sandwich bread', 'Bread'),
      mk('tortillas', 'Bread'),
      mk('burger buns', 'Bread'),
      mk('hot dog buns', 'Bread'),
      mk('pita bread', 'Bread'),
    ],
  },
];

export const ALL_PRESET_ITEMS: PantryItem[] = PRESET_PANTRY_BY_CATEGORY.flatMap((s) => s.data);

export const PRESET_NAME_LOWER = new Set(
  ALL_PRESET_ITEMS.map((i) => i.name.trim().toLowerCase())
);

export function isPresetName(name: string): boolean {
  return PRESET_NAME_LOWER.has(name.trim().toLowerCase());
}
