# Android 1.0.8 (14)

Adds personal recipe dislikes with immediate Undo and Settings > Disliked recipes > Restore. Hidden recipes are excluded from discovery, search, categories, saved browsing, meal choices, and the planner picker. Existing scheduled meals remain intact. Household members do not inherit each other's recipe dislikes.

Also includes the pending household planning/preferences features, Today-first planner, compact category cards, Home quick-add to planner, and shared account-scoped recipe caching.

Storage: owner-protected user_preferences.disliked_recipe_ids; existing local preference cache queues offline changes. Household preference sharing deliberately omits recipe IDs. Migration 20260917005238_recipe_dislikes.sql applied before release.

Validation: TypeScript; 129 automated tests; Android Hermes export; rollback-only database tests of owner access, partner write/read denial, household RPC privacy, and restoration. Isolated browser test verified hide, reload persistence, Settings restoration, held-choice removal, and compact 390px category layout. No real user recipes or preferences changed during QA.

Release target: existing Google Play internal testing track. Build and rollout details will be recorded after completion.
