import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  DbRecipe,
  Recipe,
  UserPreferences,
  MealTime,
  isRecipeBanned,
  recipeAffinityScore,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Weighted random selection — picks `count` unique items from an array
 * where each item has a weight proportional to its affinity score.
 */
function weightedSample<T extends { _score: number }>(
  items: T[],
  count: number
): T[] {
  if (items.length <= count) return [...items];

  const selected: T[] = [];
  const pool = [...items];

  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + Math.max(item._score, 1), 0);
    let rand = Math.random() * totalWeight;

    for (let i = 0; i < pool.length; i++) {
      rand -= Math.max(pool[i]._score, 1);
      if (rand <= 0) {
        selected.push(pool[i]);
        pool.splice(i, 1);
        break;
      }
    }
  }

  return selected;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useRecipes(
  userId: string | null,
  preferences: UserPreferences
) {
  const [allRecipes, setAllRecipes] = useState<DbRecipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const favsKey = userId ? `favs:${userId}` : null;

  // ── Fetch all recipes from Supabase + favorites from AsyncStorage ──
  const fetchData = useCallback(async () => {
    // ── DEBUG 1: env vars ────────────────────────────────────────
    console.log('[useRecipes] EXPO_PUBLIC_SUPABASE_URL =', process.env.EXPO_PUBLIC_SUPABASE_URL ?? '(undefined)');
    console.log('[useRecipes] EXPO_PUBLIC_SUPABASE_ANON_KEY present =', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

    try {
      setLoading(true);

      // ── DEBUG 2: about to fire query ─────────────────────────
      console.log('[useRecipes] Firing supabase.from("recipes").select("*")...');

      const recipesPromise = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      const favsPromise = favsKey
        ? AsyncStorage.getItem(favsKey).then((raw) =>
            raw ? (JSON.parse(raw) as string[]) : []
          )
        : Promise.resolve([] as string[]);

      const [recipesRes, favIds] = await Promise.all([
        recipesPromise,
        favsPromise,
      ]);

      // ── DEBUG 3: raw Supabase response ───────────────────────
      console.log('[useRecipes] recipesRes.error =', JSON.stringify(recipesRes.error));
      console.log('[useRecipes] recipesRes.status =', (recipesRes as any).status);
      console.log('[useRecipes] recipesRes.data length =', recipesRes.data?.length ?? 'null');
      console.log('[useRecipes] recipesRes.data (first item) =', JSON.stringify(recipesRes.data?.[0] ?? null));

      if (recipesRes.error) throw recipesRes.error;

      setAllRecipes(recipesRes.data ?? []);
      setFavoriteIds(new Set(favIds));

      // ── DEBUG 4: what was stored in state ────────────────────
      console.log('[useRecipes] allRecipes set — count:', recipesRes.data?.length ?? 0);
    } catch (err) {
      console.error('[useRecipes] FETCH ERROR:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [favsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derive favorite tags for affinity scoring ────────────────
  const favoriteTags = useMemo(() => {
    const tags: string[] = [];
    allRecipes.forEach((r) => {
      if (favoriteIds.has(r.id)) tags.push(...r.tags);
    });
    return tags;
  }, [allRecipes, favoriteIds]);

  // ── Filter: apply strict bans, then attach affinity score ────
  const visibleRecipes = useMemo((): Recipe[] => {
    // ── DEBUG 5: filter pipeline ─────────────────────────────
    console.log('[useRecipes] visibleRecipes memo — allRecipes.length:', allRecipes.length);
    console.log('[useRecipes] preferences:', JSON.stringify(preferences));

    const banned = allRecipes.filter((r) => isRecipeBanned(r, preferences));
    console.log('[useRecipes] banned count:', banned.length, banned.map((r) => r.title));

    const result = allRecipes
      .filter((r) => !isRecipeBanned(r, preferences))
      .map((r) => ({
        ...r,
        is_favorited: favoriteIds.has(r.id),
        _score: recipeAffinityScore(r, preferences, favoriteTags),
      }));

    console.log('[useRecipes] visibleRecipes.length:', result.length);
    console.log('[useRecipes] ROTD candidate:', result.find((r) => r.is_recipe_of_the_day)?.title ?? 'none');
    console.log('[useRecipes] dinner count:', result.filter((r) => r.meal_time.includes('dinner')).length);
    console.log('[useRecipes] lunch count:', result.filter((r) => r.meal_time.includes('lunch')).length);
    console.log('[useRecipes] breakfast count:', result.filter((r) => r.meal_time.includes('breakfast')).length);

    return result;
  }, [allRecipes, preferences, favoriteIds, favoriteTags]);

  // ── Recipe of the Day ────────────────────────────────────────
  const recipeOfTheDay = useMemo(
    () => visibleRecipes.find((r) => r.is_recipe_of_the_day) ?? null,
    [visibleRecipes]
  );

  // ── RNG: 3 weighted random recipes for a given meal time ─────
  const getRNGChoices = useCallback(
    (mealTime: MealTime): Recipe[] => {
      const eligible = visibleRecipes.filter((r) =>
        r.meal_time.includes(mealTime)
      );

      // Sort by affinity score descending so the top picks dominate the pool
      const scored = eligible
        .map((r) => ({ ...r, _score: r._score ?? 0 }))
        .sort((a, b) => b._score - a._score);

      return weightedSample(scored, 3);
    },
    [visibleRecipes]
  );

  // ── Carousel: recipes for a meal time (excludes ROTD) ────────
  const getCarouselRecipes = useCallback(
    (mealTime: MealTime): Recipe[] => {
      return visibleRecipes
        .filter(
          (r) =>
            r.meal_time.includes(mealTime) && !r.is_recipe_of_the_day
        )
        .sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    },
    [visibleRecipes]
  );

  // ── Toggle favorite (AsyncStorage) ───────────────────────────
  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!favsKey) return;

      const isFav = favoriteIds.has(recipeId);

      // Optimistic update
      const next = new Set(favoriteIds);
      isFav ? next.delete(recipeId) : next.add(recipeId);
      setFavoriteIds(next);

      try {
        await AsyncStorage.setItem(favsKey, JSON.stringify([...next]));
      } catch {
        // Rollback on storage error
        setFavoriteIds(favoriteIds);
      }
    },
    [favsKey, favoriteIds]
  );

  // ── Get single recipe by id (from local cache) ───────────────
  const getRecipeById = useCallback(
    (id: string): Recipe | null => {
      return visibleRecipes.find((r) => r.id === id) ?? null;
    },
    [visibleRecipes]
  );

  return {
    loading,
    error,
    recipeOfTheDay,
    visibleRecipes,
    getRNGChoices,
    getCarouselRecipes,
    toggleFavorite,
    getRecipeById,
    refresh: fetchData,
  };
}
