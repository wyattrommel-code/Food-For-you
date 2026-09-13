# Recipe-specific AI photo replacements

This overlay replaces all 68 current `licensed-photo` assignments in the 269-recipe shared catalog with original AI serving illustrations. Each image was generated from that recipe's ingredients and steps using built-in image generation, without a paid API integration or new subscription. Existing original AI/library assignments are retained.

The [manifest](../data/recipes/photo-ai-replacements-004.json) records the final prompt for each image, its saved asset path, visual review, prior photo provenance, and complete pre-update recipe snapshot. Optimized JPEGs live in `assets/recipe-photos/`; all 68 total 7,685,065 bytes (about 113 KB per image), with dimensions at most 900 × 900. Immutable filenames include a content hash.

Every image was visually compared with its ingredients, preparation and listed sides. Revisions corrected extra chicken in a sub, toasted marshmallows in a microwave dessert, unlisted yellow peppers, and the sausage-link serving count. These are illustrative servings, not photographs of tested recipe yields. The app's expandable photo credit says: “AI-generated serving illustration based on this recipe’s ingredients and steps. Actual results may vary.”

Only the image URL and the exact previous photo-credit suffix are replaced. Ingredients, instructions, servings, preferences and private recipes are untouched. Old source assets and attribution remain in their historical manifests. The guarded SQL rejects recipes changed since review and skips already-applied replacements.

Publish the assets before applying `data/recipes/photo-ai-replacements-004.sql`. Verify all remote JPEG bytes, MIME types and hashes with `node scripts/recipe-photos.cjs --manifest data/recipes/photo-ai-replacements-004.json --verify-remote`; trial the SQL with rollback before committing; then run `node scripts/verify-recipe-api.cjs`. Apply this overlay after the earlier photo overlays and recipe batches.

The testing app fetches the new URLs on refresh. No new Google Play binary or Expo build is needed for this photo update.

## Published verification — September 13, 2026 UTC

Published in GitHub commit `3d01976`. All 68 remote JPEGs matched their expected MIME types, byte sizes and SHA-256 hashes. The guarded SQL rollback trial passed, and the committed update matched all 68 complete expected recipe rows. The live shared catalog contains 269 recipes, zero missing image URLs, 68 new AI disclosures and zero remaining sourced-photo credits. Anonymous private-recipe access still returned zero rows.

All 92 tests, TypeScript checking and the source credential scan passed. Local Expo web QA used the live public recipe catalog and a simulated account: newly assigned photos in the home feed loaded after scrolling into view; four detail pages (boxed mac with hot dogs and peas, banana pudding, sausage and peppers, turkey apple cranberry wrap) loaded the exact new URLs. AI credits were collapsed initially and visible after expansion. No page errors occurred. This was browser verification, not a physical Android device test.
