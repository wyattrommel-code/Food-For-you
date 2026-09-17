# Android 1.0.8 (14)

Adds personal recipe dislikes with immediate Undo and Settings > Disliked recipes > Restore. Hidden recipes are excluded from discovery, search, categories, saved browsing, meal choices, and the planner picker. Existing scheduled meals remain intact. Household members do not inherit each other's recipe dislikes.

Also includes the pending household planning/preferences features, Today-first planner, compact category cards, Home quick-add to planner, and shared account-scoped recipe caching.

Storage: owner-protected user_preferences.disliked_recipe_ids; existing local preference cache queues offline changes. Household preference sharing deliberately omits recipe IDs. Migration 20260917005238_recipe_dislikes.sql applied before release.

Validation: TypeScript; 129 automated tests; Android Hermes export; rollback-only database tests of owner access, partner write/read denial, household RPC privacy, and restoration. Isolated browser test verified hide, reload persistence, Settings restoration, held-choice removal, and compact 390px category layout. No real user recipes or preferences changed during QA.

Signed EAS production build: `2af5dd2d-c6b7-4b9f-b553-f919d22d3485`, source `fc6324483f0739c46d2269f0a3536d827e09a82f`, completed September 16, 2026 (America/Denver). AAB size: 50,156,330 bytes. SHA-256: `b059c8e89bc33e3ff4b691e8f4a4582c648c5b3e9708ceab3deade92f6f390e4`.

Archive integrity and bundled configuration checked: correct production Supabase project, only the public anon JWT role, no fixture configuration or secret credentials. Additional browser checks verified immediate Undo, planner preservation, Settings navigation, and 320px layout.

Released September 16, 2026 at 7:17 PM America/Denver to the existing Google Play internal testing track. Play Console confirms **Available to internal testers**, latest release **14 (1.0.8) - Dislikes and household planning**. No blocking errors; only the existing optional deobfuscation-file warning. Supported device counts unchanged. Tester link: https://play.google.com/apps/internaltest/4701571696443292910 . Store propagation can take about an hour or occasionally longer.

Build used the existing Expo allowance. Billing remains canceled effective September 28 with an upcoming bill of $0; no subscription renewal was enabled.
