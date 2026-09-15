# Planner and home redesign — September 14, 2026

The planner now opens as a vertical week agenda. Dates and small recipe cards are the primary content. A day’s plus button opens recipe search; tapping a recipe opens its actions. Grocery scopes are in the cart menu. The week heading opens a month calendar, while arrows move one week at a time.

Use the small handle on a recipe card to drag it to another day in the visible week. The agenda scrolls near its upper and lower edges. Dropping outside the agenda cancels the move. A move preserves the meal slot. For another week or month, or for assistive technology, use **Move or change meal** in the recipe’s actions. Existing saved plans and shopping progress retain their IDs.

The home sweet-treat button has no description. Smoothies & Shakes now appears as a recipe carousel with the other categories. Discovery recognizes both the `smoothie` meal type and the existing `smoothies-and-shakes` tag; preferences and recent-recipe rotation still apply.

No database migration, additional dependency or subscription is required. Published to Google Play internal testing in [version 1.0.7](testing-release-1.0.7.md).

## Verification

- `npx tsc --noEmit`
- `npm test`
- `node scripts/verify-month-planner-ui.cjs` with an Expo web server at `http://localhost:8090`. `UI_QA_URL`, `UI_QA_DIR`, and `PLAYWRIGHT_MODULE_PATH` can override defaults.

The browser check reads the public recipe catalog but intercepts account API traffic and all mutations. It uses a synthetic account and temporary plans; it does not change a real user’s plans, groceries, or pantry.

Coverage: day-to-day dragging and auto-scroll, canceling a drop outside the agenda, failed move preservation, recipe-page scheduling, calendar month boundaries, meal slots, deletion, 320/390/844-pixel layouts, daily/weekly/all grocery links, pantry completion/retry/deduplication, local-date rollover, home category placement, and light/dark screenshots. Native Android touch gestures and system insets remain part of internal tester review on physical devices.
