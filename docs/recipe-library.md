# Recipe library, September 12, 2026

Ten new meals are live in Supabase project `yhfqlvblqlpacjdkltfi`. The library now has 164 rows: 163 shared recipes and one private recipe. No existing recipes were overwritten. The public API returned all ten new recipes with matching ingredients, steps and source links, and returned zero private recipes. A repeated import inserted zero rows.

There are 69 shared rows with effort <=2 and time <=30 minutes, up from 59. This is a candidate count, not a certified count of complete easy meals: older rows still include sides, desserts and preparation-only timings. The goal remains **500 distinct, reviewed easy meals**; at least 431 additional qualifying meals or meaningful revisions are needed. Do not count every shared recipe toward that goal.

## First batch

| Recipe | Estimated total minutes | Servings | Original source |
|---|---:|---:|---|
| Chickpea and Pickle Sandwiches | 15 | 2 | [College recipe shared on Reddit](https://www.reddit.com/r/EatCheapAndHealthy/comments/mv5h1s/chickpea_salad_sandwich_filling_recipe_this/) |
| Turkey and Hummus Cold Plates | 10 | 2 | [Single-parent dinner discussion](https://www.reddit.com/r/Parenting/comments/1txzrbo/single_parents_what_do_you_cook_for_dinner/) |
| Tuna and Mixed Bean Lunch Bowls | 15 | 2 | [12-hour-shift lunch discussion](https://www.reddit.com/r/mealprep/comments/z25vr9/best_lunches_for_12_hour_shifts/) |
| Sausage, White Bean and Spinach Skillet | 25 | 2 | [Budget Bytes](https://www.budgetbytes.com/italian-sausage-white-bean-skillet/) |
| Mild White Bean and Spinach Quesadillas | 25 | 2 | [Budget Bytes](https://www.budgetbytes.com/creamy-white-bean-and-spinach-quesadillas/) |
| Pepperoni and Pepper Pizzadillas | 20 | 2 | [Budget Bytes](https://www.budgetbytes.com/pizzadillas/) |
| Creamy Tortellini and Vegetable Soup | 25 | 2 | [Julia Pacheco](https://www.juliapacheco.com/creamy-tortellini-soup/) |
| Peanut Ramen with Edamame | 20 | 1 | [Budget Bytes](https://www.budgetbytes.com/spicy-peanut-butter-ramen/) |
| Roasted Pepper and Hummus Pitas | 10 | 2 | [Budget Bytes](https://www.budgetbytes.com/roasted-red-pepper-hummus-wraps/) |
| Pesto Couscous and Feta Bowls | 20 | 2 | [Jemma Morphet, Good Food](https://www.bbcgoodfood.com/recipes/10minute-couscous-salad) |

These are concise Mealsolved adaptations based on ingredient and cooking facts, with original wording. Two Reddit leads were meal ideas; their quantities were authored for this batch. No recipe is claimed to be creator-approved or cook-tested. Facebook posts remain unverified because public access returned a login page; none are counted here. No creator was contacted, and no service or subscription was purchased.

Every recipe has five to eight measured ingredients, one or two base servings, three or four steps, a source record and a reviewed distinction from existing recipes. `prep_time_mins` holds estimated **total** time, including cooking. Larger batches can take longer. Packaged ingredients and appliance times vary; follow package directions and check ingredient labels. Original publisher photography was not copied; new `image_url` values are intentionally empty.

Food safety checks use the [USDA temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) and [food-handling guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/steps-keep-food-safe). These checks do not turn estimated timings into cook tests.

## Files and repeatable import

`data/recipes/community-001.json` is the editorial record. It records source type, original timing, adaptations, equipment, audience evidence and duplicate review. The CSV contains only live recipe columns; the SQL companion is generated from the same validated rows. Neither generation nor tests write to the database.

1. Read the live schema with verbose column details and fetch current shared titles and ingredients before preparing another batch.
2. Review actual source quantities and cooking steps, complete meal portions, total time, equipment and ingredient-level duplication. Keep new images blank until separately verified.
3. Run `npm run recipes:check` for this batch, or `node scripts/recipe-batch.cjs data/recipes/<batch>.json` for another batch. Correct failed checks; they do not replace editorial review or cook tests.
4. Review the generated CSV, using PostgreSQL text-array values, and its SQL companion. Never import XLSX. The SQL applies rows atomically as a trusted administrator, skips an identical existing shared recipe and rejects an existing title with different contents. It never updates an existing row. The mobile public key cannot publish shared recipes.
5. After import, verify counts and run the public API check. `node scripts/verify-recipe-api.cjs` checks this first batch using only the app's public key and never logs it.

Source links are stored live in optional `source_url` and `source_name` columns. Existing testing builds can receive the recipes immediately after refreshing. The new source-link UI needs the next app build; it has not been submitted to Google Play.

## Cursor handoff

Continue in `C:\Users\wyatt\food-for-you`. Read this file and `docs/security/2026-09-12.md`. The first batch and live access policies are already applied; do not import duplicates or replay the old baseline schema. Use the two timestamped migrations as the current change record. Preserve the no-cost constraint, collect verified sources, and grow the easy-meal library in reviewed batches. Run `npm test`, TypeScript and Expo compatibility checks before preparing the next testing build. Do not claim a production release or 500 completed easy recipes.
