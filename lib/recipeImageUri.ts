/** Solid fill for empty `image_url` placeholders (no network). */
export const RECIPE_IMAGE_PLACEHOLDER_BG = '#1a1a1a';

/** Icon color on {@link RECIPE_IMAGE_PLACEHOLDER_BG}. */
export const RECIPE_IMAGE_PLACEHOLDER_ICON = '#333';

export function hasRecipeImageUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}

/**
 * Trimmed image URL, or `null` when missing/blank.
 * Use {@link RecipeImagePlaceholder} when this is null — do not load a remote fallback.
 */
export function recipeImageUri(url: string | null | undefined): string | null {
  const u = url?.trim();
  return u ? u : null;
}
