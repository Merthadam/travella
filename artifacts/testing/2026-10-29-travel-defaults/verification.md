# Editable travel search defaults — 2026-10-29

The user chose the existing form and confirmed: departure from home city, destination and dates from the Plan, city-wide airport selection where supported, and editable fields before searching. Guest nationality uses the first saved citizenship, falling back to home country. Flight country of residence remains the home country even when departure changes.

## Implementation

- Authenticated profile reaches the travel workspace; only country/nationality and city-derived airport selections enter search drafts.
- Supplier airport lookup prefers an unambiguous All Airports option; Milan uses MIL, with MXP/LIN/BGY retained as actual itinerary endpoints. Specific-airport selection remains available.
- Unavailable or ambiguous defaults remain unselected. Late responses cannot replace edited fields, imported results, restored edited searches, or another Plan's workspace. No search or durable Plan/profile change occurs from prefilling.
- Connector-confirmed city membership is preserved through the agent's independent route validation. A live browser failure exposed an existing second-stage rejection of MIL versus MXP/LIN/BGY; the shared validator fixes it without broadening individual-airport requests.
- Provider lookup bounds still apply: city-wide means the supplier-supported city group, not a claim that every airline or regional airfield is available. [Provider airport lookup](https://docs.liteapi.travel/reference/get_data-flights-airports) and [city/airport flight codes](https://docs.liteapi.travel/reference/post_flights-rates).

## Automated checks

- Focused frontend suite: 160 tests across travel defaults, travel search/workspace, PlanningCanvas, AccountApp and PlansApp. One account-focus timing failure during concurrent builds passed on isolated rerun (all 18 AccountApp tests).
- Connector/agent suite: 254 tests across LiteAPI, TravelRegistry and canvas travel. One nested SSE-to-React test exceeded its 5-second limit during concurrent builds; the exact test passed on isolated rerun.
- Frontend production build passed. Existing bundle-size and dependency deprecation warnings remain.
- `git diff --check` passed.
- Final container source hashes match the working checkout for the default resolver, workspace, connector, agent validation, and shared city membership.

## Browser evidence

Used the Chrome DevTools MCP in a separate headless browser because the shared profile was occupied. Authenticated with the configured example account, without recording credentials. Created a separate Milan Plan through the existing authenticated APIs with 6–9 November dates and one traveler; no pre-existing Plan was edited.

- Initial flight form: Budapest (BUD), Milan · All airports (MIL), fixed Plan dates, Hungary as residence; no automatic fare search.
- Typed Vienna, selected VIE, and submitted. The network request contained VIE → MIL and the unchanged dates/country. The initial 502 led to the route-validation fix described above.
- Reloaded and reopened flights: Vienna persisted and was not replaced by the home-base default.
- Mobile 390×844: editable origin, city-wide destination, dates, search button and residence were visible without horizontal clipping.

Screenshots: [UI plan](plan/search-defaults.png), [initial defaults](implementation/flight-defaults-desktop.png), [restored alternate departure](implementation/edited-departure-restored.png), [mobile](implementation/edited-departure-mobile.png).

## Final browser results

- After rebuilding, Budapest → Milan returned 62 public sandbox itineraries; the alternate Vienna → Milan search returned 82. Both searches and snapshot reads returned HTTP 200. Actual airport endpoints remain visible; supplier truncation notices remain intact.
- Stays prefilled Hungary as guest nationality and the Plan dates. Changed nationality to Austria, reloaded, and reopened stays: Austria remained selected.
- Final console inspection found no errors and only the existing Lit development-mode warning. Sanitized network evidence is in [browser-checks.json](browser-checks.json).
- Inspected all saved screenshots: desktop and mobile fields remained readable without clipping or overlap.
- Read back the profile and fixture Plan before cleanup: home airport BUD, home country HU, citizenship HU, destination Milan, and dates 6–9 November were unchanged by search edits.
- Deleted only the test Plan through the existing challenge/commit API. Active detail returned 404; deleted detail returned lifecycle `deleted` with a recovery deadline. Returned the browser to the Plans list.

Final screenshots: [city-wide results](implementation/live-city-flight-results.png), [alternate departure results](implementation/alternate-departure-live-results.png), [nationality default](implementation/stay-nationality-default.png), [restored nationality edit](implementation/edited-nationality-restored.png).

Executed automated commands:

```sh
npm --prefix frontend test -- src/features/plans/travel/travelDefaults.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/AccountApp.test.jsx src/PlansApp.test.jsx
npm --prefix frontend test -- src/AccountApp.test.jsx
uv run --locked pytest services/mcps/tests/test_liteapi.py services/agent/tests/test_travel_registry.py services/agent/tests/test_canvas_travel.py -q
uv run --locked pytest services/agent/tests/test_canvas_travel.py::test_mixed_journey_actual_sse_to_react -q
npm --prefix frontend run build
git diff --check
```

Empty/failed lookup, late responses, ambiguous city names, flexible dates, and imported/recovered criteria were covered by focused automated tests. Live verification used supplier sandbox inventory. No live supplier checkout or broader phase acceptance was attempted. No remaining failed or blocked checks for this change; the two initial timing failures passed their isolated reruns.
