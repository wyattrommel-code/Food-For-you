// ============================================================
// seed-meals.js — Food For You one-time seed script
//
// Usage:
//   node seed-meals.js
//
// Requirements:
//   • Node 18+ (uses native fetch)
//   • @supabase/supabase-js already installed (it is — it's in dependencies)
//   • SUPABASE_SERVICE_ROLE_KEY added to your .env file
//
// Where to get SUPABASE_SERVICE_ROLE_KEY:
//   Supabase Dashboard → Project Settings → API
//   → "service_role" row → Reveal → Copy
//   ⚠️  Keep this secret — it bypasses Row Level Security.
//       Never commit it or import it into the Expo app.
// ============================================================

const { readFileSync } = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ─── Load .env without dotenv ─────────────────────────────────
// Reads KEY=VALUE lines; supports inline comments with #
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
      // Strip inline comments and surrounding quotes from the value
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

const env = loadEnv();
const SUPABASE_URL     = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Guard: fail early with clear instructions ────────────────
if (!SUPABASE_URL) {
  console.error('❌  EXPO_PUBLIC_SUPABASE_URL is missing from .env');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('');
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  console.error('');
  console.error('   The anon key cannot insert rows because RLS requires');
  console.error('   auth.role() = \'authenticated\'. The service_role key');
  console.error('   bypasses RLS and is required for seed scripts.');
  console.error('');
  console.error('   1. Go to: Supabase Dashboard → Project Settings → API');
  console.error('   2. Find the "service_role" key → click Reveal → Copy');
  console.error('   3. Add this line to your .env file:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=<paste key here>');
  console.error('');
  console.error('   ⚠️  Never import this key into the Expo app bundle.');
  console.error('');
  process.exit(1);
}

// ─── Supabase client (service role — bypasses RLS) ────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Config ───────────────────────────────────────────────────
const RANDOM_URL   = 'https://www.themealdb.com/api/json/v1/1/random.php';
const TARGET_COUNT = 20;
const MAX_ATTEMPTS = 80; // ~4× buffer; TheMealDB has ~300 meals

// ─── Ingredient extractor ─────────────────────────────────────
// TheMealDB stores ingredients as strIngredient1…strIngredient20
// and measures as strMeasure1…strMeasure20.
// This combines them into human-readable strings like "2 cups Milk".
function extractIngredients(meal) {
  const result = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = (meal[`strIngredient${i}`] || '').trim();
    if (!ingredient) continue; // stop when ingredient is blank
    const measure = (meal[`strMeasure${i}`] || '').trim();
    result.push(measure ? `${measure} ${ingredient}` : ingredient);
  }
  return result;
}

// ─── Instruction splitter ─────────────────────────────────────
// TheMealDB returns strInstructions as a wall of text.
// We split it into numbered steps for our recipe_steps[] column.
function extractSteps(raw) {
  if (!raw || !raw.trim()) return [];

  // Try splitting on explicit numbering first: "1.", "STEP 1", etc.
  const byNumber = raw
    .split(/\r?\n(?=(?:STEP\s*)?\d+[\.\)]\s)/i)
    .map((s) => s.replace(/^(?:STEP\s*)?\d+[\.\)]\s*/i, '').trim())
    .filter((s) => s.length > 8);

  if (byNumber.length >= 2) return byNumber;

  // Fall back to splitting on blank lines / CRLFs
  const byParagraph = raw
    .split(/\r\n\r\n|\n\n/)
    .map((s) => s.replace(/\r\n|\r/g, ' ').trim())
    .filter((s) => s.length > 8);

  if (byParagraph.length >= 2) return byParagraph;

  // Last resort: split on single newlines
  const byLine = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  return byLine.length >= 1 ? byLine : [raw.trim()];
}

// ─── Meal-time mapper ─────────────────────────────────────────
// TheMealDB categories → our MealTime union
const DINNER_LUNCH_CATS = new Set([
  'beef', 'chicken', 'lamb', 'pork', 'seafood', 'pasta',
  'vegetarian', 'vegan', 'goat', 'misc', 'unknown',
]);

function getMealTime(category) {
  const cat = (category || '').toLowerCase().trim();
  if (cat === 'breakfast')           return ['breakfast'];
  if (cat === 'dessert')             return ['snack'];
  if (cat === 'starter')             return ['snack', 'lunch'];
  if (cat === 'side')                return ['lunch', 'dinner'];
  if (DINNER_LUNCH_CATS.has(cat))    return ['lunch', 'dinner'];
  return ['dinner'];
}

// ─── Randomisers ──────────────────────────────────────────────
// Weighted effort score so most recipes land at 1-3 (everyday cooking)
function randomEffort() {
  const r = Math.random();
  if (r < 0.20) return 1; // Effortless
  if (r < 0.50) return 2; // Easy
  if (r < 0.78) return 3; // Moderate
  if (r < 0.93) return 4; // Involved
  return 5;               // Weekend Project
}

// Random cook time 15-45 minutes
function randomCookTime() {
  return Math.floor(Math.random() * 31) + 15; // 15..45
}

