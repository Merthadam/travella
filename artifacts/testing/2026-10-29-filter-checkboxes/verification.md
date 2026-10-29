# Stay filter checkboxes — 2026-10-29

User requested clear multi-selection controls for property types and amenities. Continued the existing form design choice and GSD quick workflow. Replaced the add-one picker with native checkbox lists, independent search fields, selected counts and removable chips. Selections persist while filtering. The existing maximum of ten options per category and all/any amenity matching remain unchanged.

## Automated checks

```sh
npm --prefix frontend test -- src/features/plans/travel/StaySearchFilters.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx
npm --prefix frontend run build
git diff --check
```

97 tests passed. Coverage includes multiple property types and amenities in the submitted criteria, clearing, filtering without losing selections, removing a hidden selected item, keyboard Space toggling, empty matches, category-independent searches, and the ten-option limit. Existing catalog failure/manual search and imported-filter tests pass. Production build passed with the existing bundle-size warning. No backend changes.

## Browser evidence

Preserved the [user's before screenshot](implementation/before-user-screenshot.png). Captured and inspected the [UI plan](plan/checkboxes.png).

- Used Chrome DevTools MCP with the authenticated configured example account at http://localhost:5174. Restored only the prior isolated Milan test fixture.
- Local Cognito precheck and `bash scripts/start-local-ready.sh` passed, including authenticated readiness. Container hashes match the changed component and stylesheet.
- Selected Apartments and Hotels, plus Elevator and Fitness facilities. Filtering property types to “apart” kept Hotels selected and removable. Removed Hotels using its chip; reload retained its unchecked state and the other three selections.
- Searched for a nonexistent amenity: the empty state appeared while selected chips remained available. Cleared the query to restore the list.
- At 390×844, categories stack, checkbox labels remain readable, and each list scrolls within its panel. Document width and scroll width both measured 390px. Re-selected Hotels on mobile; selections survived the subsequent desktop reload.
- Submitted with `hotel_type_ids: [201, 204]`, `facility_ids: [491, 492]`, and `strict_facility_filtering: true`. Catalog validation, hotel search, and public snapshot returned HTTP 200; one sandbox stay appeared with the four applied constraints visible.
- Console contained only the existing Lit dev-mode warning and no errors. [Sanitized request, network and console evidence](browser-checks.json).
- Inspected [desktop selections](implementation/desktop-multiple-selections.png), [mobile property types](implementation/mobile-restored-selections.png), [mobile amenities](implementation/mobile-amenities.png), and [filtered result](implementation/filtered-search-result.png). No clipping or overlap in the changed controls.
- Soft-deleted only the fixture after testing: active detail returned 404, deleted detail reported `deleted` and a recovery deadline. Returned the browser to Plans.

No failed or blocked checks. Error/retry, keyboard operation and selection-cap edge cases were covered by automated tests; live searches used supplier sandbox inventory. No supplier checkout was attempted.
