# Mealsolved 1.0.4 testing release

Published September 12, 2026 locally (September 13 UTC): **Android 1.0.4, version code 10**, on the existing Google Play internal testing track. Play Console confirms **Available to internal testers** for “10 (1.0.4) - Shared household groceries.” No production or iOS release was submitted.

This update adds [household grocery sharing](household-groceries.md). Each person signs in separately, creates or joins a household in Settings, and uses a shared grocery list. Members can add and check off items together; offline edits retry after reconnecting. Invitations expire and can be revoked. Personal food preferences remain separate. Grocery-list accessibility and layouts on small and landscape screens are improved.

## Verification and delivery

- 90 regression tests, TypeScript, source credential scanning (284 paths, no findings), and whitespace checks passed on the release candidate.
- Feature verification also includes the local Android/Hermes export, household and baseline browser checks, transactional database access-control tests, and a live Realtime test with separate authenticated accounts. Temporary test accounts and their household were removed. See the household feature document for detailed coverage and limitations.
- [Expo build 0251ddfb-ba95-44d9-b2ce-0eb3513121e6](https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/0251ddfb-ba95-44d9-b2ce-0eb3513121e6) finished successfully on September 13, 2026 at 03:24 UTC (September 12 locally). It uses source commit `ab6091c61e6de1bd8b016d01cbeff3a2105289d9` and the existing Android signing credentials.
- Signed AAB: 50,113,009 bytes; SHA-256 `8c0aec9714441e6d9fa34d27ac459537ab6fa860050c4e59ea00b6dc87e9c861`.
- Google Play accepted and published the signed bundle. Its compatibility check reports no previously supported devices lost. The only nonblocking warning concerns the absent deobfuscation mapping file, as in the preceding releases.
- Expo billing was checked before and after the build: it showed $0 used of the existing $45 allowance, an estimated $0 upcoming bill, and canceled Starter renewal with Free scheduled for September 28, 2026. No new subscription or additional charge was authorized.

Internal testers use the [existing enrollment link](https://play.google.com/apps/internaltest/4701571696443292910), then open **Settings → Household** after updating. Google Play says changes usually appear within an hour but can occasionally take longer. Physical-phone verification of the installed version remains outstanding.

The live recipe catalog remains at 269 shared recipes with photos; this binary release does not import another recipe batch.
