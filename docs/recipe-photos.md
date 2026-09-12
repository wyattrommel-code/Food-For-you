# Recipe photos without a paid photo API

The default is an owned photo or a visually reviewed photo whose license permits reuse. No script generates images or spends API credits. Twelve illustrations created earlier in this work are reused as saved files. Opening a recipe does not generate an image.

## Current review

All 16 recent additions and three revised recipes were checked. Twelve recent recipes now have matched serving illustrations. The broken One-Pot Cheeseburger Pasta URL returned HTTP 403; its replacement is a representative photo of prepared Hamburger Helper by LWYang, licensed [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hamburger_Helper.jpg). It shows elbow macaroni, beef and cheese sauce. It is not a photo of this exact recipe. Credit, source, license and resize disclosure are included in the recipe description so existing app builds display them.

Four recent meals still need a close free match: Roasted Pepper and Hummus Pitas; Sausage, White Bean and Spinach Skillet; Tuna and Mixed Bean Lunch Bowls; Turkey and Hummus Cold Plates. The audit also found 12 older recipes with blank images. All are listed in `data/recipes/photo-manifest.json` with their status. No unsuitable stock photos were substituted. Tuna casserole, potato soup and bean/tuna stock candidates were rejected after visual inspection for clarity or ingredient mismatch.

Existing taco and buttered noodle photos load and show the right dishes, but differ in garnish or tortilla from the simplified recipes. They remain available while a closer free match is sought. The current source has a neutral placeholder; the unrelated salad reported in the installed app was not reproduced in this source. New `RecipeImage` handling keeps the placeholder visible during loading, uses it after failure, and resets on URL change across home, cards, detail, carousel and cooking views. This code requires the next app build; the photo URLs themselves update through the existing recipe API.

## Adding a free photo

1. Prefer a photo taken by us, an explicitly reusable creator submission, CC0, or a suitable image from a source such as [Pexels](https://www.pexels.com/license/) or Wikimedia Commons. A recipe being public on Facebook, Reddit or a cooking blog does not itself grant permission to reuse its photo.
2. Open the exact source page and verify its license. Download the permitted file once. Inspect the actual dish against our ingredients and steps; broad keywords are not enough. Record creator, source page, license URL, modifications and permission where relevant. For share-alike photos, preserve the required license for the image derivative.
3. Resize to at most 900 pixels on each side, preserving aspect ratio. Save as JPEG, strip camera metadata and aim for about 75–175 KB (hard review limit 300 KB). Use a filename ending in the first 12 characters of its SHA-256. Never overwrite a published filename with different bytes.
4. Add the file under `assets/recipe-photos/` and a reviewed entry to `data/recipes/photo-manifest.json`, including the current shared recipe snapshot. Preserve full recipe contents. Include attribution in `image.credit`; it is appended to the detail description for compatibility with existing builds. Generated illustrations must be disclosed as such and retain their prompt. Review remains manual: passing validation is not a license or visual review.
5. Run `node scripts/recipe-photos.cjs --sql` and `npm test`. This validates files and generates SQL locally, with no network or database changes. Commit and push the assets, then run `node scripts/recipe-photos.cjs --verify-remote` to verify every published JPEG byte for byte.
6. Review the generated SQL and trial it with `ROLLBACK` through trusted administrative access, then apply it. It locks recipes, checks the reviewed snapshots, updates only photo URL and credited description, rejects private or changed recipes, and skips an already-applied result. Run `node scripts/verify-recipe-api.cjs` afterwards. Historical recipe batches remain immutable; apply the photo overlay after recipe import/revisions, and do not force old imports over it.

## Hosting and budget

The 13 files total 1,687,367 bytes (about 1.6 MiB). They use stable, content-named HTTPS URLs in the existing public GitHub repository for the testing phase. This adds no photo subscription or paid API dependency. The app stores just `image_url`; no schema change or new storage credential is needed. `fix-images.js`, which assigned unrelated stock photos by broad keyword, is disabled.

GitHub raw hosting is not a dedicated production image CDN and has no app-specific delivery guarantee. Before a large public launch, use the existing Supabase Storage allowance if sufficient, or another explicitly approved host. The same optimized files and manifest can be migrated by changing URLs in a reviewed overlay. Check current storage and bandwidth allowances before expanding; do not silently enable paid overages. A phone photo of a cooked test meal is also a useful free replacement and validates the actual presentation.

There is no new Google Play binary or production release from this photo change. Refresh the recipe library to receive live photo data. Full camera originals are not bundled into the app; only the optimized delivery copies are committed. Built-in image generation was used for the existing 12 illustrations; prompts and provenance are recorded in the manifest. No more generation was requested after the budget concern.

## Validation of this delivery

All 47 tests passed, TypeScript completed without errors, and the Android production bundle exported successfully. All 13 public JPEGs returned HTTP success with the expected MIME type, byte length and SHA-256. The SQL was trialed with rollback, applied, and repeated without rewriting any recipe rows. The app's anonymous API verified all 19 reviewed recipe additions/revisions plus 13 photo overlays, with private recipe access returning zero rows.

Live totals after this update: 170 recipes, 169 shared, 13 newly assigned/repaired photos, 16 shared recipes still without photos (four recent and 12 older). This is an API/build verification; the installed Google Play binary was not replaced or device-tested in this delivery.
