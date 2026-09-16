# Today-first planning and faster browsing

Implemented September 16, 2026.

- Planner opens at the local date, followed by six days. Returning to its tab resets to Today. Previous/next moves seven days; calendar navigation still supports another date. Existing plans are never moved by this display change. Midnight follows the existing local-date hook.
- The planner shopping shortcut carries its rolling date window to Grocery, so every displayed day contributes. Existing calendar-week grocery views retain their original behavior.
- Browse categories use an 82 px minimum-height row, a 58 px photo, title and time/difficulty. Rows grow for small screens/larger text and are virtualized. Private drinks and household food filters still apply.
- Home carousel/search cards and category rows have a Plan button. It opens the existing planner date/meal picker, including Personal/Household destination. Saving a meal within the visible date range keeps Today at the top.
- Catalog reads are shared in memory within one signed-in account, deduplicated while in flight, and refreshed on focus after five minutes. Explicit refresh bypasses the age limit. Catalog pages are fetched in batches of 500 to avoid silently cutting off growth. Own private recipes stay scoped to that account and are filtered out of public discovery. No recipe cache is persisted to disk.
- Recipe creation/deletion invalidates the catalog after any older in-flight read finishes. Account changes destroy the provider and cache. A background network failure retains the last successful catalog, while an initial failure exposes Retry.
- Planner focus refreshes no longer replace already-loaded days with a blocking spinner. Shared plans continue polling and all mutations still use existing authorization and concurrency safeguards.

## Verification

- 125 automated tests, including concurrent catalog reads, expiry, explicit retry, offline refresh, account isolation, mutation invalidation, Sunday/month/year/leap/DST rolling-date boundaries, and matching grocery windows.
- TypeScript check and Android production Hermes export.
- Isolated browser fixture at 320, 390 and 820 px: no horizontal overflow. Category rows measured 82 px at 390/820 and 100 px at 320 (text wraps).
- UI quick-add from Home saved Chicken Tacos to Monday dinner without opening recipe details; Today remained first. Groceries covered Wednesday through Tuesday and included Monday's ingredients.
- Home → Lunch → Home → Planner → Home → Planner used one catalog request in the observed fresh-cache window. With planner responses delayed 1.5 seconds, returning to Planner retained the existing meal and showed no blocking loading spinner.
- Browser error log empty during these checks. Fixtures are in-memory on loopback; no real account plans were modified.

The first launch still needs network data and photos. These checks demonstrate request reuse and display continuity, not a measured percentage speed-up on an installed phone. No dependency, paid service, database migration or Play build is needed for the code changes.
