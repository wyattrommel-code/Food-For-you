import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { discoveryBonus, weightedShuffle } from '@/lib/discovery';
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
// ─── Hook ─────────────────────────────────────────────────────

export function useRecipes(
  userId: string | null,
  preferences: UserPreferences
) {
  const [allRecipes, setAllRecipes] = useState<DbRecipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favsKey = userId ? `favs:${userId}` : null;

  // ── Fetch all recipes from Supabase + favorites from AsyncStorage ──
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const runQuery = () =>
        supabase
          .from('recipes')
          .select('*')
          .eq('is_user_created', false)
          .order('created_at', { ascending: false });

      const favsPromise = favsKey
        ? AsyncStorage.getItem(favsKey).then((raw) =>
            raw ? (JSON.parse(raw) as string[]) : []
          )
        : Promise.resolve([] as string[]);

      let [recipesRes, favIds] = await Promise.all([
        runQuery(),
        favsPromise,
      ]);

      // PGRST303 / JWT expired: refresh session once and retry (e.g. after app resume).
      const msg = recipesRes.error?.message ?? '';
      const code = (recipesRes.error as { code?: string } | null)?.code;
      if (
        recipesRes.error &&
        (code === 'PGRST303' || msg.includes('JWT expired'))
      ) {
        const { data, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && data.session) {
          recipesRes = await runQuery();
        } else {
          await supabase.auth.signOut();
          recipesRes = await runQuery();
        }
      }

      if (recipesRes.error) throw recipesRes.error;

      setAllRecipes(recipesRes.data ?? []);
      setFavoriteIds(new Set(favIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    return allRecipes
      .filter((r) => !isRecipeBanned(r, preferences))
      .map((r) => ({
        ...r,
        is_favorited: favoriteIds.has(r.id),
        _score: recipeAffinityScore(r, preferences, favoriteTags) + discoveryBonus(r, preferences),
      }));
  }, [allRecipes, preferences, favoriteIds, favoriteTags]);

  // ── RNG: 3 weighted random recipes for a given meal time ─────
  const getRNGChoices = useCallback(
    (mealTime: MealTime): Recipe[] => {
      const eligible = visibleRecipes.filter((r) =>
        r.meal_time.includes(mealTime)
      );

      // Sort by affinity score descending so the top picks dominate the pool
      const scored = eligible.map((r) => ({
        ...r,
        _score: r._score ?? 0,
      }))
        .sort((a, b) => b._score - a._score);

      return weightedShuffle(scored).slice(0, 3);
    },
    [visibleRecipes]
  );

  // ── Carousel: recipes for a meal time ─────────────────────────
  const getCarouselRecipes = useCallback(
    (mealTime: MealTime): Recipe[] => {
      return visibleRecipes
        .filter((r) => r.meal_time.includes(mealTime))
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

  const isFavorited = useCallback(
    (recipeId: string) => favoriteIds.has(recipeId),
    [favoriteIds]
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
    refreshing,
    error,
    visibleRecipes,
    getRNGChoices,
    getCarouselRecipes,
    toggleFavorite,
    isFavorited,
    getRecipeById,
    refresh: fetchData,
  };
}
