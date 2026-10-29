# Compact flight traveler picker — verification

Completed 2026-10-29 on `maple-cake`, implementation commit `11ac5d8`. Canonical local app: http://localhost:5174. Existing-form preference retained. No main merge or deployment.

## Design and implementation

Replaced the flight-only loose adult input and add-child/infant boxes with one Travelers control in the search form. It opens aligned minus/count/plus rows for adults, children, and infants, with required age dropdowns when applicable and Done. Counts use existing workspace state and stay editable before Search. Cabin remains separate; stay room controls retain their behavior.

Limits: at least one adult, nine travelers total, infant count no greater than adult count. Removing adults never silently removes infants. Removing a child/infant preserves earlier ages. Exact ages remain required after closing; Search reopens and focuses the missing field. Explicit submit validation also blocks blank/zero adult counts recovered from the old form.

[Design screenshot](plan/travelers.png) · [Before](plan/before-desktop.png) · [Desktop closed](implementation/desktop-closed.png) · [Light picker](implementation/desktop-light.png) · [Dark picker](implementation/desktop-dark.png) · [Mobile picker](implementation/mobile.png)

## Automated checks

- `npm --prefix frontend test -- src/features/plans/travel/FlightTravelers.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/travelDefaults.test.jsx src/features/plans/travel/StaySearchFilters.test.jsx`: **96 passed**.
- `npm --prefix frontend test -- src/features/plans/travel/TravelSearch.test.jsx`: **32 passed** (review agent).
- Total **128 tests**. New coverage: count/infant limits, exact ages and cabin in requests, Done without search, Escape/outside/Tab dismissal, focus return, invalid ages while closed, existing scoped recovery and invalid recovered adult count.
- `npm --prefix frontend run build`: passed. Existing large-chunk advisory remains; no compile failure.
- `git diff --check`: passed.
- Read-only Cognito precheck and `bash scripts/start-local-ready.sh`: passed healthy startup plus temporary sign-in/session/sign-out check. Changed source files match the running container: [hash checks](source-hashes.json).

## Authenticated Chrome DevTools journey

Used the configured example account's existing authenticated session, with credentials kept private. Official Chrome DevTools MCP inspected and exercised the actual rebuilt app. Restored only the isolated fixture created in this session, `9e78f907-47ed-4dc8-afcd-ec5e5f998fbd` (Milan, 6–9 November 2026).

1. Opened Flights from the Planning Canvas; home/destination defaults remained BUD/MIL. Initial summary correctly read “1 traveler”.
2. Added a child, closed with Escape, and clicked Search without an age. Search did not run; picker reopened, displayed its error, and focused Child 1 age. [Missing-age evidence](implementation/missing-age.png).
3. Selected child age7, added an adult and an infant under1. Increased to nine travelers: all Add controls disabled. Returned to two adults; with two infants both Remove adult and Add infant disabled. Removing the last infant preserved the first infant's age0.
4. Done closed the picker and restored trigger focus, retaining four travelers and ages7/0. Search submitted exact numeric criteria `adults:2`, `children_ages:[7]`, `infant_ages:[0]`, cabin ECONOMY, BUD→MIL. [Sanitized request](request-passengers.json).
5. Observed [loading](implementation/search-loading.png), HTTP200 search and snapshot, then **62 sandbox return-flight results**. Result summary and cards showed four travelers / two adults, one child, one infant. [Results evidence](implementation/search-results.png).
6. Resized to390×844, causing page reload; reopened Flights and Travelers. Four travelers, child7, infant0, cabin and results recovered. The panel is in normal page flow at mobile widths:328px within390px, document width390px, buttons44px high. No horizontal overflow. Desktop1440×1000 and mobile captures inspected for overlap, clipping, readable text, focus and selected states. Long desktop content scrolls in the main results pane; mobile panel expands the form.
7. Light and dark token states visually checked. The light check temporarily changed the document theme attribute; reload restored the account's dark appearance without a profile mutation.
8. Current-run console had only the existing Lit development-mode warning. Preserved console history includes the earlier session/rebuild `/auth/session`500 already documented in the preceding filter-chip task; it did not recur in this rebuilt picker journey. Travel search, airport, capability and snapshot requests all returned200. [Requests](network.txt) · [Preserved console](console.txt). No new picker runtime/network regression observed.
9. Soft-deleted only the restored test fixture using the existing confirmation API. Active read returned404; deleted read confirmed `lifecycle:deleted`. Returned browser to Plans at desktop size. No saved trip options or bookings were created.

No backend implementation changed. Test inventory was explicitly labeled sandbox; live supplier checkout was outside this passenger-picker change.
