# Recipe-specific AI photo replacements

This overlay replaces all 68 current `licensed-photo` assignments in the 269-recipe shared catalog with original AI serving illustrations. Each image was generated from that recipe's ingredients and steps using built-in image generation, without a paid API integration or new subscription. Existing original AI/library assignments are retained.

The [manifest](../data/recipes/photo-ai-replacements-004.json) records the final prompt for each image, its saved asset path, visual review, prior photo provenance, and complete pre-update recipe snapshot. Optimized JPEGs live in `assets/recipe-photos/`; all 68 total 7,685,065 bytes (about 113 KB per image), with dimensions at most 900 × 900. Immutable filenames include a content hash.

Every image was visually compared with its ingredients, preparation and listed sides. Revisions corrected extra chicken in a sub, toasted marshmallows in a microwave dessert, unlisted yellow peppers, and the sausage-link serving count. These are illustrative servings, not photographs of tested recipe yields. The app's expandable photo credit says: “AI-generated serving illustration based on this recipe’s ingredients and steps. Actual results may vary.”

Only the image URL and the exact previous photo-credit suffix are replaced. Ingredients, instructions, servings, preferences and private recipes are untouched. Old source assets and attribution remain in their historical manifests. The guarded SQL rejects recipes changed since review and skips already-applied replacements.

Publish the assets before applying `data/recipes/photo-ai-replacements-004.sql`. Verify all remote JPEG bytes, MIME types and hashes with `node scripts/recipe-photos.cjs --manifest data/recipes/photo-ai-replacements-004.json --verify-remote`; trial the SQL with rollback before committing; then run `node scripts/verify-recipe-api.cjs`. Apply this overlay after the earlier photo overlays and recipe batches.

The testing app fetches the new URLs on refresh. No new Google Play binary or Expo build is needed for this photo update.
