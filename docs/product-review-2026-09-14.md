# Mealsolved: planner update and product review

Reviewed September 14, 2026. Ratings below are my product judgments based on the repository, the current catalog and isolated browser tests. They are not customer ratings, cooking trials or evidence of product-market fit. Competitor research uses official documentation and Google Play listings.

## What is implemented

The Planner now lives in the bottom navigation. It opens to **Today**, showing today's meals before shopping shortcuts. **Week view** lets you select calendar months and their individual weeks, including weeks crossing a month or year boundary. Previous/next week and a return to the current week are available. The date follows the device's local calendar and refreshes after midnight or when the app returns to the foreground.

Recipes can still be added from a recipe detail or the planner, assigned to a meal or the day's general menu, moved, and removed. Planning later weeks does not replace earlier weeks.

Planner and Grocery expose day, week and entire-list shopping. Their scope is explicit:

| View | Includes |
| --- | --- |
| Day | Ingredients for recipes scheduled on the selected date |
| Week | Ingredients for that Monday–Sunday week, including boundary dates outside the selected month |
| All / Entire grocery list | All planned meals from today forward, plus manually added and existing household shopping items |

Adding, moving or removing planned meals changes the derived ingredient lists. A recipe scheduled twice creates two purchase requirements. Checking Monday's milk does not check next Monday's milk. Identical measured ingredient lines combine as, for example, `2 × 1 cup milk`; different measurements remain separate. The list shows which meals need each ingredient and how many occurrences are bought. This preserves quantities without guessing conversions between cups, cans and packages.

After every item in the selected list is checked, **Shopping complete!** asks whether to add the groceries to the pantry. **Yes** merges new ingredient names and preserves existing ones. **Not now** leaves the pantry alone. A later **Update pantry** action remains available. Revisiting the same completed purchases does not repeatedly prompt on that device. Failed pantry saves show an error and can be retried without losing checked groceries.

The five bottom destinations are Home, Planner, Grocery, Pantry and More. More contains Saved recipes, Create a recipe, Settings and Household. This gives the daily planning/shopping loop direct access while keeping the bar readable on small screens.

## Important boundaries

- The calendar and its purchase checks belong to the signed-in account. Existing household **extra shopping items** remain shared; this update does not turn calendars into a shared household planner. The Grocery screen explains that distinction.
- Pantry currently stores ingredient names on the device. It does not track amounts, expiry dates or automatic consumption, and it is not a cloud-synced household inventory. Its existing storage key is device-wide rather than account-specific; account-scoped migration should be a priority before promoting shared-device use.
- Having “milk” in the pantry does not establish whether enough milk remains. Planned shopping therefore does not automatically subtract pantry names.
- Manual and household extras are under All; this version does not assign an arbitrary manual item to a day or week.
- Calendar purchases require a connection. This is not a complete offline planner.
- The month browser supports future months too; it is not a rolling 30-day cutoff. Weeks currently start on Monday.
- Checking off an entire month's list can prompt a pantry update for that entire selection. Use Day or Week for the actual shopping trip, especially for perishables.

## What other interfaces informed the design

