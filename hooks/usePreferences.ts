import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { UserPreferences } from '@/lib/types';

// ─── Defaults ────────────────────────────────────────────────
const DEFAULT_PREFS: UserPreferences = {
  disliked_ingredients: [],
  disliked_cuisines: [],
  liked_ingredients: [],
  liked_cuisines: [],
};

// ─── Hook ─────────────────────────────────────────────────────
/**
 * Manages the logged-in user's Taste Engine preferences with a
 * two-layer persistence strategy:
 *
 *  READ  : AsyncStorage first (instant UI) → Supabase reconcile (source of truth)
 *  WRITE : Optimistic local state → AsyncStorage cache → Supabase upsert
 *
 * This means:
 *  • The UI never blocks on a network call.
 *  • Preferences survive offline.
 *  • Changes made on another device are pulled in on next load.
 */
export function usePreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const storageKey = userId ? `prefs:${userId}` : null;

  // ── fetchPreferences ────────────────────────────────────────
  // 1. Immediately hydrate from the local AsyncStorage cache.
  // 2. Fetch the authoritative copy from Supabase and reconcile.
  const fetchPreferences = useCallback(async () => {
    if (!userId || !storageKey) {
      setPreferences(DEFAULT_PREFS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Step 1 — local cache (instant, no network)
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        setPreferences(JSON.parse(cached));
      }

      // Step 2 — Supabase source of truth
      const { data, error: fetchErr } = await supabase
        .from('user_preferences')
        .select(
          'disliked_ingredients, disliked_cuisines, liked_ingredients, liked_cuisines'
        )
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchErr) {
        console.warn('[usePreferences] Supabase fetch failed:', fetchErr.message);
        // Network unavailable — keep local cache, don't show error to user
        return;
      }

      if (data) {
        const cloudPrefs: UserPreferences = {
          disliked_ingredients: data.disliked_ingredients ?? [],
          disliked_cuisines:    data.disliked_cuisines    ?? [],
          liked_ingredients:    data.liked_ingredients    ?? [],
          liked_cuisines:       data.liked_cuisines       ?? [],
        };
        // Cloud wins; update both state and local cache
        setPreferences(cloudPrefs);
        await AsyncStorage.setItem(storageKey, JSON.stringify(cloudPrefs));
      }
      // If data === null the user has no row yet — it will be created on first write.
    } catch (err) {
      console.warn('[usePreferences] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // ── updatePreferences ───────────────────────────────────────
  // Writes a partial update through all three layers in order.
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!storageKey || !userId) return;

      const previous = preferences;
      const merged   = { ...preferences, ...updates };

      // 1. Optimistic UI
      setPreferences(merged);
      setSyncError(null);

      try {
        // 2. Local cache
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));

        // 3. Supabase upsert (creates row if it doesn't exist yet)
        setSyncing(true);
        const { error: upsertErr } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id:              userId,
              disliked_ingredients: merged.disliked_ingredients,
              disliked_cuisines:    merged.disliked_cuisines,
              liked_ingredients:    merged.liked_ingredients,
              liked_cuisines:       merged.liked_cuisines,
              updated_at:           new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (upsertErr) {
          console.warn('[usePreferences] Supabase upsert failed:', upsertErr.message);
          setSyncError(upsertErr.message);
          // Don't rollback — local cache is still valid for offline use
        }
      } catch (err) {
        // Full failure — rollback optimistic update
        setPreferences(previous);
        setSyncError(err instanceof Error ? err.message : 'Failed to save preferences');
      } finally {
        setSyncing(false);
      }
    },
    [storageKey, userId, preferences]
  );

  // ── Convenience mutators ────────────────────────────────────

  const addDislikedIngredient = useCallback(
    (ingredient: string) => {
      const trimmed = ingredient.trim().toLowerCase();
      if (!trimmed || preferences.disliked_ingredients.includes(trimmed)) return;
      updatePreferences({
        disliked_ingredients: [...preferences.disliked_ingredients, trimmed],
      });
    },
    [preferences, updatePreferences]
  );

  const removeDislikedIngredient = useCallback(
    (ingredient: string) => {
      updatePreferences({
        disliked_ingredients: preferences.disliked_ingredients.filter(
          (i) => i !== ingredient
        ),
      });
    },
    [preferences, updatePreferences]
  );

  const addDislikedCuisine = useCallback(
    (cuisine: string) => {
      const trimmed = cuisine.trim().toLowerCase();
      if (!trimmed || preferences.disliked_cuisines.includes(trimmed)) return;
      updatePreferences({
        disliked_cuisines: [...preferences.disliked_cuisines, trimmed],
      });
    },
    [preferences, updatePreferences]
  );

  const removeDislikedCuisine = useCallback(
    (cuisine: string) => {
      updatePreferences({
        disliked_cuisines: preferences.disliked_cuisines.filter(
          (c) => c !== cuisine
        ),
      });
    },
    [preferences, updatePreferences]
  );

  const addLikedIngredient = useCallback(
    (ingredient: string) => {
      const trimmed = ingredient.trim().toLowerCase();
      if (!trimmed || preferences.liked_ingredients.includes(trimmed)) return;
      updatePreferences({
        liked_ingredients: [...preferences.liked_ingredients, trimmed],
      });
    },
    [preferences, updatePreferences]
  );

  const removeLikedIngredient = useCallback(
    (ingredient: string) => {
      updatePreferences({
        liked_ingredients: preferences.liked_ingredients.filter(
          (i) => i !== ingredient
        ),
      });
    },
    [preferences, updatePreferences]
  );

  const addLikedCuisine = useCallback(
    (cuisine: string) => {
      const trimmed = cuisine.trim().toLowerCase();
      if (!trimmed || preferences.liked_cuisines.includes(trimmed)) return;
      updatePreferences({
        liked_cuisines: [...preferences.liked_cuisines, trimmed],
      });
    },
    [preferences, updatePreferences]
  );

  const removeLikedCuisine = useCallback(
    (cuisine: string) => {
      updatePreferences({
        liked_cuisines: preferences.liked_cuisines.filter((c) => c !== cuisine),
      });
    },
    [preferences, updatePreferences]
  );

  return {
    preferences,
    loading,
    /** true while a Supabase write is in-flight */
    syncing,
    /** non-null if the last Supabase write failed (local cache still valid) */
    syncError,
    updatePreferences,
    addDislikedIngredient,
    removeDislikedIngredient,
    addDislikedCuisine,
    removeDislikedCuisine,
    addLikedIngredient,
    removeLikedIngredient,
    addLikedCuisine,
    removeLikedCuisine,
    /** Manually re-fetch from Supabase (called by useFocusEffect in screens) */
    refresh: fetchPreferences,
  };
}
