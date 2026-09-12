# Mealsolved 1.0.3 testing release

Published September 12, 2026: **Android 1.0.3, version code 9**, on the existing Google Play internal testing track. Play Console confirms **Available to internal testers** for “9 (1.0.3) - Compact recipe credits.” No production or iOS release was submitted.

Recipe detail now presents source and photo attribution inside the collapsed **Sources & photo credits** control. Expanding it exposes the source, creator, reuse license, modifications and photo variation notes. Credit links remain usable. See [the UI change](recipe-credits-ui.md).

## Verification and delivery

- 79 regression tests, TypeScript, source credential scanning and whitespace checks passed before building. The successful cloud build compiles the complete Android application.
- [Expo build aaa335b5-23de-4475-a891-7d190caa9fad](https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/aaa335b5-23de-4475-a891-7d190caa9fad) used source commit `e6c572fa616f79dfba070a34af76b3b615f1cc87` and the existing Android signing credentials.
- Google Play accepted the signed AAB and published version code 9. It reports no previously supported devices lost. The sole nonblocking warning concerns the absent deobfuscation mapping file, as in version 8.
- Uploaded AAB: 50,099,829 bytes; SHA-256 `7f935acbacd096e6d73d98cb5244bcff278750a94fc8040ff041104525c21b17`.
- Existing Expo build allowance was used. No new subscription or additional charge was authorized. Starter renewal remains canceled, with the Free plan scheduled for September 28, 2026.

Testers can obtain the update from the [existing internal-test enrollment link](https://play.google.com/apps/internaltest/4701571696443292910). Store propagation may take time. Physical-phone verification of the installed version remains outstanding.

The subsequent [50 everyday meals and desserts](easy-100.md) are a separate catalog update. Recipe data and photos load on refresh without another Android build.
