# Mealsolved 1.0.5 testing release

Release candidate: Android **1.0.5, version code 11**, from commit `0ebf464`. The intended destination is the existing Google Play internal testing track; no production or iOS release is included.

## Delivery status

The [Expo build](https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/be0fb000-a7e7-4675-a2b6-d3bebf0f8a35) finished successfully September 14, 2026 at 20:43 UTC. The signed AAB is 50,130,578 bytes with SHA-256 `cea7c494fec3870598d4be4ea43b1df17bb4123892643cf50d90dda0ba00328f`.

The Google Play internal release draft is saved as `11 (1.0.5) - Planner and meal discovery`, with release notes. **Bundle upload and publication are pending:** Chrome's extension file-upload permission rejected the chooser upload. The user must enable **Allow access to file URLs** under the ChatGPT browser extension's Details in `chrome://extensions`, then the existing bundle can be uploaded without another build. Browser security also prevents the agent from opening that settings URL itself. [Upload setup](https://developers.openai.com/codex/app/chrome-extension#upload-files)

Caleb Meade's internal tester list was created and enabled for the app; the enrollment invitation was sent from Wyatt's Gmail account. The tester's personal email is intentionally not recorded in this public repository.

Expo billing remains canceled with Free scheduled for September 28 and the upcoming bill estimated at $0. The dashboard still showed $3 used of $45 immediately after the build; usage reporting may lag. No new subscription was started.

This release delivers the completed sweet-treat selector, Smoothies & Shakes category, updated recipe photography, and calendar planner. Planner is in the five-item bottom navigation, opens to Today, and provides a calendar-month browser with individual weeks. Grocery lists can follow a day, week or all upcoming meals; purchase checks remain independent for repeated meals. Finishing a list asks whether to merge its ingredients into the pantry.

Existing household extra groceries remain shared. Calendar purchases are personal, and the pantry still stores ingredient names locally. Shared household planning, brand photos and ingredient expiration dates are future work, deferred while the recipe library grows. See [launch priorities](launch-priorities.md) for the corrected product direction: helping people decide what to eat.

## Validation

- 104 automated tests passed on the feature candidate, including date boundaries and purchase isolation.
- TypeScript and a local Android/Hermes export passed for the versioned release candidate.
- Isolated browser checks covered navigation, month selection, planned meals, grocery scopes, purchase failures, pantry confirmation/decline/retry and local midnight rollover.
- Database access-control tests passed for the new purchase table.
- Source credential scanning found no embedded credentials. Physical Android checks remain necessary after installing the release.

## Tester check

Use the [internal enrollment link](https://play.google.com/apps/internaltest/4701571696443292910) with the Google account that was added as a tester, join, and follow the Play Store install/update link.

1. Confirm the installed release is 1.0.5.
2. Open Planner, add a meal for today, and add the same meal next week.
3. Check the Day and Week grocery views. Buying today's ingredients should leave next week's purchases needed.
4. Finish a list, choose Not now, then use Update pantry and confirm. Check that new ingredient names appear without duplicates.
5. Try Hungry Now, Sweet Treat and Smoothies & Shakes; check recipe photos and labels.
6. Check bottom navigation on your actual Android phone with both the keyboard open and closed.

For public-launch planning, Google says newly created personal developer accounts subject to its production-access rule need at least 12 testers opted into a **closed test** continuously for 14 days. Internal testing alone does not fulfill that requirement. [Official testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
