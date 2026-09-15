# Mealsolved 1.0.7 — planner and held meal choices

Release candidate: Android 1.0.7, version code 13, for the existing Google Play internal testing track. Publication is pending the signed build and Play Console rollout.

The home meal buttons now open a results page with Back and Refresh. Hold keeps a recipe in place while the other choices change. Favorites remain separate, and opening a recipe then returning preserves the current choices and holds. Sweet Treat keeps its hot, cold and quick/easy slots. Smoothies & Shakes is a home recipe category, and the sweet-treat button is shorter.

Planner now uses a compact scrolling week agenda with small recipe photos, month/date navigation, drag-and-drop between days, and meal actions shown on tap. Existing day/week/all groceries and pantry completion behavior remain intact. No database migration or new dependency is required.

Validation includes TypeScript, 111 unit tests, isolated browser checks for the planner and meal choices, and an Android/Hermes export. Physical Android touch and system-inset checks remain part of testing after installation.

The Expo dashboard showed $5 used of $45 build allowance before this release. Renewal remains canceled, Free is scheduled for September 28, and the upcoming bill estimate is $0. This build uses the existing allowance and signing credentials.

Tester enrollment: https://play.google.com/apps/internaltest/4701571696443292910
