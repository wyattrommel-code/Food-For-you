# Current recipe direction

Updated September 12, 2026. Work continues here in Codex using C:\Users\wyatt\food-for-you. Cursor handoffs are discontinued.

Prioritize American-style tacos, burgers, burritos, Hamburger Helper-style pasta, buttered noodles, oven chicken, boxed dinners and breakfast for dinner. Common prepared shortcuts are welcome. No paid recipe service or subscription is part of the workflow.

The live testing library now has 169 shared recipes and one private recipe. Six comfort meals were added and three basics simplified after the first ten community recipes. This is not yet 500 reviewed easy meals.

Allow meals ready in 30 minutes and longer meals with about 15 minutes of hands-on work. Show full cooking time honestly. Whole-package family portions are fine. Improve existing meals instead of adding renamed duplicates.

The authoritative records are in the actual project:
- docs/recipe-library.md
- data/recipes/comfort-002.json
- data/recipes/comfort-revisions-001.json
- docs/security/2026-09-12.md

Facebook is signed in; public recipe pages are accessible. Current detailed methods were checked on publisher websites. Supabase is connected. Spoonacular's API console was signed out; revocation of the exposed legacy key still needs confirmation.

The goal remains 500 distinct, useful, reviewed easy meals before production launch. Editorial checks do not replace cooking tests. Recipe data is live in testing; no new Google Play binary or production release was submitted.


## Comfort batch

| Recipe | Estimated total minutes | Active minutes | Servings | Source |
|---|---:|---:|---:|---|
| Boxed Beef Pasta with Green Beans | 30 | 15 | 4 | [Betty Crocker Kitchens](https://www.bettycrocker.com/recipes/green-bean-and-beef-pasta-supper/56a3af35-f2d7-4e97-a8e3-198cba211f1a) |
| Boxed Mac and Canned Chili Dinner | 25 | 10 | 3 | [r/EatCheapAndHealthy community meal idea](https://www.reddit.com/r/EatCheapAndHealthy/comments/cu0slr/) |
| Shortcut Biscuits and Sausage Gravy | 30 | 15 | 2 | [Beth Moncel, Budget Bytes](https://www.budgetbytes.com/country-sausage-gravy/) |
| Rotisserie Chicken and Stuffing Bake | 60 | 15 | 4 | [Julia Pacheco](https://www.juliapacheco.com/zucchini-stuffing-chicken-casserole/) |
| Four-Ingredient Ravioli Bake | 45 | 15 | 4 | [Beth Moncel, Budget Bytes](https://www.budgetbytes.com/baked-ravioli/) |
| Chicken and Potato Enchilada Skillet | 55 | 15 | 2 | [Julia Pacheco](https://www.juliapacheco.com/enchilada-potato-skillet/) |

All six have three steps and four to seven measured ingredients. Package directions take priority for the exact product bought. Longer meals are not tagged quick. The potato skillet estimate allows more simmering time because source readers reported firm potatoes at the shorter time.

## Existing recipes simplified in place

| Recipe | Ingredient lines, before → after | Steps, before → after |
|---|---:|---:|
| Ground Beef Tacos | 14 → 7 | 9 → 3 |
| Buttered Garlic Egg Noodles | 8 → 5 | 9 → 3 |
| One-Pot Cheeseburger Pasta | 14 → 9 | 7 → 4 |

Tacos now use mild packet seasoning and measured toppings. Noodles use garlic powder and grated cheese. Cheeseburger pasta requires no chopping and shows a 30-minute total. The revisions preserve IDs, favorites, ownership and existing image URLs; no extra rows were created. They simplify existing Mealsolved content without claiming a new external source.

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


## Editorial status and sources

All 16 additions and three revisions are editorially reviewed, **not cook-tested**. New recipes have blank image fields. Concise original wording uses cooking facts and attributed community ideas; no publisher photos or stories were copied. Attribution does not claim permission or endorsement.

[Julia Pacheco's public Facebook page](https://www.facebook.com/JuliaPachecoYouTube/) was accessible in the browser. Methods in this batch were verified on her website; no Facebook-only recipe is counted. No messages, posts or comments were sent.

Safety endpoints were checked against [FoodSafety.gov's temperature chart](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures). Timings remain estimates. These recipes do not claim nutritional completeness. Whole-package batches may be simpler to cook and portion than using fractional packets from the serving slider.

There are 72 shared rows with effort <=2 and time <=30 minutes, plus three new meals with little active work and longer total times. The 72 is a candidate count; older rows include sides, desserts and preparation-only timings. Do not count all 169 shared rows as verified easy meals.

## Repeatable import and validation

The editorial records are in data/recipes/community-001.json, comfort-002.json and comfort-revisions-001.json. The first two generate CSV and SQL from the same validated rows. The revisions include complete before/after snapshots and generate guarded SQL updates. Generation and local tests never write to Supabase.

1. Inspect live column details and current shared titles and ingredients before another batch. Never import XLSX.
2. Verify quantities, complete portions, equipment, active and total time, and meaningful differences. Keep unverified images blank.
3. Run npm run recipes:check. A new batch can use batch_kind: easy-comfort for portions up to six and total times up to 75 minutes; meals longer than 30 minutes require at most 15 active minutes, an explicit description of both times, and no quick tag. The default quick batch remains stricter.
4. Review and trial SQL with ROLLBACK before applying. Imports skip identical shared titles and reject conflicting contents. Revisions lock rows and reject changes since review. Both require trusted administrative access; the mobile public key cannot publish shared recipes.
5. Run node scripts/verify-recipe-api.cjs after import. It compares all 19 reviewed rows through the public API without printing credentials and verifies private recipes are hidden.

Validation: 38 tests, TypeScript, Android export and public API checks. Repeated additions and revisions made zero changes. Database access policies remain in effect.

The effort label in source changed from Quick to Easy so difficulty is separate from cooking time. This and source-link display require the next app build. The existing testing app can receive the recipe data after refreshing. No Google Play build was submitted.

Work in C:\Users\wyatt\food-for-you from this task. Read docs/security/2026-09-12.md for applied security fixes; do not replay the old baseline schema. The remaining credential action is to confirm revocation of the old key in [Spoonacular's API console](https://spoonacular.com/food-api/console).