// ─── Tag builder ──────────────────────────────────────────────
function buildTags(meal) {
  const tags = new Set();
  if (meal.strCategory) tags.add(meal.strCategory.toLowerCase());
  if (meal.strArea && meal.strArea !== 'Unknown') tags.add(meal.strArea.toLowerCase());
  if (meal.strTags) {
    for (const t of meal.strTags.split(',')) {
      const clean = t.trim().toLowerCase();
      if (clean) tags.add(clean);
    }
  }
  return [...tags].slice(0, 6);
}

// ─── Description generator ────────────────────────────────────
// TheMealDB has no description field, so we synthesise a short one.
function buildDescription(meal) {
  const area = meal.strArea && meal.strArea !== 'Unknown' ? `${meal.strArea} ` : '';
  const cat  = (meal.strCategory || 'dish').toLowerCase();
  return `A classic ${area}${cat} dish — ${meal.strMeal}.`;
}

// ─── Full row mapper ──────────────────────────────────────────
// Transforms a raw TheMealDB meal object → our Supabase row shape.
function mapMealToRow(meal) {
  const ingredients = extractIngredients(meal);
  const steps       = extractSteps(meal.strInstructions);
  const effort      = randomEffort();
  const cookTime    = randomCookTime();
  const mealTimes   = getMealTime(meal.strCategory);
  const tags        = buildTags(meal);

  // cuisine: prefer the geographic area, fall back to category
  const cuisine =
    meal.strArea && meal.strArea !== 'Unknown'
      ? meal.strArea
      : meal.strCategory || null;

  // image: TheMealDB thumbnails always end in /preview, strip for full size
  const imageUrl = (meal.strMealThumb || '')
    .replace('/preview', '')
    || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';

  return {
    title:                meal.strMeal,
    description:          buildDescription(meal),
    image_url:            imageUrl,
    cuisine,
    meal_time:            mealTimes,
    prep_time_mins:       cookTime,
    effort_score:         effort,
    is_recipe_of_the_day: false,
    tags,
    ingredients_list:     ingredients,
    shopping_list:        [], // auto-categorisation handled by the app
    recipe_steps:         steps,
  };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🍽️   Food For You — TheMealDB Seed Script');
  console.log('─'.repeat(52));
  console.log(`📡  Supabase:  ${SUPABASE_URL}`);
  console.log(`🎯  Target:    ${TARGET_COUNT} unique recipes`);
  console.log('─'.repeat(52));
  console.log('');

  // ── Step 1: Fetch unique meals ─────────────────────────────
  console.log('📥  Fetching meals from TheMealDB...');
  console.log('');

  const seenIds = new Set();
  const meals   = [];
  let attempts  = 0;

  while (meals.length < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
    attempts++;

    let meal;
    try {
      const res  = await fetch(RANDOM_URL);
      const data = await res.json();
      meal = data?.meals?.[0];
    } catch (err) {
      console.warn(`   ⚠️  Fetch error on attempt ${attempts}: ${err.message}`);
      continue;
    }

    if (!meal) continue;

    if (seenIds.has(meal.idMeal)) {
      // Duplicate — skip silently and try again
      continue;
    }

    seenIds.add(meal.idMeal);
    meals.push(meal);
    console.log(`   [${String(meals.length).padStart(2, '0')}/${TARGET_COUNT}] ✓  "${meal.strMeal}" (${meal.strArea || meal.strCategory})`);
  }

  console.log('');
  console.log(`   Fetched ${meals.length} unique meals in ${attempts} API call${attempts !== 1 ? 's' : ''}.`);
  console.log('');

  if (meals.length === 0) {
    console.error('❌  No meals fetched. Check your internet connection and try again.');
    process.exit(1);
  }

  // ── Step 2: Insert into Supabase ──────────────────────────
  console.log('─'.repeat(52));
  console.log('💾  Inserting into Supabase...');
  console.log('');

  let inserted = 0;
  let failed   = 0;

  for (const meal of meals) {
    const row = mapMealToRow(meal);

    process.stdout.write(
      `   Inserting: "${row.title.padEnd(32).slice(0, 32)}"  `
    );

    const { error } = await supabase.from('recipes').insert(row);

    if (error) {
      console.log(`❌  ${error.message}`);
      failed++;
    } else {
      const spoonsLabel = ['', 'Effortless', 'Easy', 'Moderate', 'Involved', 'Weekend'][row.effort_score];
      console.log(`✓   🥄×${row.effort_score} ${spoonsLabel}  ·  ${row.prep_time_mins} min`);
      inserted++;
    }
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('');
  console.log('─'.repeat(52));
  console.log(`🏁  Seed complete!`);
  console.log(`    ✅  Inserted:  ${inserted}`);
  if (failed > 0) {
    console.log(`    ❌  Failed:    ${failed}`);
    console.log('');
    console.log('    Failed rows are likely caused by:');
    console.log('    • A title that already exists in the table');
    console.log('    • A schema constraint violation');
    console.log('    • Check your Supabase logs for details.');
  }
  console.log('─'.repeat(52));
  console.log('');
  console.log('   Pull-to-refresh on the Home screen to see the new recipes!');
  console.log('');
}

main().catch((err) => {
  console.error('');
  console.error('💥  Unexpected error:', err.message || err);
  console.error('');
  process.exit(1);
});
