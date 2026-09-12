import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USER_PANTRY_KEY } from '@/lib/pantry';

export function useUserPantry() {
  const [pantryNames, setPantryNames] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_PANTRY_KEY);
      const next = raw ? (JSON.parse(raw) as string[]) : [];
      setPantryNames(Array.isArray(next) ? next.filter((s) => typeof s === 'string') : []);
    } catch {
      setPantryNames([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next: string[]) => {
    setPantryNames(next);
    try {
      await AsyncStorage.setItem(USER_PANTRY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleName = useCallback(
    (name: string) => {
      const key = name.trim();
      if (!key) return;
      const lower = key.toLowerCase();
      const has = pantryNames.some((n) => n.toLowerCase() === lower);
      const next = has
        ? pantryNames.filter((n) => n.toLowerCase() !== lower)
        : [...pantryNames, key];
      void persist(next);
    },
    [pantryNames, persist]
  );

  const removeName = useCallback(
    (name: string) => {
      const lower = name.toLowerCase();
      void persist(pantryNames.filter((n) => n.toLowerCase() !== lower));
    },
    [pantryNames, persist]
  );

  const clearAll = useCallback(() => {
    void persist([]);
  }, [persist]);

  const addCustom = useCallback(
    (raw: string) => {
      const key = raw.trim();
      if (!key) return;
      const lower = key.toLowerCase();
      if (pantryNames.some((n) => n.toLowerCase() === lower)) return;
      void persist([...pantryNames, key]);
    },
    [pantryNames, persist]
  );

  return {
    pantryNames,
    loaded,
    load,
    persist,
    toggleName,
    removeName,
    clearAll,
    addCustom,
  };
}
