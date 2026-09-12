# Meal preferences, discovery and mobile layout

Mealsolved should ask four short, optional questions, save answers to the same account preferences used by Settings, and refresh recommendations with weighted randomness that avoids recent repeats. These are design recommendations for a small recipe catalog serving busy households, beginner cooks and people deciding what to eat after work. They do not depend on paid recommendation services or an AI subscription.

## Evidence from meal apps

| Product | Documented behavior | Application to Mealsolved |
|---|---|---|
| Mealime | Dislikes can be chosen at signup and edited in Settings → Eating preferences. Its documentation says edits apply to the next generated meal plan. | Ask early, keep one editable preference record, and make the moment changes take effect clear. |
| Samsung Food | Settings separates diet, avoidances, dislikes, household, cooking experience and favorite cuisines. The help page distinguishes fields used for filtering from fields not yet used for personalization. | Distinguish exclusions from ranking preferences. Every question shipped here should have a visible effect. |
| SideChef | Its FAQ describes recipe filtering by dietary preferences, available ingredients, cuisine and cooking time. Navigation exposes Food Preferences and a separate pantry. | Keep pantry entry separate from the introductory survey; time and familiar meal types are useful discovery controls. |

Sources: Mealime, [Choosing your dislikes](https://support.mealime.com/article/60-choose-your-dislikes), updated July 29, 2019; Samsung Food, [Managing Your Samsung Food Account](https://support.samsungfood.com/hc/en-us/articles/18365212922644-Managing-Your-Samsung-Food-Account), updated February 20, 2025; SideChef, [Frequently Asked Questions](https://www.sidechef.com/faq/), undated. Accessed September 12, 2026. These are publicly documented flows, not a claim that every current native-app signup screen was personally traversed.

Mealime's getting-started guide combines diet and dislike customization with two ways to choose meals: automatic suggestions or manual selection. Its auto-builder permits requesting another proposed plan, while individual recipe portions can be adjusted. That supports keeping a clear “new ideas” action alongside browsing instead of expecting onboarding to choose every dinner permanently. It does not establish how many onboarding questions maximize completion for Mealsolved. [Mealime, Getting Started Guide](https://support.mealime.com/article/151-getting-started-guide).

Samsung Food's account help is especially useful because it explicitly says diet, avoidances and dislikes filter recommendations, while cooking experience and favorite cuisines were not used for personalization when that page was updated. Its newer marketing promotes broader personalization, but marketing does not settle the behavior of each field in each version. The implementation here will document its own behavior directly and will not assume competitors' algorithms. [Samsung Food account help](https://support.samsungfood.com/hc/en-us/articles/18365212922644-Managing-Your-Samsung-Food-Account), [Samsung Food+](https://samsungfood.com/food-plus/).

Mealime's serving-size help describes household portions as an eating preference and supports up to six servings. Mealsolved already has per-recipe serving controls, so a household answer can initialize those controls rather than inventing a second meal-planning system. Portion scaling remains adjustable for leftovers, guests and unusually large appetites. [Mealime, Can I scale servings greater than 4?](https://support.mealime.com/article/98-can-i-scale-servings-greater-than-4).

## Public application code comparison

Public source was inspected at fixed commits on September 12, 2026. No code from these applications is copied into Mealsolved.

| Application and source | Observed implementation | Relevant comparison |
|---|---|---|
| KitchenOwl, Flutter, AGPL-3.0 | Onboarding uses a safe area, a constrained content column and scrollable content. Recipe rows give text flexible space beside neighboring controls. | Useful patterns for narrow screens and tablets. Its setup asks about its own household/server workflow, so its questions are not a template for a food-interest survey. |
| Bluesky, React Native, MIT | Bottom navigation reads safe-area insets; onboarding lays out a scroll area around measured header/footer space. Interest chips wrap and carry accessibility labels. | Closest technical reference for device insets, wrap-safe selection controls and persistent navigation. Social interests differ from food exclusions. |

KitchenOwl: commit `ab4530e1c788bb51ba61e3f26cc6af0c5bf42cda`, [onboarding page](https://github.com/TomBursch/kitchenowl/blob/ab4530e1c788bb51ba61e3f26cc6af0c5bf42cda/kitchenowl/lib/pages/onboarding_page.dart), [recipe page](https://github.com/TomBursch/kitchenowl/blob/ab4530e1c788bb51ba61e3f26cc6af0c5bf42cda/kitchenowl/lib/pages/recipe_page.dart), [repository and license](https://github.com/TomBursch/kitchenowl).

Bluesky: commit `ff10dbd355f2a87130b54c888a2a4ee4b6908e15`, [bottom bar](https://github.com/bluesky-social/social-app/blob/ff10dbd355f2a87130b54c888a2a4ee4b6908e15/src/view/shell/bottom-bar/BottomBar.tsx), [onboarding layout](https://github.com/bluesky-social/social-app/blob/ff10dbd355f2a87130b54c888a2a4ee4b6908e15/src/screens/Onboarding/Layout.tsx), [interest step](https://github.com/bluesky-social/social-app/blob/ff10dbd355f2a87130b54c888a2a4ee4b6908e15/src/screens/Onboarding/StepInterests/index.tsx). The interest screen includes a feature-gated requirement to choose an interest; therefore it would be inaccurate to describe all variants as freely skippable. Mealsolved's skip policy is its own deliberate choice.

## Proposed four-step flow

1. **What sounds good?** Multi-select familiar meal styles: tacos and burritos, pasta, burgers and sandwiches, chicken dinners, rice bowls, breakfast for dinner, soups and stews, and meatless meals. Each choice maps to actual recipe tags or ingredients used for ranking. No selection means an open mix.
2. **Anything you'd rather skip?** A single diet choice (anything, vegetarian, vegan), common disliked ingredients, and a custom ingredient field. Existing likes/dislikes remain editable. Exclusions take priority over likes. Ingredient filters are not an allergy certification: packaged ingredients and cross-contact cannot be verified by this catalog, so the screen must describe that limit briefly where it affects selection.
3. **What fits your day?** Usually 15, 30, 45 minutes, or no time preference, plus an option to favor easy recipes. These are ranking boosts so a small catalog does not disappear. “Hungry Now” still applies its explicit time cap; “Feeling Bold” remains an intentional request for a challenge.
4. **How many are you cooking for?** One through six, or no default. The answer initializes recipe serving controls and remains adjustable on each recipe.

Four steps is a product judgment based on covering four different decisions with small option sets. The sources do not provide a controlled trial proving this count is optimal. The owner reports being the only active tester; this does not establish the number of registered accounts, and there is no basis for claiming statistically validated conversion or satisfaction improvements. Review completion, skip reasons and whether meals feel relevant during testing before adding more questions.

Every step needs a visible progress label, Back and Continue, touch targets of at least 44–48 logical pixels, readable wrapping and a scrollable body. Skip records completion without inventing preferences or discarding previously saved ones. Returning from Settings starts with current answers. The final save should immediately affect the feed and Settings. Failed local persistence must keep the form open; a cloud failure after a successful local save must be shown as pending synchronization.

No demographic, weight, calorie-target, income or store-account question is necessary to improve these recipe recommendations. The current dataset cannot reliably deliver nutrition-target filtering, and asking for those details would promise more than it can support. Pantry inventory already has a dedicated workflow. Household size and meal-time availability cover the practical constraints relevant to this release.

## Preference and recommendation behavior

The existing Home carousels sort by affinity descending after a database query ordered by creation time. Equal scores preserve that incoming order. With empty preferences, repeatedly fetching the same catalog naturally reproduces the same leading cards. The action buttons use separate uniform shuffles, so their picks do not consistently use the available affinity score. These findings come from Mealsolved's local `hooks/useRecipes.ts` and `app/(tabs)/index.tsx` at commit `577ea7d`.

The replacement should first remove recipes excluded by diet, disliked ingredients or disliked cuisines. It should then sample without replacement using bounded positive weights derived from food likes, selected meal styles, easy/time preferences and favorite tags. A bounded boost helps preference matches without allowing one highly scored recipe to dominate every refresh. An empty profile still produces a randomized, useful feed.

Maintain recent leading-card history per account and per meal section. Prefer recipes outside the recent set; if a pool is too small, reuse the least-recent choices instead of relaxing exclusions or showing an empty screen. Prevent the same leading set when a different set exists. Do not reshuffle merely because a heart was toggled or a component rendered again. Pull-to-refresh and an explicit refresh button should produce a new ordering, including when the network fails but recipes are already loaded. Search continues to search all eligible recipes rather than only the visible carousel sample.

Home and Settings must consume a shared preference state. The previous hook created isolated copies in each screen, relied on focus refetches and allowed a cloud read to overwrite unsynchronized local edits. A shared account-scoped store should serialize saves, retain pending local changes, retry synchronization and reject stale read results. The account's existing row-level policy must continue to restrict reads and writes to its own `user_id`.

## Screen layout decisions

The supplied Android screenshot shows two concrete problems. The long lunchtime heading pushes “See all” beyond the right edge. The bottom labels reach the screen edge because the configured tab height does not allocate enough content space after top and bottom padding. Both are layout constraints, not missing recipe data.

Give heading text the remaining width, permit wrapping, and prevent its neighboring action from shrinking. For very narrow layouts and large text, place the action on a second row instead of clipping either label. Reuse this pattern in both feed-specific and general section headers. Shorten the tab label to “Pantry” while keeping its full accessibility name.

Use actual safe-area insets on iOS and Android, with explicit content height plus bottom inset/padding. Avoid a fixed iPhone bottom allowance, and avoid hiding the system bar as a workaround. Expo SDK 54 adopts Android edge-to-edge behavior, so content must be laid out inside the safe region. Expo's guidance and React Navigation's safe-area guidance both support using the inset API for custom navigation and content. [Expo, System bars](https://docs.expo.dev/develop/user-interface/system-bars/), [Expo, Safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/), [React Navigation, Supporting safe areas](https://reactnavigation.org/docs/handling-safe-area/), [Expo, Edge-to-edge display](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android).

The navigator already reserves its own tab-bar height. Screen scroll containers should not add that full height again; they need only ordinary trailing content space. Standalone screens and the onboarding footer need bottom insets because they are outside the tab navigator. Landscape left/right insets must also protect content from camera cutouts.

## Verification and practical limits

Automated checks should cover empty preferences, exclusions under repeated refresh, weighted selection, small pools, returning users, completed/skipped setup, queued saves, failed synchronization, user switching and stale fetches. Layout checks should include narrow phones, larger phones, landscape, tablets, large font scale and both gesture and three-button bottom inset sizes. A web viewport can validate wrapping and navigation bounds but cannot prove native Android system-bar behavior; a native build/device check remains separate evidence.

Recipe content updates are immediately visible through Supabase. JavaScript UI changes in this app require a new installed build unless a supported update mechanism is configured; pushing source to GitHub alone does not update the Google Play binary. Publication notes should distinguish those two delivery states.
