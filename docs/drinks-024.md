# 12 shakes and 12 smoothies

This batch adds 24 easy drinks, one serving each, with 2–6 measured ingredients and about 5 minutes total preparation. Recipes are editorially reviewed, not kitchen tested. Frozen fruit is an ingredient bought frozen; the recipes do not hide a home-freezing wait. Quick oats soften while other ingredients are measured. The brownie shake uses a ready-to-eat brownie.

The recipes contain original formulations and original instructions for familiar drinks. General blending ratios and common flavor combinations were researched using [Betty Crocker's chocolate milkshake method](https://www.bettycrocker.com/recipes/chocolate-milkshakes/7b7f7d41-4e3f-4bfa-b148-f29cc2a6b135) and [Good Food's mango-banana smoothie](https://www.bbcgoodfoodme.com/recipes/mango-and-banana-smoothie/). No publisher prose or photographs were copied. These research notes stay in the repository; recipe source fields are null and descriptions contain no source or photo-credit paragraphs, as requested.

Each drink has a separate, visually reviewed AI image. The batch JSON records each prompt, generation method, review, SHA-256 checksum and public URL. Only proportional resizing and JPEG compression were applied afterward. Assets use the existing public GitHub image host. No paid photo API, new subscription or EAS build was used.

## Compatibility and discovery

The installed Android 1.0.4 recipe detail screen dereferences meal-time metadata without checking for unknown labels. Consequently, shared drinks use supported labels: smoothies are breakfast/snack; shakes are dessert/snack. Both carry the `smoothies-and-shakes` tag. The updated category query matches either this tag or the new `smoothie` meal label, while retaining the public-or-current-owner visibility filter. New private recipes created with the smoothie meal label still appear.

Shakes also carry `treat-cold`, making them eligible for cold or quick sweet picks and excluded from the updated hungry selector. Smoothies remain eligible as breakfast/snack choices. The new category and selector behavior require the pending app update; the drink recipes themselves work with the installed version.

The `original-drinks` import kind narrowly allows absent publisher attribution only for explicitly original drinks with reviewed AI assets. Existing licensed-photo and sourced-recipe validation stays intact. Imports reject duplicate normalized titles with different content and never overwrite existing recipes.

## Recipes

Shakes: Simple Vanilla; Easy Chocolate; Strawberry Jam; Cookies and Cream; Peanut Butter; Chocolate Peanut Butter; Banana Vanilla; Caramel; Coffee Vanilla; Mint Chocolate Chip; Brownie Bite; Orange Cream.

Smoothies: Strawberry Banana; Mango Banana; Blueberry Yogurt; Mixed Berry; Pineapple Banana; Peach Vanilla Yogurt; Peanut Butter Banana Oat; Chocolate Banana; Spinach Mango; Apple Cinnamon Oat; Raspberry Banana; Orange Banana Yogurt.

## Verification

On September 14, 2026, the import passed a rollback rehearsal and then inserted exactly 24 recipes. The public API verified all 293 shared recipes, including an exact comparison proving the previous 269 rows were unchanged. Both signed-in-style and public category filters returned exactly the 24 new titles; anonymous private-recipe reads returned no rows.

All 24 public JPEG URLs matched their recorded byte counts and SHA-256 checksums (1,827,533 bytes total). The full 100-test suite, TypeScript check and credential scan passed. Browser QA opened all 24 drink details, confirmed loaded images and absent source/credit controls, checked the category and hidden internal badges, and saved/reloaded/moved/removed a smoothie in an isolated planner fixture. It also rechecked three distinct sweet picks and dessert exclusion from Hungry Now. No real account preferences or plans were changed by QA.

The data is live and the updated interface is available in the local preview. No new Android build or Play release was launched; that remains held for user review.
