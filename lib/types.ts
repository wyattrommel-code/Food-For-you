// ============================================================
// Food For You — TypeScript Interfaces
// Mirrors the Supabase schema exactly
// ============================================================

// ─── Database row types ──────────────────────────────────────

export interface DbUser {
  id: string;
  created_at: string;
}

export interface DbUserPreferences {
  id: string;
  user_id: string;
  disliked_ingredients: string[];
  disliked_cuisines: string[];
  liked_ingredients: string[];
  liked_cuisines: string[];
  updated_at: string;
}

export interface DbUserFavorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** effort_score: 1 = very easy → 5 = weekend project */
export type EffortScore = 1 | 2 | 3 | 4 | 5;

export interface DbRecipe {
  id: string;
  title: string;
  description: string;
  meal_time: MealTime[];
  prep_time_mins: number;
  effort_score: EffortScore;
  is_recipe_of_the_day: boolean;
  tags: string[];
  image_url: string;
  ingredients_list: string[];
  shopping_list: string[];
  recipe_steps: string[];
  cuisine: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── Joined / enriched types used in the UI ──────────────────

/** Recipe enriched with whether the current user has favorited it */
export interface Recipe extends DbRecipe {
  is_favorited: boolean;
}

/** Full preferences object — front-end facing */
export interface UserPreferences {
  disliked_ingredients: string[];
  disliked_cuisines: string[];
  liked_ingredients: string[];
  liked_cuisines: string[];
}

// ─── Taste Engine helpers ─────────────────────────────────────

// ── Shared trigger arrays (referenced by multiple alias keys) ──

const GLUTEN_TRIGGERS = [
  // Generic gluten carriers
  'bun', 'bread', 'roll', 'flour', 'crust', 'dough', 'wheat', 'crouton',
  'breadcrumb', 'panko', 'graham', 'cracker', 'malt', 'seitan', 'spelt',
  // Specific pasta shapes — these never contain the word "pasta"
  'pasta', 'macaroni', 'spaghetti', 'penne', 'rigatoni', 'fettuccine',
  'linguine', 'fusilli', 'farfalle', 'orzo', 'ziti', 'rotini', 'vermicelli',
  'bucatini', 'orecchiette', 'cavatappi', 'lasagna',
  // Other gluten-heavy foods
  'noodle', 'ramen', 'tortilla', 'pita', 'bagel', 'pretzel', 'muffin',
  'waffle', 'pancake', 'couscous', 'semolina', 'oat', 'barley', 'rye',
  'cereal', 'biscuit', 'dumpling', 'wonton', 'gyoza', 'pierogi',
];

const DAIRY_TRIGGERS = [
  'cheese', 'milk', 'butter', 'cream', 'yogurt', 'ghee', 'whey',
  'parmesan', 'mozzarella', 'cheddar', 'ricotta', 'brie', 'gouda',
  'feta', 'burrata', 'provolone', 'gruyere', 'mascarpone', 'cottage cheese',
  'goat cheese', 'sour cream', 'custard', 'half and half', 'lactose',
  'kefir', 'paneer',
];

const NUT_TRIGGERS = [
  'almond', 'walnut', 'pecan', 'cashew', 'macadamia', 'pistachio',
  'hazelnut', 'pine nut', 'chestnut', 'brazil nut',
];

const MEAT_TRIGGERS = [
  'beef', 'chicken', 'pork', 'bacon', 'sausage', 'steak', 'turkey', 'ham',
  'prosciutto', 'lamb', 'veal', 'pepperoni', 'salami', 'chorizo', 'brisket',
  'rib', 'ground beef', 'patty', 'meatball', 'lard', 'duck', 'venison',
  'pancetta', 'mortadella',
];

const SHELLFISH_TRIGGERS = [
  'shrimp', 'lobster', 'crab', 'scallop', 'clam', 'oyster',
  'mussel', 'prawn', 'crayfish', 'crawfish',
];

const EGG_TRIGGERS = [
  'egg', 'yolk', 'egg white', 'meringue', 'mayonnaise', 'aioli',
];

/**
 * Allergy / dietary-category dictionary.
 *
 * Maps every label a user might plausibly type to a list of ingredient
 * trigger keywords.  Multiple alias keys point to the same trigger array
 * so that "gluten free", "gluten-free", and "celiac" all expand identically.
 *
 * Keys and values are lowercase.  Matching is done via String.includes()
 * so "macaroni" triggers the "pasta" check even though it doesn't say "pasta".
 */
export const ALLERGY_MAP: Record<string, string[]> = {
  // ── Gluten — all common user phrasings ───────────────────────
  gluten:           GLUTEN_TRIGGERS,
  'gluten free':    GLUTEN_TRIGGERS,
  'gluten-free':    GLUTEN_TRIGGERS,
  'gluten intolerance': GLUTEN_TRIGGERS,
  celiac:           GLUTEN_TRIGGERS,
  coeliac:          GLUTEN_TRIGGERS,
  wheat:            GLUTEN_TRIGGERS,
  'wheat free':     GLUTEN_TRIGGERS,
  'wheat-free':     GLUTEN_TRIGGERS,
  'no gluten':      GLUTEN_TRIGGERS,
  'no wheat':       GLUTEN_TRIGGERS,

  // ── Dairy — all common user phrasings ────────────────────────
  dairy:                  DAIRY_TRIGGERS,
  'dairy free':           DAIRY_TRIGGERS,
  'dairy-free':           DAIRY_TRIGGERS,
  'no dairy':             DAIRY_TRIGGERS,
  lactose:                DAIRY_TRIGGERS,
  'lactose free':         DAIRY_TRIGGERS,
  'lactose-free':         DAIRY_TRIGGERS,
  'lactose intolerant':   DAIRY_TRIGGERS,
  'lactose intolerance':  DAIRY_TRIGGERS,
  'milk allergy':         DAIRY_TRIGGERS,

  // ── Nuts ──────────────────────────────────────────────────────
  nut:              NUT_TRIGGERS,
  nuts:             [...NUT_TRIGGERS, 'peanut'],
  'tree nut':       NUT_TRIGGERS,
  'tree nuts':      NUT_TRIGGERS,
  'nut allergy':    NUT_TRIGGERS,
  peanut:           ['peanut', 'peanut butter', 'groundnut'],
  peanuts:          ['peanut', 'peanut butter', 'groundnut'],

  // ── Meat ──────────────────────────────────────────────────────
  meat:             MEAT_TRIGGERS,
  'no meat':        MEAT_TRIGGERS,
  vegetarian:       MEAT_TRIGGERS,
  vegan:            [...MEAT_TRIGGERS, ...DAIRY_TRIGGERS, ...EGG_TRIGGERS],
  pork:             ['pork', 'bacon', 'ham', 'prosciutto', 'salami', 'chorizo',
                     'sausage', 'pepperoni', 'lard', 'pancetta'],
  beef:             ['beef', 'steak', 'brisket', 'ground beef', 'patty',
                     'meatball', 'rib'],

  // ── Shellfish / Seafood ───────────────────────────────────────
  shellfish:        SHELLFISH_TRIGGERS,
  seafood:          [...SHELLFISH_TRIGGERS,
                     'salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'sardine',
                     'mahi', 'bass', 'trout', 'halibut', 'snapper', 'catfish',
                     'squid', 'octopus', 'fish'],
  fish:             ['salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'sardine',
                     'mahi', 'bass', 'trout', 'halibut', 'snapper', 'catfish',
                     'herring', 'mackerel'],

  // ── Soy ──────────────────────────────────────────────────────
  soy:              ['soy sauce', 'tofu', 'tempeh', 'edamame', 'miso',
                     'soya', 'tamari'],
  soya:             ['soy sauce', 'tofu', 'tempeh', 'edamame', 'miso',
                     'soya', 'tamari'],

  // ── Egg ──────────────────────────────────────────────────────
  egg:              EGG_TRIGGERS,
  eggs:             EGG_TRIGGERS,
  'egg allergy':    EGG_TRIGGERS,

  // ── Sugar / sweeteners ───────────────────────────────────────
  sugar:            ['sugar', 'syrup', 'honey', 'molasses', 'corn syrup',
                     'agave', 'nectar'],

  // ── Alcohol ──────────────────────────────────────────────────
  alcohol:          ['wine', 'beer', 'spirits', 'whiskey', 'vodka', 'rum',
                     'bourbon', 'sake', 'brandy'],
};

// ── Sorted keys cache (longest first) ────────────────────────
// Used by expandDislike's fuzzy scan so longer phrases like
// "gluten-free" are checked before the shorter "gluten" key.
// Computed once at module load, never again.
const ALLERGY_KEYS_DESC = Object.keys(ALLERGY_MAP).sort(
  (a, b) => b.length - a.length
);

/**
 * Expands a single user-entered dislike string into every ingredient
 * keyword that should trigger a ban.
 *
 * Resolution order (stops at the first match):
 *  1. Exact key  — "gluten" → ALLERGY_MAP["gluten"]
 *  2. Key-in-term scan (longest key first) —
 *     "gluten free" contains key "gluten" → ALLERGY_MAP["gluten"]
 *     "no dairy"    contains key "dairy"  → ALLERGY_MAP["dairy"]
 *  3. No match — return [term] so the raw word still bans exact ingredient
 *     occurrences (e.g. disliking "salmon" still hides "Smoked Salmon Fillet").
 *
 * Input is always trimmed and lowercased before any comparison.
 */
function expandDislike(raw: string): string[] {
  const term = raw.trim().toLowerCase();

  // 1. Exact dictionary key
  const exact = ALLERGY_MAP[term];
  if (exact) return [term, ...exact];

  // 2. Longest-key-first substring scan
  //    Finds the most specific key embedded in the user's phrase,
  //    e.g. "gluten-free diet" → matched by key "gluten-free" → GLUTEN_TRIGGERS
  for (const key of ALLERGY_KEYS_DESC) {
    if (term.includes(key)) {
      return [term, ...ALLERGY_MAP[key]];
    }
  }

  // 3. Literal fallback — the word itself is still useful as a substring
  return [term];
}

/**
 * Returns true if the recipe must be HIDDEN based on a user's dislikes.
 *
 * Matching rules (all case-insensitive, substring):
 *  1. Cuisine ban     — recipe.cuisine contains any disliked_cuisine.
 *  2. Direct ban      — any ingredient text contains the raw dislike word.
 *  3. Category ban    — dislike maps to ALLERGY_MAP; all trigger keywords
 *                       are checked against every ingredient entry.
 *
 * Examples of what now works:
 *   "gluten"       → hides Hamburger Bun, All-Purpose Flour, Macaroni, Spaghetti
 *   "gluten free"  → same as "gluten" (fuzzy scan finds the key)
 *   "gluten-free"  → same
 *   "celiac"       → same (explicit alias key)
 *   "dairy"        → hides Parmesan, Heavy Cream, Cheddar, Ghee
 *   "dairy-free"   → same (fuzzy scan finds "dairy")
 *   "shellfish"    → hides Shrimp, Lobster Tail, Scallops
 *   "salmon"       → hides "Smoked Salmon Fillet" (literal substring)
 */
export function isRecipeBanned(
  recipe: DbRecipe,
  prefs: UserPreferences
): boolean {
  // ── 1. Cuisine ban ────────────────────────────────────────────
  if (recipe.cuisine) {
    const cuisineLower = recipe.cuisine.toLowerCase();
    if (
      prefs.disliked_cuisines.some((c) =>
        cuisineLower.includes(c.trim().toLowerCase())
      )
    ) {
      return true;
    }
  }

  if (prefs.disliked_ingredients.length === 0) return false;

  // ── 2 & 3. Ingredient ban with category expansion ─────────────
  // Build the full term list once per isRecipeBanned call (not per ingredient).
  // Each user dislike expands to itself + all mapped trigger keywords.
  // Using a flat array is faster than nested Sets for the small set sizes here.
  const allTerms = prefs.disliked_ingredients.flatMap(expandDislike);

  return recipe.ingredients_list.some((ing) => {
    const ingLower = ing.trim().toLowerCase();
    return allTerms.some((term) => ingLower.includes(term));
  });
}

/**
 * Returns a 0–N affinity score for a recipe based on a user's likes.
 * Higher score = stronger preference match = heavier RNG weight.
 */
export function recipeAffinityScore(
  recipe: DbRecipe,
  prefs: UserPreferences,
  favoriteTags: string[]
): number {
  let score = 0;

  const likedIngredients = prefs.liked_ingredients.map((s) => s.toLowerCase());
  const likedCuisines = prefs.liked_cuisines.map((s) => s.toLowerCase());
  const favTagSet = new Set(favoriteTags.map((t) => t.toLowerCase()));

  // Cuisine match is a strong signal
  if (
    recipe.cuisine &&
    likedCuisines.some((c) => recipe.cuisine!.toLowerCase().includes(c))
  ) {
    score += 3;
  }

  // Each ingredient that contains a liked term adds a point
  recipe.ingredients_list.forEach((ing) => {
    const ingLower = ing.toLowerCase();
    if (likedIngredients.some((liked) => ingLower.includes(liked))) score += 1;
  });

  // Tags shared with favorites boost score significantly
  recipe.tags.forEach((tag) => {
    if (favTagSet.has(tag.toLowerCase())) score += 2;
  });

  return score;
}

// ─── UI helper types ──────────────────────────────────────────

export interface RNGMealSection {
  label: string;
  mealTime: MealTime;
  emoji: string;
  recipes: Recipe[];
}

/** Maps device hour to the active meal time */
export function getMealTimeForHour(hour: number): MealTime {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 17) return 'lunch';
  return 'dinner';
}

