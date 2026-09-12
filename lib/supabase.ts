import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as SupabaseExtra;

function normalizeEnvString(value: string): string {
  const t = value.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** https://xxx.supabase.co — no trailing slash; fixes bad .env copies. */
function normalizeSupabaseUrl(url: string): string {
  let u = normalizeEnvString(url);
  u = u.replace(/\/+$/, '');
  return u;
}

function assertReachableSupabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `Invalid EXPO_PUBLIC_SUPABASE_URL. Expected https://YOUR_REF.supabase.co (check .env for typos, spaces, or missing https://).`
    );
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL must use https:// (http:// only for local Supabase).'
    );
  }
}

/** Inline env (dev / some release builds) + manifest `extra` (EAS production). */
const SUPABASE_URL = normalizeSupabaseUrl(
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
    (extra.supabaseUrl as string | undefined) ||
    ''
);

const SUPABASE_ANON_KEY = normalizeEnvString(
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (extra.supabaseAnonKey as string | undefined) ||
    ''
);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase is not configured. For Expo Go / dev: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file (use the anon or publishable key from Supabase → Settings → API, never service_role). For Play Store builds: add the same variables in expo.dev → Project → Environment variables (production).'
  );
}

assertReachableSupabaseUrl(SUPABASE_URL);

if (__DEV__) {
  try {
    console.log('[supabase] API host:', new URL(SUPABASE_URL).hostname);
  } catch {
    /* assertReachableSupabaseUrl already threw */
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
