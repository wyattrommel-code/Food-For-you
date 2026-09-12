// ============================================================
// seed-spoonacular.js — Food For You one-time seed script
//
// Usage:
//   node seed-spoonacular.js
//
// Requirements:
//   • Node 18+ (uses native fetch)
//   • @supabase/supabase-js already installed
//   • SUPABASE_SERVICE_ROLE_KEY set in your .env file
// ============================================================

const { readFileSync } = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ─── Load .env without dotenv ─────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    const result = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim().replace(/#.*$/, '').trim();
      value = value.replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    return result;
  } catch (err) {
    console.error('⚠️  Could not read .env file:', err.message);
    return {};
  }
}

const env              = loadEnv();
const SUPABASE_URL     = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌  EXPO_PUBLIC_SUPABASE_URL missing from .env');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY missing from .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Config ───────────────────────────────────────────────────
const SPOONACULAR_KEY = process.env.SPOONACULAR_API_KEY || '';
if (!SPOONACULAR_KEY) {
  throw new Error('Legacy Spoonacular import is disabled. Use the free community CSV workflow, or explicitly configure SPOONACULAR_API_KEY.');
}
const SEARCH_BASE     = 'https://api.spoonacular.com/recipes/complexSearch';
const INFO_BASE       = 'https://api.spoonacular.com/recipes';
const DELAY_MS        = 500;

const RECIPE_QUERIES = [
  'scrambled eggs bacon',
  'Oatmeal with fruit',
  'Breakfast burrito',
  'Turkey and cheese sandwich',
  'Chicken Caesar salad',
  'grilled cheese sandwich',
  'spaghetti bolognese',
  'grilled chicken rice',
  'Ground beef tacos',
  'apple peanut butter',
  'Yogurt parfait',
  'Chips and salsa',
];

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strip every HTML tag from Spoonacular's summary strings
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')   // remove tags
    .replace(/\s{2,}/g, ' ')    // collapse whitespace
    .trim();
}

// Truncate a plain-text summary to at most 2 sentences
function buildDescription(summary) {
  const plain = stripHtml(summary);
  if (!plain) return '';
  const sentences = plain.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 2).join(' ').trim() || plain.slice(0, 200);
}

// Map Spoonacular dishTypes → our MealTime[]
function mapMealTime(dishTypes) {
  const types = (dishTypes || []).map((t) => t.toLowerCase());
  const result = new Set();

  for (const t of types) {
    if (t.includes('breakfast') || t.includes('brunch')) {
      result.add('breakfast');
    }
    if (
      t.includes('lunch') || t.includes('soup') ||
      t.includes('salad') || t.includes('sandwich')
    ) {
      result.add('lunch');
    }
    if (
      t.includes('dinner') || t.includes('main course') ||
      t.includes('main dish')
    ) {
      result.add('dinner');
    }
    if (
      t.includes('snack') || t.includes('appetizer') ||
      t.includes('side dish')
    ) {
      result.add('snack');
    }
  }

  return result.size > 0 ? [...result] : ['dinner'];
}

// Convert readyInMinutes → effort_score 1–5
function calcEffort(minutes) {
  if (!minutes || minutes < 15) return 1;
  if (minutes <= 30)            return 2;
  if (minutes <= 45)            return 3;
  if (minutes <= 60)            return 4;
  return 5;
}

// Build "amount unit name" ingredient strings from extendedIngredients
function buildIngredientsList(extended) {
  if (!Array.isArray(extended)) return [];
  return extended.map((ing) => {
    const amount = ing.amount ? String(ing.amount).replace(/\.0+$/, '') : '';
    const unit   = (ing.unit   || '').trim();
    const name   = (ing.name   || ing.originalName || '').trim();
    return [amount, unit, name].filter(Boolean).join(' ');
  });
}

// Build shopping list as bare ingredient names (no amounts)
function buildShoppingList(extended) {
  if (!Array.isArray(extended)) return [];
  return extended.map((ing) =>
    (ing.name || ing.originalName || '').trim()
  ).filter(Boolean);
}

// Pull steps from analyzedInstructions; fall back to splitting instructions text
function buildSteps(recipe) {
  const analyzed = recipe.analyzedInstructions;
  if (Array.isArray(analyzed) && analyzed.length > 0) {
    const steps = analyzed[0].steps || [];
    const mapped = steps.map((s) => (s.step || '').trim()).filter(Boolean);
    if (mapped.length > 0) return mapped;
  }

  // Fallback: split raw instructions on periods
  const raw = recipe.instructions || '';
  return raw
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 6);
}

// Map a full Spoonacular recipe object → our Supabase row
function mapToRow(recipe) {
  return {
    title:                recipe.title,
    description:          buildDescription(recipe.summary),
    image_url:            recipe.image || '',
    cuisine:              (recipe.cuisines && recipe.cuisines[0]) || 'American',
    meal_time:            mapMealTime(recipe.dishTypes),
    prep_time_mins:       recipe.readyInMinutes || 30,
    effort_score:         calcEffort(recipe.readyInMinutes),
    is_recipe_of_the_day: false,
    tags:                 (recipe.dishTypes || []).slice(0, 4),
    ingredients_list:     buildIngredientsList(recipe.extendedIngredients),
    shopping_list:        buildShoppingList(recipe.extendedIngredients),
    recipe_steps:         buildSteps(recipe),
  };
}

// ─── API fetchers ─────────────────────────────────────────────

