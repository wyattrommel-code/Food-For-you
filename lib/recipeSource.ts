/** Separate known photo-credit suffixes without discarding any attribution text. */
export function splitRecipeDescription(description: string) {
  const marker = /(?:^|\s)(?=Representative photo:|Photo:|Serving illustration from the (?:existing )?Mealsolved image library\.)/.exec(description);
  if (!marker) return { summary: description, photoCredits: '' };
  return {
    summary: description.slice(0, marker.index).trimEnd(),
    photoCredits: description.slice(marker.index).trimStart(),
  };
}

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