| Product pattern | What Mealsolved uses / what should come later |
| --- | --- |
| Paprika offers daily, weekly and monthly planning, date navigation, and grocery actions for a selected period. Its grocery workflow includes moving purchased items into Pantry. | Today and Week views, calendar-aware selection and an explicit pantry confirmation. Its richer quantities and expiry tracking are a later step. [Android guide](https://www.paprikaapp.com/help/android/) |
| Plan to Eat ties shopping dates to calendar dates and offers today, current week, upcoming periods and custom ranges. | Clearly labeled Day/Week/All scopes. Selecting dates is more predictable than silently replacing a list when a new plan is made. A custom shopping-trip range can come later. [Shopping date ranges](https://learn.plantoeat.com/help/change-your-shopping-list-date-range) |
| Samsung Food makes the planner accessible from bottom navigation and supports weekly scheduling across multiple weeks, saved plans and notes. | A dedicated Planner tab. Keep only Today and Week internally for now; reusable weeks and leftover notes would add more value than several extra tabs. [Planner guide](https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner) |

These are patterns adapted from documented interfaces, not a claim that I installed and usability-tested every competitor. A dense seven-column monthly calendar would make recipe names and controls difficult to use on narrow phones; selecting a month and working through one week at a time fits this audience better.

## Ratings for the requested features

These scores assess **potential value to your audience**, separately from current implementation maturity.

| Feature | Value / 10 | Feedback |
| --- | --- | --- |
| Plan a month one week at a time | 9 | Good fit for paydays, busy shifts and avoiding nightly decisions. Keep a fast return to today. |
| Today's meals as the default | 9 | Makes the planner useful after planning is finished. Opening the app should answer what to make next. |
| Day/week/entire groceries | 9.5 | The strongest connection between planning and action. Explicit dates and independent purchase checks are essential. |
| Ask before updating the pantry | 8.5 | Better control and fewer accidental changes. True inventory needs quantities and consumption tracking. |
| Planner in bottom navigation | 8 | Correct priority for repeat use. Saved recipes now takes an extra tap through More; watch that with testers. |

## Whole-app assessment

**Overall: 7/10 as a beta; 8.5/10 for the audience and product direction.** The clearest promise is “ordinary, affordable meals when you're tired.” The current breadth is enough to test that promise. It does not yet demonstrate the reliability or household coordination of a mature planning app.

| Area | Current score / 10 | Assessment and next improvement |
| --- | --- | --- |
| Easy recipe catalog | 7 | The shared catalog is 293 recipes, including the recent 12 shakes and 12 smoothies. That is 207 below your 500-recipe target. Prioritize distinct, cook-tested simple meals over filling the count with similar variations. |
| Recipe photos | 7 | AI illustrations provide consistent coverage, but they do not prove a cooked result. Compare each image against the ingredients and serving style, and collect real cooking photos over time. |
| Hungry Now, Pick For Me, Feeling Bold and refreshed discovery | 8 | Useful decision shortcuts for tired cooks. Preference filtering and variety matter more than adding further buttons. Measure repeats across sessions and whether people actually choose a suggestion. |
| Sweet treats | 8 | Separating desserts from Hungry Now makes sense. Hot/cold/quick options provide useful variety; test whether the suggestions fit those labels consistently. |
| Smoothies and shakes | 7.5 | A natural extension for snacks and quick breakfasts. Keep the difference between a dessert shake and a breakfast smoothie clear. |
| Search, preferences and first-time setup | 7.5 | A good foundation for relevant suggestions. Keep setup short and editable; disliked ingredients, available equipment, servings and time are practical priorities. Filtering must not be presented as an allergen guarantee. |
| Recipe detail and cooking flow | 7.5 | Instructions, saving and adding to the planner connect discovery to use. Further ratings require real cooking sessions: verify yields, actual time and beginner clarity. |
| Saved and personal recipes | 7.5 | Important for repeat cooking. Keep saved recipes easy to find from the planner; test the extra More tap before adding navigation complexity. |
| Calendar planner | 8 | Dates, future weeks and per-day meals are implemented. Reuse a week, leftover notes and per-planned-meal serving counts are the most useful missing refinements. |
| Shopping lists | 7.5 | Scope and purchase independence are strong improvements. Unit-aware totals, editable planned servings and custom shopping ranges remain gaps. |
| Household collaboration | 7 | Shared extra groceries are useful. Families will expect calendars and pantry state to be shared too; the current personal/shared distinction needs to remain visible. |
| Pantry and Cook What I Have | 6 | Ingredient-name matching can help use what's available. Device-local names are a limited inventory model: no amount, expiry or household sync. |
| Navigation and accessibility | 7.5 | Five tabs and wrapping controls work in browser checks at 320, 390 and 844 pixels. Native Android system bars, large text and a real shopping trip still need device testing. |
| Accounts, data protection and reliability | 7 | New purchase records enforce account ownership, including ownership of the referenced plan. Access-control tests passed. Existing device-wide pantry storage and full offline behavior need more work. This is not a full security certification. |

The existing Supabase advisor still reports leaked-password protection disabled; the new table introduced no additional advisor findings. The other reported items are informational policies on intentionally locked private household tables. [Supabase password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Closest competitors exceeding 10,000 Android downloads

Ranked by overlap with Mealsolved's intended experience, not by download volume. Bands were checked on September 14, 2026. Google Play shows lifetime Android download thresholds; these are not exact downloads, active users, subscribers or totals across iOS and web.

| Rank | Competitor | Google Play band | Where it competes | Practical lesson / Mealsolved opening |
| --- | --- | --- | --- | --- |
| 1 | [Samsung Food](https://play.google.com/store/apps/details?id=com.foodient.whisk) | 1M+ | Recipe discovery, meal planning and shared groceries | Strong overall overlap. Mealsolved should win on familiar food and fewer decisions rather than catalog size. |
| 2 | [Paprika Recipe Manager 3](https://play.google.com/store/apps/details?id=com.hindsightlabs.paprika.android.v3) | 500K+ | Recipes, calendar, groceries and pantry | Benchmark for the complete organizing loop. An immediately useful simple-meal catalog can reduce setup work for beginners. |
| 3 | [Plan to Eat](https://play.google.com/store/apps/details?id=com.plantoeat.mobile) | 100K+ | Calendar-first planning and automatically generated shopping | Closest planning workflow. Learn its date clarity and reusable planning without adding unnecessary setup. |
| 4 | [AnyList](https://play.google.com/store/apps/details?id=com.purplecover.anylist) | 1M+ | Household grocery collaboration, recipes and planning | Shopping reliability and clear sharing are the standard to meet. This competes directly with the husband/wife shopping scenario. |
| 5 | [Recipe Keeper](https://play.google.com/store/apps/details?id=com.tudorspan.recipekeeper) | 1M+ | Personal recipe collection, meal planning and groceries | A strong alternative for people organizing existing recipes. Mealsolved can serve people who need ideas first. |
| 6 | [SuperCook](https://play.google.com/store/apps/details?id=com.supercook.app) | 1M+ | Finding recipes from ingredients already available | Direct competition for Cook What I Have. Better pantry accuracy improves that feature more than adding another discovery mode. |

**Mealime is a special case:** its Google Play listing is also above 10,000 downloads, at 1M+, but its official website announces a shutdown on **October 21, 2026**. It remains a useful benchmark for a simple plan–shop–cook journey, and its users could be a future audience. It should not be treated as a stable long-term competitor. This suggests an opportunity, not guaranteed demand. [Official announcement banner](https://www.mealime.com/) · [Google Play listing](https://play.google.com/store/apps/details?id=com.mealime)

## Recommended priorities

1. Test the entire loop with 10–20 target users: choose meals, plan a week, shop, confirm pantry additions and cook. Record where they get stuck and whether shopping quantities are sufficient. One current account is not enough evidence to judge retention.
2. Make household scope coherent: shared planning and an account/household-scoped pantry, then quantities. Avoid implying that shared groceries already mean everything is shared.
3. Add servings per planned meal, copy/reuse a week, and simple notes such as “leftovers” or “eating out.” These address real planning work without an AI subscription.
4. Grow toward 500 with beginner-tested meals, honest active/total times and clear portions. Add “I made this” feedback and image-mismatch reporting before investing further in generated photography.
5. Keep the product focused. Nutrition coaching, social feeds and paid AI chat are lower priorities than a dependable meal-to-shopping workflow for exhausted people.

## Verification and release status

- 104 automated tests passed, including new date, leap-year, month-boundary and purchase-scope cases; TypeScript passed.
- Rollback-only database tests passed for owner access, cross-account rejection and purchase cleanup when a plan is removed.
- Isolated browser tests covered five-tab navigation, future-month saving/removal, day/week/all scopes, repeated ingredients, failed purchase saves, confirmation/decline/retry of pantry updates, duplicate prevention and midnight rollover. They used a fake account and did not edit the real user's meal plan.
- Responsive screenshots were checked at 320, 390 and 844 pixels. Physical Android navigation bars and gesture behavior remain a device acceptance check.
- The supporting purchase table is deployed. App changes are prepared for local testing; this work does not publish an Android release or start a paid build.

Local preview: http://localhost:8088/planner while the development server is running. Sign in normally to test your own planning data. Changes made there are real account changes; isolated QA data is not shown to you.
