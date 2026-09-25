# Compact Home and Help Me Decide

Home uses compact outlined actions with at least 44px touch targets. Hungry Now and Help Me Decide occupy full-width rows; Sweet Treat and Cook What I Have share the next row. The old Pick For Me and Feeling Bold entry points are removed, while their existing deep links remain compatible. A 390x844 browser preview shows the entire first recipe row without scrolling.

Help Me Decide starts with three distinct choices from the accessible recipe catalog, including the account's own recipes. Existing personal/household food preferences and recipe dislikes apply before filtering. A single sliders button opens a sheet for meal type, protein ingredients, available cuisines, and maximum cooking time. Options within a group are combined with OR, and groups with AND. Filters are temporary to the open picker and do not change saved food preferences.

The sheet edits a draft: Apply changes the choices, Close cancels, and Reset clears all draft filters. Matching holds survive applying filters; incompatible holds are dropped. Empty/small pools are shown honestly without duplicate or out-of-filter recipes. Refresh continues preserving held items.

Validation: TypeScript; all 132 tests; Android, iOS and web Expo exports. Isolated browser QA at 390px and 320px checked Home density, filter sheet layout, combined meal/protein/cuisine filters, selection accessibility, zero matches and Reset. No cloud database changes or paid dependencies. These changes have not been released to Google Play.