// Step 1: Search for a recipe by name, return the first result ID
async function searchRecipe(query) {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set('query',                  query);
  url.searchParams.set('number',                 '1');
  url.searchParams.set('addRecipeInformation',   'true');
  url.searchParams.set('fillIngredients',        'true');
  url.searchParams.set('instructionsRequired',   'true');
  url.searchParams.set('apiKey',                 SPOONACULAR_KEY);

  const res = await fetch(url.toString());

  // Capture quota headers before parsing body
  const quotaUsed      = res.headers.get('x-api-quota-used');
  const quotaLeft      = res.headers.get('x-api-quota-left');
  const quotaRequest   = res.headers.get('x-api-quota-request');

  if (!res.ok) {
    throw new Error(`Search HTTP ${res.status}: ${await res.text()}`);
  }

  const data    = await res.json();
  const results = data.results || [];
  if (results.length === 0) {
    throw new Error(`No results found for "${query}"`);
  }

  return {
    id:         results[0].id,
    quotaUsed,
    quotaLeft,
    quotaRequest,
  };
}

// Step 2: Fetch full recipe details (includes analyzedInstructions)
async function fetchRecipeInfo(id) {
  const url = new URL(`${INFO_BASE}/${id}/information`);
  url.searchParams.set('includeNutrition', 'false');
  url.searchParams.set('apiKey',            SPOONACULAR_KEY);

  const res = await fetch(url.toString());

  const quotaUsed    = res.headers.get('x-api-quota-used');
  const quotaLeft    = res.headers.get('x-api-quota-left');
  const quotaRequest = res.headers.get('x-api-quota-request');

  if (!res.ok) {
    throw new Error(`Info HTTP ${res.status}: ${await res.text()}`);
  }

  const recipe = await res.json();
  return { recipe, quotaUsed, quotaLeft, quotaRequest };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🍽️   Food For You — Spoonacular Seed Script');
  console.log('─'.repeat(54));
  console.log(`📡  Supabase:     ${SUPABASE_URL}`);
  console.log(`🎯  Recipes:      ${RECIPE_QUERIES.length}`);
  console.log('─'.repeat(54));
  console.log('');

  let succeeded   = 0;
  let failed      = 0;
  let lastQuota   = { used: '?', left: '?', request: '?' };

  for (let i = 0; i < RECIPE_QUERIES.length; i++) {
    const query  = RECIPE_QUERIES[i];
    const num    = String(i + 1).padStart(2, '0');
    const prefix = `[${num}/${RECIPE_QUERIES.length}]`;

    console.log(`${prefix} 🔍  "${query}"`);

    try {
      // ── Step 1: Search ───────────────────────────────────
      const searchResult = await searchRecipe(query);
      if (searchResult.quotaLeft !== null) {
        lastQuota = {
          used:    searchResult.quotaUsed,
          left:    searchResult.quotaLeft,
          request: searchResult.quotaRequest,
        };
      }

      await sleep(DELAY_MS);

      // ── Step 2: Full recipe info ─────────────────────────
      const { recipe, quotaLeft, quotaUsed, quotaRequest } =
        await fetchRecipeInfo(searchResult.id);

      if (quotaLeft !== null) {
        lastQuota = { used: quotaUsed, left: quotaLeft, request: quotaRequest };
      }

      // ── Step 3: Map ──────────────────────────────────────
      const row = mapToRow(recipe);

      console.log(
        `         ✓ Found: "${recipe.title}" ` +
        `(${row.prep_time_mins} min · effort ${row.effort_score} · ` +
        `${row.meal_time.join('/')})`
      );

      // ── Step 4: Duplicate check ──────────────────────────
      const { data: existing, error: checkErr } = await supabase
        .from('recipes')
        .select('id')
        .ilike('title', row.title)
        .maybeSingle();

      if (checkErr) {
        console.log(`         ⚠️  Could not check for duplicate: ${checkErr.message}`);
      }

      if (existing) {
        console.log(`         ⏭️  Skipped — "${row.title}" already exists`);
        succeeded++; // counts as handled, not a failure
        continue;    // eslint-disable-line no-continue
      }

      // ── Step 5: Insert ───────────────────────────────────
      process.stdout.write(`         💾 Inserting...  `);

      const { error: insertErr } = await supabase
        .from('recipes')
        .insert(row);

      if (insertErr) {
        console.log(`❌  ${insertErr.message}`);
        failed++;
      } else {
        console.log('✅  Done');
        succeeded++;
      }
    } catch (err) {
      console.log(`         ❌  Error: ${err.message}`);
      failed++;
    }

    // Delay between recipes (skip after the last one)
    if (i < RECIPE_QUERIES.length - 1) {
      await sleep(DELAY_MS);
    }

    console.log('');
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('─'.repeat(54));
  console.log('🏁  Seed complete!');
  console.log(`    ✅  Succeeded:       ${succeeded} / ${RECIPE_QUERIES.length}`);
  if (failed > 0) {
    console.log(`    ❌  Failed:          ${failed}`);
  }
  console.log('');
  console.log('    📊  Spoonacular quota (last response):');
  console.log(`        Used this request:  ${lastQuota.request ?? '?'} point(s)`);
  console.log(`        Total used today:   ${lastQuota.used ?? '?'}`);
  console.log(`        Remaining today:    ${lastQuota.left ?? '?'}`);
  console.log('─'.repeat(54));
  console.log('');
  console.log('    Pull-to-refresh on the Home screen to see the new recipes!');
  console.log('');
}

main().catch((err) => {
  console.error('');
  console.error('💥  Unexpected error:', err.message || err);
  console.error('');
  process.exit(1);
});
