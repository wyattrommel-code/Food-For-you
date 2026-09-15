# Mealsolved 1.0.7 — planner and held meal choices

Published to the existing Google Play internal testing track on September 15, 2026 at 12:03 AM America/Denver. Play Console confirms **Available to internal testers** for Android 1.0.7, version code 13. No production or iOS release was submitted. Google advises that changes usually appear on devices within one hour, but can take longer.

The home meal buttons now open a results page with Back and Refresh. Hold keeps a recipe in place while the other choices change. Favorites remain separate, and opening a recipe then returning preserves the current choices and holds. Sweet Treat keeps its hot, cold and quick/easy slots. Smoothies & Shakes is a home recipe category, and the sweet-treat button is shorter.

Planner now uses a compact scrolling week agenda with small recipe photos, month/date navigation, drag-and-drop between days, and meal actions shown on tap. Existing day/week/all groceries and pantry completion behavior remain intact. No database migration or new dependency is required.

Validation includes TypeScript, 111 unit tests, isolated browser checks for the planner and meal choices, an Android/Hermes export, and a successful signed Android build. The credential scan reported zero findings across 415 paths. Physical Android touch and system-inset checks remain part of testing after installation.

Play accepted the bundle with no blocking errors and no loss of supported devices. Its sole warning is the missing optional deobfuscation mapping file; native debug symbols are attached. Play reports a 17.5 MB new installation and a 4.04 MB update.

Build provenance:

- Source commit: `d22455097a77157a3ac7db43b6910edfe365fb14`.
- [Expo Android build](https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/5ce287eb-d6f8-4cab-801f-83ebb082be35), completed September 15, 2026 at 06:00:04 UTC.
- Artifact: `mealsolved-1.0.7-13.aab`, 50,138,268 bytes.
- SHA-256: `316743ac827407df36471948bcba0eae45e848ca8848ec2cf9f37f8d45a0d7d2`.

The Expo dashboard showed $5 used of $45 build allowance before this release. Renewal remains canceled, Free is scheduled for September 28, and the upcoming bill estimate is $0. This build used the existing allowance and signing credentials.

[Tester enrollment](https://play.google.com/apps/internaltest/4701571696443292910)
