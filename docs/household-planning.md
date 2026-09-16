# Household planning and cooking audience

Implemented September 16, 2026. The additive database migrations are applied; the new client requires the next app release. No paid build or subscription was started.

## Using it

1. Open More → Household (also available in Settings).
2. Turn on **Use household planning**, then choose Personal or Household as **My main planner**. Each member chooses independently.
3. Planner and Grocery have Personal / Household switches. Temporary switches do not change the saved main planner. A new app session starts with the saved main planner.
4. Saving a recipe lets you choose its planner, date and meal. Household dinners and personal snacks can coexist. Private user-created recipes stay personal.
5. Beside the Home search field, open **Cooking for**. Choose Just me, View for household, or specific people. The cook can be excluded. This filter also applies to quick choices, category browsing, pantry matches and the planner's recipe picker.
6. Each member separately opts into **Share food preferences**. Shared preferences follow their food settings. Missing consent is explained rather than silently treating that person as having no restrictions. Choosing a planner does not change the cooking audience; the picker shows whose preferences it uses.

Personal and household calendars and purchase checks are separate. Shared plans and checks refresh on focus and every 15 seconds while their screen is foregrounded. Household settings and consent also refresh while the app is active. Failed household refreshes clear shared profiles and prevent shared writes. Shared shopping extras keep their existing household behavior; pantry contents remain personal.

## Data and access

- Existing `meal_plans`, `meal_plan_purchases` and personal preference RLS remain unchanged.
- `household_meal_plans` and `household_meal_plan_purchases` require authenticated, current membership **and** planning opt-in. Personal recipes cannot be inserted into shared plans. Moving a meal can change only date and meal slot.
- `household_planning_action` changes only the caller's membership settings. A private security-definer function checks membership and returns an explicit whitelist of food preferences only for members who consented. It never returns email addresses or other profile metadata.
- No other member's preferences are written to device storage. Cooking selection is per app session. All selected diners' ingredient/cuisine/diet exclusions are evaluated independently; likes and cooking preferences receive equal per-person weight.
- Leaving/removal stops preference access. Plans stay with remaining opted-in members. Last-member departure deletes the household and its shared data; personal plans remain.
- No new dependencies, realtime subscriptions, email messages or automatic opt-ins were added.

## Verification

- TypeScript: `npx --no-install tsc --noEmit` passed.
- Unit suite: **118 tests passed**, including household restrictions, consent withdrawal, subset selection, equal weighting and separate storage destinations. Two pre-existing SQL snapshot tests now normalize Windows checkout line endings; recipe content was unchanged.
- `tests/household-planning-security.sql` passed against Supabase inside a rollback transaction: opt-in enforcement, partner read/move/check, personal isolation, private-recipe rejection, consent withdrawal, member removal, cross-household writes, composite purchase foreign key and anonymous access. Confirmed zero test accounts remained and no real member had been opted in.
- Browser UI: two isolated test accounts. Verified independent defaults, main view after reload, personal snacks versus shared dinner, cross-account grocery checks, whole-household and selected-person filters, missing/withdrawn consent and opt-out. Reviewed 390px planner/choices and 320px household/home layouts. Fixed the search field's narrow-width overflow.
- Fresh sign-in regression: explicitly initialized navigation to Home and kept the navigator mounted while membership loads. Returning users now land on Home, then see their saved main planner; verified again with a fresh browser origin.
- Production-configured Android/Hermes export passed. This is a local bundle compatibility check, not an installed-device or Play release test.
- Source credential scan: zero findings.
- Database advisors: new tables have RLS and indexed foreign keys. Existing private-table no-policy notices are deliberate deny-by-default access through checked functions. Existing unrelated advisories remain: [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [legacy favorite foreign-key index](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) and [recipe permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

## Isolated UI fixture

`scripts/serve-planning-fixture.cjs` is a loopback-only in-memory backend, never part of the app bundle. Export the web app into `artifacts/household-ui/export` with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:8092` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=local-ui-fixture`, then run the script. Sign in at `http://localhost:8092/login` as `alex@example.invalid` and at `http://127.0.0.1:8092/login` as `blair@example.invalid`, using any password of six or more characters. Origins keep the sessions separate while the fixture shares its in-memory household. It deliberately reuses a sample thumbnail; it does not alter catalog photos. Never build a release with fixture configuration.

Access-control design follows [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).
