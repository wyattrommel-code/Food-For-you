# Mealsolved 1.0.2 testing release

Published to Google Play internal testing on September 12, 2026: **Android 1.0.2, version code 8**. Play Console confirms “Available to internal testers.” No production release or iOS binary was submitted.

## Live recipe content

The 21 remaining missing photos were completed first. The subsequent batch adds 50 simple meals with reviewed photos: 41 take at most 30 minutes, and nine longer oven meals disclose 5–15 minutes of active work. The shared catalog now contains **219 recipes with zero empty photo URLs**. The existing private recipe was preserved and remains inaccessible to anonymous users.

The 21 completion assets and 50 new assets were published and verified by JPEG MIME type, byte count and SHA-256 before the guarded database updates. All 169 historical assignments plus the 50 new recipes were verified through the app's public API. Recipes and their credited photos are available to the current testing app on refresh. The 500-meal launch target remains unmet.

No paid photo generation, photo API or new subscription was used for the recipe work. Existing library illustrations and explicitly licensed community photos carry visible provenance and serving-variation notes. Editorial and visual review does not mean the recipes were cook-tested. See [the 50-meal batch](easy-050.md) and [photo workflow](recipe-photos.md).

## App behavior

- Home now varies its carousels on pull-to-refresh and “New meal ideas.” Per-account recent history favors meals outside the last few leading cards, while bounded weights favor saved food preferences. Empty profiles get varied recommendations too. Small pools rotate available meals without relaxing exclusions.
- Diet, disliked ingredients and disliked cuisines filter the eligible recipe pool. Liked foods/cuisines, favorite tags, familiar meal styles, cooking time and effort influence ranking. Time and effort preferences are not strict exclusions. Toggling a favorite does not unexpectedly rearrange the carousel.
- A four-step, skippable setup asks about meal styles, foods to avoid, usual time/effort and household size. It appears once for accounts without a completion timestamp, including existing testers. Settings reopens the same answers, with a separate link to detailed ingredient/cuisine controls.
- Household size initializes recipe portions. Users can still adjust each recipe. Preference writes share one account-scoped state, serialize rapid edits and retain local changes while cloud synchronization is pending. Settings exposes synchronization status and retry. Local storage failure leaves setup open.
- Section headings wrap within available width; “See all” stays visible and moves below the heading on especially narrow layouts or large text. Bottom tabs reserve actual system-bar insets plus enough space for labels. Onboarding and standalone screens also protect their edges.
- Recipe photos no longer expose a hidden placeholder's “No recipe photo” label while the real photo is present. The serving slider announces its current portion count. Shared session initialization also avoids duplicate token-refresh requests across screens; web prerendering no longer starts browser-only auth storage.

The [research and public-code comparison](preference-onboarding-research.md) covers Mealime, Samsung Food, SideChef, KitchenOwl and Bluesky. The four-question flow is an explicit product decision informed by that evidence, not a copied survey or a statistically validated optimum.

## Database access

Migration `20260912214726_preference_onboarding` adds six fields to the existing preference table. Its authenticated owner-only policy remains in force. Transactional security checks prove own-account reads/saves, cross-account read/update denial, blocked ownership transfer, input constraints, anonymous isolation and compatibility with older clients updating the original preference fields. All fixtures were rolled back; the owner's preferences were not changed.

Existing security limitations are documented in [the security report](security/2026-09-12.md), including the unused legacy Spoonacular key requiring account-side revocation and the paid-plan-only leaked-password protection setting. No subscription upgrade was made.

## Verification and delivery

- 78 regression tests pass, including recipe/photo validation, preference filtering and weighting, repeat avoidance, queued and offline saves, stale-cloud protection, account isolation and portable dependency installation.
- TypeScript, source credential scanning and whitespace checks pass.
- Browser QA uses a simulated account and intercepts account writes; it reads the real 219-recipe public catalog. It checks setup completion, saved answers in Settings, reload behavior, refresh variety, loaded feed/detail photos and the one-person portion default.
- Browser layouts were inspected at 320×740, 360×800, 390×844, 844×390 and 768×1024. Insets of 0, 16, 24, 34 and 48 plus font scales 1, 1.3 and 2 are covered by layout-metric tests. This is not a physical-device test of gesture/three-button navigation or screen readers.
- Expo's Android JavaScript/Hermes export and full Android cloud build succeed. A clean npm 10.9.3 install/prebuild check also passes after fixing the [local decoder dependency link](security/npm-install-portability.md).
- Google Play accepted the signed Android App Bundle and published version code 8 to the existing internal testing track. It reports no previously supported devices lost. Its sole release warning concerns an absent deobfuscation mapping file for crash analysis; it did not block publication.

Reproduce with `npm test`, `npx tsc --noEmit`, `node scripts/check-source-credentials.cjs`, and `npx expo export --platform android --output-dir dist/android-check`. For browser QA, start `npx expo start --web --port 8088 --localhost` and run `node scripts/verify-ui.cjs` with Playwright installed or `PLAYWRIGHT_MODULE_PATH` set. Screenshots and test output stay in ignored `artifacts/ui-qa/` by default.

The successful [Expo build](https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/daf460ca-b62e-4b74-8a1c-fd77463314ac) uses source commit `e93ebb5fc788f0fc04f958fa135a5476ef473b31` and completed at `2026-09-12T22:44:16.143Z`. The uploaded AAB is 50,097,952 bytes with SHA-256 `6b2761f88cd4d08d4d9011d617f180c2b9dd4c1d30fe00aa149f6addc2dc9220`. Existing Android signing credentials were reused.

Existing testers can install the update through the test enrollment link provided by Play Console. Google says publication usually reaches the store within one hour, but can take longer. Installing 1.0.2 is required for the new onboarding, feed and layout behavior; recipe/photo data already reaches older builds on refresh. Physical-phone verification of the installed release remains outstanding.