export const MEAL_TIME_META: Record<
  MealTime,
  { label: string; greeting: string; emoji: string; color: string }
> = {
  breakfast: {
    label: "Breakfast",
    greeting: "Good morning! What's for breakfast?",
    emoji: "🌅",
    color: "#F97316",
  },
  lunch: {
    label: "Lunch",
    greeting: "Lunchtime. What are you feeling?",
    emoji: "☀️",
    color: "#EAB308",
  },
  dinner: {
    label: "Dinner",
    greeting: "Evening. Let's cook something good.",
    emoji: "🌙",
    color: "#8B5CF6",
  },
  snack: {
    label: "Snack",
    greeting: "Need a snack?",
    emoji: "✨",
    color: "#10B981",
  },
};

export const EFFORT_LABELS: Record<EffortScore, string> = {
  1: "Effortless",
  2: "Easy",
  3: "Moderate",
  4: "Involved",
  5: "Weekend Project",
};

/**
 * Converts an EffortScore (1–5) to a spoon emoji string for glanceable
 * difficulty display that cannot be confused with a spiciness indicator.
 *   1       → 🥄        (effortless)
 *   2–3     → 🥄🥄     (easy / moderate)
 *   4–5     → 🥄🥄🥄  (involved / weekend project)
 */
export function effortSpoons(score: EffortScore | number): string {
  if (score <= 1) return '🥄';
  if (score <= 3) return '🥄🥄';
  return '🥄🥄🥄';
}
