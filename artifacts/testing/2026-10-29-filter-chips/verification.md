# Wrapping stay filter chips — 2026-10-29

The user requested removal of search textboxes and internally scrollable lists. Property types and amenities now use wrapping toggle chips. Pressed chips show a check mark and remain visible when Show fewer is used. Long catalogs initially show twelve options plus selected options; Show all expands naturally into the page. Native button keyboard behavior, ten-per-category limits, all/any matching and request criteria are preserved.

## Automated checks

```sh
npm --prefix frontend test -- src/features/plans/travel/StaySearchFilters.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx
npm --prefix frontend run build
git diff --check
```

98 focused tests passed. Covered click/Space selection and deselection, multiple values in submitted criteria, no textboxes, expansion/collapse preserving selected options, empty catalog, selection limits, clearing and existing recovery behavior. Production build passed with the existing bundle-size warning. No backend changes.

## Delegated review

At the user's request, two subagents reviewed theme styling and selection/accessibility behavior. The theme worker corrected CSS specificity so global dark-mode button styles cannot override selected-chip colors. The behavior reviewer found that removing a selected chip beyond the initial twelve could lose keyboard focus; focus now returns to the category expansion control when that chip disappears. The three focused chip tests passed again after the keyboard fix; the final build also passed.

## Browser evidence

The [previous implementation screenshot](../2026-10-29-filter-checkboxes/implementation/desktop-multiple-selections.png) records the before state. Captured and inspected the [chip UI plan](plan/chips.png).

- Used Chrome DevTools MCP, isolated browser and the configured example account. Restored only the previous Milan test fixture.
- Selected Apartments, Hotels, Elevator and Fitness facilities. Expanded property types, selected Boats beyond the initial twelve, collapsed, then deselected Boats: the chip stayed visible while selected and disappeared after removal.
- Reloaded in mobile viewport: the remaining four selections persisted. At 390px, document width equaled scroll width; both option groups had `overflow-y: visible` and matching client/scroll heights. Neither group contains a textbox or internal scrollbar.
- Final local rebuild completed after cleanup described below. Authenticated readiness passed; container hashes match both changed production files. Reauthenticated after session expiry.
- Final desktop inspection confirms distinct selected colors: selected background `rgb(23,63,62)` and text `rgb(158,241,216)`, versus unselected background `rgb(20,34,53)`. [Desktop chips](implementation/desktop-chips.png) inspected without clipping or overlap.
- Final mobile [property types](implementation/mobile-types.png) and [amenities](implementation/mobile-amenities.png) screenshots inspected: natural wrapping, readable labels and distinct selected states.
- Explicitly submitted the four chip selections: request included `hotel_type_ids: [201,204]`, `facility_ids: [491,492]`, and `strict_facility_filtering: true`. Catalog validation, search and snapshot reads returned HTTP 200; one sandbox stay appeared.
- An earlier `/auth/session` returned 500 during the rebuild/session-expiry interval. Reauthentication succeeded; final session read returned 200 and the final console contained only the existing Lit dev warning. [Sanitized browser checks](browser-checks.json).
- Soft-deleted only the test Plan and verified active detail 404, deleted lifecycle and recovery deadline. Returned the browser to Plans at desktop size.

No remaining failed or blocked checks. Initial environment and theme issues were resolved and their affected paths rerun. Supplier checkout was not attempted.

## Authorized local stack cleanup

Docker's 6GB VM reached approximately 33MB available memory while other builds were active. User instructed “delete unused stacks.” Stopped and removed older research/prototype environments and long-stopped preview containers, preserving the current app and active checkout/header projects. Removed 61 containers and 13 unused networks; no volumes or images were deleted. Available VM memory rose to roughly 3.6GB. The final rebuild then completed. [Cleanup inventory](stack-cleanup.json).
