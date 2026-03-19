// ============================================================
// clear-recipes.js — Food For You one-time utility script
//
// Deletes EVERY row in the public.recipes table.
//
// Usage:
//   node clear-recipes.js
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

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🗑️   clear-recipes.js');
  console.log('─'.repeat(46));
  console.log(`📡  Supabase: ${SUPABASE_URL}`);
  console.log('─'.repeat(46));

  // Count rows first so we can report exactly how many were removed
  const { count, error: countErr } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('❌  Could not count rows:', countErr.message);
    process.exit(1);
  }

  console.log(`\n   Found ${count} row(s) in public.recipes.`);

  if (count === 0) {
    console.log('   Nothing to delete. Exiting.\n');
    process.exit(0);
  }

  console.log('   Deleting...');

  // neq('id', '00000000-0000-0000-0000-000000000000') is the standard
  // Supabase pattern to delete all rows without a WHERE clause guard error.
  const { error: deleteErr } = await supabase
    .from('recipes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteErr) {
    console.error('❌  Delete failed:', deleteErr.message);
    process.exit(1);
  }

  console.log(`\n✅  Done — ${count} row(s) deleted from public.recipes.`);
  console.log('─'.repeat(46));
  console.log('');
}

main().catch((err) => {
  console.error('\n💥  Unexpected error:', err.message ?? err);
  process.exit(1);
});
