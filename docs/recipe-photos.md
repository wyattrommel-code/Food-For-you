# Recipe photos without a paid photo API

The current library has **219 shared recipes with zero empty photo URLs**. The [historical shared-library checklist](photo-audit-2026-09-12.md) records all 169 assignments after completing the 21 missing photos. The subsequent [50 easy meals batch](easy-050.md) adds 50 more reviewed JPEGs. The public API verifier checks both sets and confirms anonymous requests expose no private recipes. Earlier pending lists in the first manifests are historical.

Apply photo overlays in order: `photo-manifest.json`, `photo-repairs-002.json`, then `photo-completion-003.json`. The API verifier composes them with the newest assignment winning. Never replay an old recipe import over a newer reviewed photo description.

The completion overlay adds 18 free Creative Commons photos and reuses 3 existing library assets. Its 21 delivery files total 1,660,967 bytes. The following 50-meal batch reuses 49 existing library images and one licensed Creative Commons photo, totaling 4,837,273 bytes. Illustrations generated in earlier work remain in use; no new generation or paid service was used for either batch.

## Free-photo workflow

1. Find an owned or explicitly reusable image. Public Facebook, Reddit and recipe-blog posts do not automatically grant photo reuse rights. Openverse can help find candidates, but verify the photographer's actual source page and license.
2. Inspect the dish against recipe ingredients and steps. Keep a visible serving-variation caption where presentation differs. Preserve creator watermarks. Record creator, source URL, license URL and modifications; retain share-alike licensing for adapted images.
3. Resize, preserving aspect ratio, to at most 900 pixels per side. Save a JPEG under 300 KB with a content-hash filename. Store only the optimized delivery copy in `assets/recipe-photos/`.
4. Add a new overlay manifest with the current full shared-recipe snapshot. Run `node scripts/recipe-photos.cjs --manifest data/recipes/photo-completion-003.json --sql` and `npm test`. Validation and SQL generation do not make network calls or database writes.
5. Commit and push assets, then run the same command with `--verify-remote` instead of `--sql` to check public JPEG bytes, MIME type and SHA-256.
6. Trial the guarded SQL with rollback, apply it, then run `node scripts/verify-recipe-api.cjs`. The update only changes the image URL and credited description. It rejects changed/private recipes and skips an already-applied result.

## Delivery

The existing testing app reads image URLs from Supabase. These data changes appear on refresh without a new Google Play binary. Image loading/fallback improvements are included in [Android 1.0.2 (8)](testing-release-1.0.2.md), now available to Google Play internal testers. No private user recipe was modified.

Files use immutable, content-named URLs in the existing public GitHub repository during testing. This introduces no subscription or photo-generation API. GitHub raw hosting is not a dedicated production image CDN; optimized files can later move to the existing Supabase Storage allowance without changing recipe content.
