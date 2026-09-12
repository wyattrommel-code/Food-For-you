import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanIngredientLineForPantry } from '@/lib/ingredientCleanForPantry';
import { USER_PANTRY_KEY } from '@/lib/pantry';

/**
 * Parses a grocery row into individual pantry ingredient names.
 * Lines like "🥩 Proteins: chicken breast, ground beef" → ["chicken breast", "ground beef"].
 * Lines without ":" are treated as a single ingredient.
 */
export function parseGroceryLineToPantryIngredients(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return [trimmed];
  }

  const afterColon = trimmed.slice(colonIdx + 1).trim();
  if (!afterColon) return [];

  return afterColon
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Serialize read-modify-write so rapid grocery checks do not drop updates. */
let pantryMergeChain: Promise<unknown> = Promise.resolve();

async function mergeIngredientsImpl(parsed: string[]): Promise<number> {
  const batchSeen = new Set<string>();
  const cleaned: string[] = [];
  for (const p of parsed) {
    const c = cleanIngredientLineForPantry(p);
    if (!c) continue;
    const l = c.toLowerCase();
    if (batchSeen.has(l)) continue;
    batchSeen.add(l);
    cleaned.push(c);
  }
  if (cleaned.length === 0) return 0;

  let existing: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(USER_PANTRY_KEY);
    const parsedJson = raw ? (JSON.parse(raw) as unknown) : [];
    existing = Array.isArray(parsedJson)
      ? parsedJson.filter((s): s is string => typeof s === 'string')
      : [];
  } catch {
    existing = [];
  }

  const lowerSeen = new Set(existing.map((s) => s.toLowerCase()));
  let added = 0;
  const next = [...existing];

  for (const t of cleaned) {
    const l = t.toLowerCase();
    if (lowerSeen.has(l)) continue;
    lowerSeen.add(l);
    next.push(t);
    added++;
  }

  if (added === 0) return 0;

  try {
    await AsyncStorage.setItem(USER_PANTRY_KEY, JSON.stringify(next));
    return added;
  } catch {
    return 0;
  }
}

/**
 * Merges new names into AsyncStorage `user_pantry` (JSON string array).
 * Case-insensitive deduping; preserves casing of newly added strings.
 * Returns how many new entries were added.
 */
export function mergeIngredientsIntoUserPantry(parsed: string[]): Promise<number> {
  if (parsed.length === 0) return Promise.resolve(0);

  const done = pantryMergeChain.then(() => mergeIngredientsImpl(parsed));
  pantryMergeChain = done.then(
    () => {},
    () => {}
  );
  return done;
}
