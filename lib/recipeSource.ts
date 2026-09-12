/** Only ordinary HTTPS source pages may be opened from a recipe. */
export function getRecipeSource(recipe: { source_url?: string | null; source_name?: string | null }) {
  if (!recipe.source_url) return null;
  try {
    const url = new URL(recipe.source_url);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return { url: url.href, label: recipe.source_name?.trim() || url.hostname };
  } catch {
    return null;
  }
}
