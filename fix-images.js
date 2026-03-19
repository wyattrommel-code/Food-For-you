// ============================================================
// fix-images.js — Assigns semantically correct images to recipes
//
// Usage:  node fix-images.js
//
// Fetches ALL recipes, matches each title against a keyword map
// (most-specific phrases checked first), then UPDATE each row
// with a precisely matched images.unsplash.com URL.
// ============================================================

const { readFileSync } = require('fs');
const { createClient }  = require('@supabase/supabase-js');

// ─── Load .env ────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    const result = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key   = trimmed.slice(0, eqIdx).trim();
      let   value = trimmed.slice(eqIdx + 1).trim().replace(/#.*$/, '').trim();
      value = value.replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    return result;
  } catch {
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

// ─── Keyword → Image map ──────────────────────────────────────
// Rules:
//  • Ordered from MOST specific (multi-word) to LEAST specific (single word)
//  • First match wins — put long phrases before their constituent words
//  • All keywords are matched case-insensitively against the recipe title
//
// Every URL is a direct static CDN link (no redirect service).
const KEYWORD_MAP = [
  // ── Multi-word phrases (checked first to avoid partial collisions) ──

  // Breakfast
  { kw: 'french toast',        url: 'https://images.unsplash.com/photo-1484723091739-30990ff50461?auto=format&fit=crop&w=800&q=80' }, // waffles / sweet breakfast
  { kw: 'peanut butter',       url: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=800&q=80'  }, // thick spread on toast
  { kw: 'pb&j',                url: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=800&q=80'  }, // same spread
  { kw: 'scrambled egg',       url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' }, // eggs in pan
  { kw: 'fried egg',           url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' }, // eggs
  { kw: 'cinnamon sugar',      url: 'https://images.unsplash.com/photo-1484723091739-30990ff50461?auto=format&fit=crop&w=800&q=80' }, // sweet toast / waffle
  { kw: 'frozen waffle',       url: 'https://images.unsplash.com/photo-1484723091739-30990ff50461?auto=format&fit=crop&w=800&q=80' }, // waffles

  // Sandwiches / subs
  { kw: 'grilled cheese',      url: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=800&q=80' }, // golden grilled cheese
  { kw: 'mac and cheese',      url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80'  }, // baked mac
  { kw: 'tuna melt',           url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // open-face sandwich
  { kw: 'sloppy joe',          url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' }, // beef on bun
  { kw: 'meatball sub',        url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // hero sandwich

  // Burgers & dogs
  { kw: 'smash burger',        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' }, // smash burger
  { kw: 'cheeseburger',        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' }, // cheeseburger
  { kw: 'hot dog',             url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' }, // street food / casual
  { kw: 'corn dog',            url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' }, // street fair food
  { kw: 'chili cheese',        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'  }, // BBQ / hearty

  // Pasta & skillets
  { kw: 'hamburger helper',    url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80'  }, // cheesy skillet pasta
  { kw: 'garlic butter pasta', url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // pasta
  { kw: 'tuna noodle',         url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // pasta bake
  { kw: 'butter noodle',       url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // noodles

  // Pizza
  { kw: 'party pizza',         url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' }, // pizza
  { kw: 'bagel pizza',         url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' }, // pizza

  // Chicken
  { kw: 'chicken tender',      url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'  }, // fried chicken strips
  { kw: 'chicken nugget',      url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'  }, // nuggets
  { kw: 'chicken noodle',      url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'  }, // soup bowl
  { kw: 'fish stick',          url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' }, // seafood dish

  // BBQ
  { kw: 'baby back rib',       url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'  }, // BBQ ribs rack
  { kw: 'pulled pork',         url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'  }, // BBQ pulled
  { kw: 'grilled steak',       url: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80'  }, // steak on grill

  // ── Single-word fallbacks (checked after multi-word phrases above) ──

  { kw: 'cereal',              url: 'https://images.unsplash.com/photo-1590301157284-26c85b8c7e52?auto=format&fit=crop&w=800&q=80' }, // bright breakfast bowl
  { kw: 'oatmeal',             url: 'https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?auto=format&fit=crop&w=800&q=80' }, // oat bowl with toppings
  { kw: 'pancake',             url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80' }, // stacked pancakes
  { kw: 'waffle',              url: 'https://images.unsplash.com/photo-1484723091739-30990ff50461?auto=format&fit=crop&w=800&q=80' }, // waffles
  { kw: 'toast',               url: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=800&q=80'  }, // avocado toast / bread
  { kw: 'egg',                 url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' }, // eggs

  { kw: 'burger',              url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' }, // burger
  { kw: 'hot dog',             url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' }, // casual / street
  { kw: 'bologna',             url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // deli sandwich

  { kw: 'hoagie',              url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // sub sandwich
  { kw: 'sandwich',            url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // sandwich
  { kw: 'sub',                 url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // sub
  { kw: 'club',                url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // club sandwich
  { kw: 'blt',                 url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // BLT sandwich
  { kw: 'ham',                 url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // deli sandwich
  { kw: 'turkey',              url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=800&q=80'  }, // deli sandwich

  { kw: 'pizza',               url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' }, // pizza
  { kw: 'nacho',               url: 'https://images.unsplash.com/photo-1582169505937-b9992bd01695?auto=format&fit=crop&w=800&q=80' }, // nachos
  { kw: 'quesadilla',          url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' }, // Tex-Mex

  { kw: 'mac',                 url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80'  }, // mac and cheese
  { kw: 'macaroni',            url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80'  }, // mac and cheese
  { kw: 'pasta',               url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // creamy pasta
  { kw: 'spaghetti',           url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // spaghetti
  { kw: 'noodle',              url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80'  }, // noodles
  { kw: 'ramen',               url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=800&q=80' }, // ramen bowl

  { kw: 'steak',               url: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80'  }, // seared steak
  { kw: 'ribeye',              url: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80'  }, // steak
  { kw: 'strip',               url: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80'  }, // NY strip
  { kw: 'ribs',                url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'  }, // ribs
  { kw: 'bbq',                 url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'  }, // BBQ

  { kw: 'soup',                url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'  }, // soup bowl
  { kw: 'chili',               url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'  }, // hearty stew/chili

  { kw: 'chicken',             url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'  }, // fried chicken
  { kw: 'tuna',                url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' }, // seafood / salmon
  { kw: 'fish',                url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' }, // seafood
];

// Shown whenever no keyword matches at all.
const FALLBACK_URL = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

// ─── Keyword matcher ──────────────────────────────────────────
function matchImage(title) {
  const lower = title.toLowerCase();
  for (const { kw, url } of KEYWORD_MAP) {
    if (lower.includes(kw)) {
      return { matched: kw, url };
    }
  }
  return { matched: null, url: FALLBACK_URL };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🖼️   Food For You — Semantic Image Fixer');
  console.log('─'.repeat(58));
  console.log(`📡  Supabase:    ${SUPABASE_URL}`);
  console.log(`🗂️  Keywords:    ${KEYWORD_MAP.length} mappings loaded`);
  console.log('─'.repeat(58));
  console.log('');

  // ── Step 1: Fetch all recipes ─────────────────────────────
  console.log('📥  Fetching all recipes...');

  const { data: recipes, error: fetchErr } = await supabase
    .from('recipes')
    .select('id, title')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('❌  Failed to fetch recipes:', fetchErr.message);
    process.exit(1);
  }

  console.log(`   Found ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}.\n`);
  console.log('─'.repeat(58));
  console.log('   #    Title                              Keyword → Image');
  console.log('─'.repeat(58));

  // ── Step 2: Match & update each recipe ───────────────────
  let updated  = 0;
  let fallbacks = 0;
  let failed   = 0;

  for (let i = 0; i < recipes.length; i++) {
    const { id, title } = recipes[i];
    const { matched, url } = matchImage(title);
    const num    = String(i + 1).padStart(2, '0');
    const label  = matched ? `"${matched}"` : '(fallback)';
    const titleS = title.padEnd(34).slice(0, 34);

    process.stdout.write(`   ${num}   ${titleS}  ${label.padEnd(20).slice(0, 20)}  → `);

    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ image_url: url })
      .eq('id', id);

    if (updateErr) {
      console.log(`❌  ${updateErr.message}`);
      failed++;
    } else {
      const photoId = url.match(/photo-[\w-]+/)?.[0] ?? '(url)';
      console.log(`✓  ${photoId}`);
      updated++;
      if (!matched) fallbacks++;
    }
  }

  // ── Summary ──────────────────────────────────────────────
  console.log('─'.repeat(58));
  console.log(`🏁  Done!`);
  console.log(`    ✅  Updated:   ${updated}`);
  console.log(`    🔀  Fallbacks: ${fallbacks}  (no keyword matched title)`);
  if (failed > 0) {
    console.log(`    ❌  Failed:    ${failed}`);
    console.log('       Check Supabase Dashboard → Logs for details.');
  }
  console.log('─'.repeat(58));
  console.log('');
  console.log('   Pull-to-refresh the Home screen to see the fixed images!');
  console.log('');
}

main().catch((err) => {
  console.error('');
  console.error('💥  Unexpected error:', err.message || err);
  process.exit(1);
});
