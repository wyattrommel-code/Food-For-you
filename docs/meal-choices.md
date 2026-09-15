# Meal choices — September 14, 2026

Home’s Hungry Now, Sweet Treat, Pick For Me and Feeling Bold buttons open `/meal-choices?mode=…`. They no longer toggle inline results off. Each visit starts fresh choices, favoring recipes not recently shown for that account and mode.

The results page has Back and Refresh controls. Hold fixes a recipe in its current slot while Refresh replaces the unheld choices. Release makes it eligible for replacement again. Refresh is disabled when every displayed recipe is held. The heart saves a recipe to the existing favorites collection independently of Hold. Returning from a recipe detail page preserves the active choices and holds. Holds last for the open results page, rather than being stored as account preferences or favorites.

The selection logic preserves existing modes: Hungry Now excludes desserts and retains its 30/45-minute fallback; Feeling Bold uses challenge effort; Pick For Me shows one recipe; Sweet Treat reserves hot, cold and quick/easy slots. Preference exclusions remain authoritative, including for a held recipe. Unique assignments prioritize filling available slots and replacing unheld choices. Small pools show fewer choices and explain unavoidable repeats.

No added package, database migration, subscription or Play release.

Validation: TypeScript, 111 unit tests, and `scripts/verify-meal-choices-ui.cjs` against a local Expo preview. The browser check intercepts account requests and mutations, uses synthetic account data, and only reads the public recipe catalog. It covers all four home buttons, hold/release/refresh, reopening, favorites, returning from details, empty/small catalogs, loading failure and retry, 320/390/844-pixel layouts and dark mode. Native Android interactions still require phone review before release.
