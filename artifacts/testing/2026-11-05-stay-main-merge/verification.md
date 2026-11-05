# Main integration verification

2026-11-05. User authorized merging the completed branch into main. Base: origin/main 97d610a. No unrelated worktree or local main history modified.

## Conflict resolution

Main already introduced automatic hotel/airport pins and typed provider identities. Retained that shared resolver and schema instead of running two hotel-pin implementations. Preserved branch behavior for recovered reservation coordinates and matching cancellation cleanup. An older `booked_stay` pin gains its exact LiteAPI identity without losing its ID, traveler edits or producing a duplicate. Both branches' planning records are retained. Flexible location filters, agent/manual search parity, linked numbered map pins, independent scroll panes and neutral status feedback remain.

## Executed automated checks

Frontend (230 passed in total):

```sh
cd frontend
npx vitest run src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/travel/bookingLocations.test.js src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/useBookingSync.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/StayLocationFilters.test.jsx
NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/features/plans/components/CanvasDestinationMap.test.jsx
npm run build
```

The initial run passed 221 tests; nine map tests failed in setup because this Node runtime's experimental localStorage global was unavailable. Rerunning those nine with the browser-compatible environment flag passed. No production change was made for that test-environment issue. Build passed with the existing chunk-size advisory.

Backend (167 + 67 = 234 passed):

```sh
uv run --locked pytest -q --tb=short services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_stay_confirmation.py services/mcps/tests/test_liteapi.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py services/crud/tests/test_checkout_map.py services/auth/tests/test_stay_body_limits.py services/agent/tests/test_stay_location.py services/agent/tests/test_specialist_tools.py
uv run --locked pytest -q --tb=short services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_specialist_worker.py services/agent/tests/test_travel_api.py services/agent/tests/test_travel_registry.py services/auth/tests/test_travel_proxy.py
```

Actual FastAPI/SQLAlchemy tests verify saved reservation coordinates and pins, read/update/delete/restore, idempotency, invalid fields, ownership/unauthenticated access and missing records. Provider/agent tests cover exact location evidence, forged anchors, outdated geometry, cancellation and delayed responses. Existing dependency deprecation warnings remain.

## Authenticated Chrome DevTools

- Rebuilt canonical `travella-stay-location` stack at http://localhost:5202. Example account sign-in/session/sign-out checker passed; browser used the same example account.
- Existing Lisbon booking: `booked_stay` retained its ID and location, gained LiteAPI identity `lp35f1b`, and persisted `mapSynced: true`. Exactly one hotel plus all three existing saved places after reload. Canvas challenge, write and reads returned 200.
- Selected São Jorge Castle and Time Out Market; applied nearby search with existing dates/guests. Live LiteAPI search returned HTTP 200 and 28 properties.
- Exact result's Show on map control selected the matching numbered hotel marker. Nine other hotel markers dimmed; all four saved places remained at opacity 1. Dense overlapping markers can select the visually topmost marker; the corresponding card tracks that selected marker. Result controls provide exact selection.
- Desktop 1440×900 and mobile 390×844 exercised. Mobile Map & places control works; no horizontal overflow. Screenshots inspected.
- Final console inspection: no errors. Existing Lit development-mode/Google marker event warnings remain. No final failed fetch/XHR requests.
- Source hashes matched app hook, booking resolver, map adapter, agent location resolver and CRUD canvas, plus connector checkout/confirmation.
- Fresh agent search behavior was covered by integration tests and this branch's earlier live evidence; no extra model turn or supplier reservation was created during merge verification.

## Evidence

- [Before integration](plan/before-main-integration.png)
- [Merged saved hotel map](implementation/merged-global-hotel-map.png)
- [Merged live search and linked map](implementation/merged-location-results-desktop.png)
- [Mobile map](implementation/merged-location-results-mobile.png)

Scoped security review: `.planning/quick/261105-stay-main-merge/SHIP-SECURITY.md`. All applicable scoped delivery gates passed. Wider Phase 18 acceptance is unchanged.
