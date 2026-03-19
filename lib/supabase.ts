import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Replace with your project's values from supabase.com/dashboard ──────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_ANON_KEY';
// ─────────────────────────────────────────────────────────────────────────────

// ── DEBUG: log resolved values at module load time ───────────
console.log('[supabase.ts] SUPABASE_URL =', SUPABASE_URL);
console.log('[supabase.ts] ANON_KEY present =', SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY' && !!SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
