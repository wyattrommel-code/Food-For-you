import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryItem, categorizeIngredient } from '@/lib/groceryHelpers';
import { DbRecipe } from '@/lib/types';

// Bumped to v2 — GroceryItem shape changed (recipeIds[] + sourceNames[] replaces
// single recipeId/recipeTitle). Old v1 data is simply ignored on first load.
const STORAGE_KEY = 'grocery_list_v2';

async function read(): Promise<GroceryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GroceryItem[]) : [];
  } catch {
    return [];
  }
}

async function write(items: GroceryItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── Hook ─────────────────────────────────────────────────────

export function useGroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load persisted list on mount ──────────────────────────
  useEffect(() => {
    read().then((persisted) => {
      console.log('[useGroceryList] mount load — items from storage:', persisted.length);
      setItems(persisted);
      setLoading(false);
    });
  }, []);

  // ── Re-read storage on demand (call from useFocusEffect) ──
  const reload = useCallback(async () => {
    const persisted = await read();
    console.log('[useGroceryList] reload — items from storage:', persisted.length);
    setItems(persisted);
  }, []);

  // ── Core mutation helper — always writes before updating state ─
  const commit = useCallback(async (next: GroceryItem[]) => {
    await write(next);
    setItems(next);
  }, []);

  // ── Add all ingredients from a recipe ────────────────────
  const addRecipe = useCallback(
    async (recipe: Pick<DbRecipe, 'id' | 'title' | 'ingredients_list'>): Promise<'added' | 'already_added'> => {
      // Guard: Supabase can return array columns as a JSON string in some
      // client configurations. Parse it if needed before iterating.
      const rawList = recipe.ingredients_list;
      let ingredientsList: string[];
      if (Array.isArray(rawList)) {
        ingredientsList = rawList;
      } else if (typeof rawList === 'string') {
        try {
          ingredientsList = JSON.parse(rawList);
          console.log('[useGroceryList] addRecipe — ingredients_list was a string, parsed OK');
        } catch {
          console.warn('[useGroceryList] addRecipe — failed to parse ingredients_list string:', rawList);
          ingredientsList = [];
        }
      } else {
        ingredientsList = [];
      }

      console.log('[useGroceryList] addRecipe — recipe:', recipe.title);
      console.log('[useGroceryList] addRecipe — resolved ingredients count:', ingredientsList.length);
      console.log('[useGroceryList] addRecipe — current items in state:', items.length);

      // Build a mutable map keyed by normalized ingredient id for O(1) lookups.
      // We work on a copy so we never mutate state directly.
      const nextMap = new Map<string, GroceryItem>(items.map((i) => [i.id, { ...i }]));
      let anyChange = false;

      for (const name of ingredientsList) {
        if (typeof name !== 'string' || !name.trim()) continue;

        const normalizedId = name.trim().toLowerCase();

        if (nextMap.has(normalizedId)) {
          // Ingredient already in the list — just attach this recipe if not yet there.
          const existing = nextMap.get(normalizedId)!;
          if (!existing.recipeIds.includes(recipe.id)) {
            nextMap.set(normalizedId, {
              ...existing,
              recipeIds:   [...existing.recipeIds, recipe.id],
              sourceNames: [...existing.sourceNames, recipe.title],
            });
            anyChange = true;
            console.log('[useGroceryList] addRecipe — merged recipe into existing ingredient:', normalizedId);
          }
        } else {
          // Brand-new ingredient — create a row.
          nextMap.set(normalizedId, {
            id:          normalizedId,
            name:        name.trim(),
            recipeIds:   [recipe.id],
            sourceNames: [recipe.title],
            checked:     false,
            addedAt:     Date.now(),
            category:    categorizeIngredient(name),
          });
          anyChange = true;
        }
      }

      if (!anyChange) {
        console.log('[useGroceryList] addRecipe — all ingredients already present, returning already_added');
        return 'already_added';
      }

      const next = Array.from(nextMap.values());
      await commit(next);
      console.log('[useGroceryList] addRecipe — committed. Total items now:', next.length);
      return 'added';
    },
    [items, commit]
  );

  // ── Remove a recipe's contribution from every ingredient ──
  // • If the ingredient is only needed by this recipe → delete the row.
  // • If other recipes also need it → strip this recipe from the arrays,
  //   keeping the row intact for the remaining recipes.
  const removeRecipe = useCallback(
    async (recipeId: string) => {
      const next = items
        .map((item) => {
          if (!item.recipeIds.includes(recipeId)) return item; // unaffected
          const idx = item.recipeIds.indexOf(recipeId);
          return {
            ...item,
            recipeIds:   item.recipeIds.filter((_, i) => i !== idx),
            sourceNames: item.sourceNames.filter((_, i) => i !== idx),
          };
        })
        // Drop rows that no recipe needs any more
        .filter((item) => item.recipeIds.length > 0);

      await commit(next);
    },
    [items, commit]
  );

  // ── Toggle a single item's checked state ──────────────────
  const toggleItem = useCallback(
    async (id: string) => {
      await commit(
        items.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
    },
    [items, commit]
  );

  // ── Remove a single item ──────────────────────────────────
  const removeItem = useCallback(
    async (id: string) => {
      await commit(items.filter((i) => i.id !== id));
    },
    [items, commit]
  );

  // ── Clear only checked items ──────────────────────────────
  const clearChecked = useCallback(async () => {
    await commit(items.filter((i) => !i.checked));
  }, [items, commit]);

  // ── Manually add a single ingredient by name ─────────────
  // Uses recipeIds: ['manual'] so deduplication math never crashes.
  // If the same ingredient already exists (from a recipe or a previous manual
  // entry), the row is left untouched rather than duplicated.
  const addItem = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const normalizedId = trimmed.toLowerCase();

      if (items.some((i) => i.id === normalizedId)) {
        // Ingredient already in the list — nothing to do.
        return;
      }

      const newItem: GroceryItem = {
        id:          normalizedId,
        name:        trimmed,
        recipeIds:   ['manual'],
        sourceNames: ['Manually added'],
        checked:     false,
        addedAt:     Date.now(),
        category:    categorizeIngredient(trimmed),
      };

      await commit([...items, newItem]);
    },
    [items, commit]
  );

  // ── Clear entire list ─────────────────────────────────────
  const clearAll = useCallback(async () => {
    await commit([]);
  }, [commit]);

  // ── Check if a recipe has already contributed ingredients ─
  const hasRecipe = useCallback(
    (recipeId: string) => items.some((i) => i.recipeIds.includes(recipeId)),
    [items]
  );

  const checkedCount   = items.filter((i) => i.checked).length;
  const uncheckedCount = items.length - checkedCount;

  return {
    items,
    loading,
    checkedCount,
    uncheckedCount,
    reload,
    addItem,
    addRecipe,
    removeRecipe,
    toggleItem,
    removeItem,
    clearChecked,
    clearAll,
    hasRecipe,
  };
}
