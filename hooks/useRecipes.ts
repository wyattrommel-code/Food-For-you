import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { discoveryBonus, weightedShuffle } from '@/lib/discovery';
import {useFocusEffect} from 'expo-router';
import {useRecipeDislikes} from '@/context/RecipeDislikesContext';
import {useRecipeCatalog} from '@/context/RecipeCatalogContext';
import {matchesAudience,audienceScore} from '@/lib/householdPlanning';
import {
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
  preferences: UserPreferences,
  audience?: {profiles:UserPreferences[];ready:boolean;group:boolean},
  includePrivate=false
) {
  const catalog=useRecipeCatalog();
  const dislikes=useRecipeDislikes();
  const allRecipes=useMemo(()=>catalog.rows.filter(r=>!r.is_user_created||(includePrivate&&r.user_id===userId)),[catalog.rows,includePrivate,userId]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const favsKey = userId ? `favs:${userId}` : null;
  const loadFavorites=useCallback(async()=>{
    try{
      const raw=favsKey?await AsyncStorage.getItem(favsKey):null;
      const ids=raw?JSON.parse(raw):[];
      setFavoriteIds(new Set(Array.isArray(ids)?ids:[]));
    }catch{setFavoriteIds(new Set());}
  },[favsKey]);
  useFocusEffect(useCallback(()=>{void loadFavorites();},[loadFavorites]));
  const fetchData=useCallback(async()=>{await Promise.all([catalog.refresh(),loadFavorites()]);},[catalog.refresh,loadFavorites]);

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
    if(!dislikes.ready||(audience&&!audience.ready))return [];
    return allRecipes
      .filter(r=>!dislikes.ids.has(r.id))
      .filter((r) => audience?.group?matchesAudience(r,audience.profiles):!isRecipeBanned(r, preferences))
      .map((r) => ({
        ...r,
        is_favorited: favoriteIds.has(r.id),
        _score: audience?.group?audienceScore(r,audience.profiles):recipeAffinityScore(r, preferences, favoriteTags) + discoveryBonus(r, preferences),
      }));
  }, [allRecipes, preferences, favoriteIds, favoriteTags,dislikes.ids,dislikes.ready,audience?.ready,audience?.group,audience?.profiles]);

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
    loading: !dislikes.ready || !catalog.loaded && (catalog.refreshing || !catalog.error),
    refreshing: catalog.refreshing,
    error: catalog.loaded ? null : catalog.error,
    visibleRecipes,
    getRNGChoices,
    getCarouselRecipes,
    toggleFavorite,
    isFavorited,
    getRecipeById,
    refresh: fetchData,
    invalidateCatalog: catalog.invalidate,
  };
}
