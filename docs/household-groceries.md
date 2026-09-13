# Household grocery sharing

Implemented September 12, 2026 (database migrations applied September 13 UTC). Previously the grocery list was a single device-wide AsyncStorage array. Two people can now sign in separately, join the same household and add or check off groceries together.

**The backend is deployed and the client is implemented and verified. This feature is not included in the already published Android 1.0.3 (9) binary. It needs the next Android build to appear in the installed Play testing app. No cloud build, paid service or new subscription was started for this change.**

## User flow

1. Open Settings → Household, enter a household name and a first name or nickname, and create the shared list.
2. The owner creates an invitation and shares or copies its code. The other person signs in with their own account and chooses Join household.
3. Grocery now uses that household's list, including ingredients added from recipe pages. A label identifies the active household.
4. Members can add, check, remove and clear items. Updates arrive through Supabase Realtime while the app is active. A foreground refresh every 15 seconds also checks access and recovers interrupted connections.
5. The owner can cancel invitations or remove a member. Anyone can leave. When the owner leaves or deletes their account, ownership passes to the earliest remaining member; the last member leaving deletes the household.

One account can belong to one household, with up to eight members. Invitations contain 128 bits of randomness, expire after 24 hours, work once, and are replaced by new invitations. Join attempts are limited to ten per ten-minute window per signed-in account. Only hashes are stored on the server; the raw code is returned once to the owner.

Food preferences, favorite recipes and pantry behavior stay separate from household sharing. Household actions do not overwrite the food-preference survey or its household-size answer. No password sharing is required, and no invitation emails or messages are sent automatically.

## Existing and offline lists

Personal lists now use account-specific device storage. Older device-wide items remain available through an explicit import action; they are never silently assigned or uploaded. After connecting a household, a separate confirmation can copy items saved on that phone into the shared list. The original personal list remains available after leaving.

Changes are written to device storage before the UI reports them saved. Offline household edits retain their destination account and household and retry after reconnecting or restarting. The UI distinguishes saved-on-phone changes from a synchronized list and exposes failures and retry. Failed local writes do not silently replace the list. A shared provider keeps recipe pages and the Grocery tab consistent.

Synchronization sends item operations instead of replacing an entire list. The database serializes changes within each household, merges recipe sources and deduplicates retried operations. Check operations set an explicit state. Row incarnations prevent an old offline check from affecting an item removed and later re-added. Clear/remove operations carry observed revisions, so another member's later edit or new item survives a stale clear. In that case the item can remain visible after synchronization and can be removed again deliberately.

## Access controls

- Membership, invitations, join-attempt counts and operation receipts live in an unexposed private schema, with RLS and no direct client table access.
- Internal security-definer functions use an empty search path, explicit actor/membership/owner checks and restricted execution grants. Public RPC wrappers are security-invoker functions. Client requests pin the authenticated account's access token to prevent a queued mutation using a newly signed-in account.
- Shared grocery rows expose only SELECT through member-scoped RLS. Clients cannot insert, update, delete or reassign them directly. Writes go through the checked RPC.
- Item removal is a soft deletion, producing authorized UPDATE notifications. This avoids relying on deleted-row authorization for Realtime events. Removing a member immediately prevents further API reads and writes; foreground membership checks update their screen.
- The list limit is 500 items. Household changes do not change existing recipe or preference policies. Account deletion removes that person's membership and transfers ownership rather than deleting another member's shared list.

The security advisor reports no new warnings or errors. Its five informational “RLS enabled, no policy” notices refer to intentionally inaccessible private tables. [That advisor rule](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) does not require granting client access. The pre-existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains; no paid-plan upgrade was made.

## Verification

- 90 regression tests pass, including simultaneous additions/checks, offline restart, lost-response retries, stale clears, replacement items, source merging, storage failure and disposed-account isolation.
- TypeScript, source credential scanning and whitespace checks pass. Expo's local Android/Hermes export succeeds.
- Transactional SQL tests exercise owner/member/outsider/anonymous access, direct-write denial, single-use/rotated/expired invitations, attempt limiting, replay protection, stale updates, removal and owner-account deletion. All fixtures are rolled back.
- A separate live network test used three temporary accounts: the invited partner received the first person's grocery change over an authenticated Realtime subscription and checked it off; unrelated and removed accounts had no access. All three test accounts, their sessions and their household were removed afterward. No messages were sent.
- Local browser QA covers creating a household, generating an invitation, adding/checking groceries, offline reload/retry and layouts at 320×740, 390×844 and 844×390. Screenshots were inspected. Grocery controls and rows remain reachable above navigation in landscape.
- Existing onboarding, Settings synchronization, varied feed, recipe photos and five viewport layouts also pass browser regression checks against the 269-recipe catalog. The household fixture made zero preference writes.

These checks include two authenticated clients and browser viewport simulations, not a physical two-phone test of the installed Android release.

Reproduce with `npm test`, `npx tsc --noEmit`, `node scripts/check-source-credentials.cjs`, `node scripts/verify-household-ui.cjs` against a local Expo web preview, and `npx expo export --platform android --output-dir dist/household-android-check`. Set `PLAYWRIGHT_MODULE_PATH` if Playwright is provided outside the project. Browser fixtures intercept account traffic and sockets; local screenshots stay under ignored `artifacts/household-ui/`.

Applied migrations: `20260913023844_household_groceries.sql` and `20260913024006_household_grocery_source_merge.sql`. The second resolves a variable/column ambiguity found by the SQL test. Local filenames match the database migration history.

Implementation references: [Supabase Postgres Changes and RLS](https://supabase.com/docs/guides/realtime/postgres-changes), [database function security](https://supabase.com/docs/guides/database/functions), and the [July 2026 Realtime schema change](https://supabase.com/changelog/realtime-schema-locked-down-against-modification). This implementation changes the application schema and publication, not the locked Realtime schema.
