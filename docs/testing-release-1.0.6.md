# Mealsolved 1.0.6 login field fix

Android version 1.0.6, version code 12, source commit `ab060cc`. Published to the existing Google Play internal testing track on September 14, 2026 at 5:46 PM America/Denver (23:46 UTC). Play Console confirms **Available to internal testers** for `12 (1.0.6) - Login field fix`. No production or iOS release was submitted.

The login and signup email/password inputs could overflow their row on narrow screens, making text appear cut off and pushing the visibility control outside the password field. The fix allows inputs to shrink within their available width. Password recovery inputs receive the same correction. Email and password fields have no app-imposed maximum length; no server authentication settings or password-strength requirements were changed.

Verification: TypeScript passed. Isolated browser checks at widths 320, 390 and 844 pixels confirmed input boundaries. A synthetic 123-character email and 570-character password reached the intercepted sign-in request unchanged; no real authentication request or credentials were sent. Showing/hiding the password preserved its full value. Physical Android confirmation remains necessary after updating.

Tester link: https://play.google.com/apps/internaltest/4701571696443292910

Build: https://expo.dev/accounts/wyattrommel/projects/food-for-you/builds/eb39e61d-ea98-438b-a88f-3b4b3ea0a238

The signed build finished September 14, 2026 at 23:41 UTC. AAB size: 50,130,760 bytes. SHA-256: `b0527fc92c98ef7c53899187fc36ffcbdf24a62e84b09c3b72a997be3bf9e312`. Existing Expo allowance and signing credentials were used. Subscription renewal remains canceled.

Google Play accepted the bundle with no previously supported devices lost. The sole nonblocking warning concerns an absent deobfuscation file, as in prior releases. Updates usually appear within an hour but can occasionally take longer.
