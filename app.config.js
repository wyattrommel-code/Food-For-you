/**
 * Dynamic Expo config. Expo merges `app.json` into `config` when you export a
 * function (satisfies expo-doctor). Supabase values go into `extra` so they are
 * embedded in the native manifest for release builds.
 *
 * Local: `.env` with EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 * EAS:   Dashboard → Environment variables (production/preview), and/or
 *        `eas.json` → build.<profile>.env (never commit service_role keys)
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
});
