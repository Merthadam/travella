# Automatic confirmed-booking pins — 4 November 2026

## Result and authorization

The traveler explicitly requested removal of the checkout map UI and automatic saving into Plans. This replaces the earlier separate Add/Review confirmation requirement. The session's no-prototype choice was retained. Confirmation map controls and their dedicated focus/review plumbing are removed. Confirmed stays and destination-side airports now reconcile through the existing revision-aware canvas autosave. A saved `mapSynced: true` marker makes reconciliation one-time and respects later manual removal. Existing confirmed receipts are reconciled on load.

Exact provider identities are reused. A single same-name nearby legacy pin can be associated while preserving its ID, coordinates and notes. Ambiguous matches remain separate. No coordinates are invented; unresolved locations or a full 50-pin map remain unchanged. Missing-location resolution can retry on reload/relevant state change. Single-pin framing now uses center and zoom 14 directly, avoiding Google fitBounds animation overriding the zoom.

## Automated checks

- `npm --prefix frontend test -- src/features/plans/travel/bookingLocations.test.js src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx`: **98 passed**, six files. Covers add/reuse, dedupe, missing coordinates/full map, failed-save retry, removal/reload/status refresh, stale lookup after Plan switch, and single-pin framing.
- `uv run pytest services/crud/tests/test_checkout_map.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py services/mcps/tests/test_flight_checkout.py -q`: **63 passed**. Actual FastAPI handlers and test database verify create/read/update/delete/recovery, owner/auth boundaries, revision conflict/idempotency, invalid marker rejection, and flight/stay sync marker persistence after pin removal. One dependency deprecation warning.
- `npm --prefix frontend run build`: passed, existing bundle-size advisory.
- `git diff --check`: passed.

## Live Chrome DevTools verification

Authenticated as the configured example account on **http://localhost:5200**, isolated Docker project `travella-checkout-map`. Rebuilt through `scripts/start-local-ready.sh`; service health and example-account sign-in/session/sign-out precheck passed. Other local stacks were untouched. Running container SHA-256 values matched the working source for `CanvasDestinationMap.jsx`, `usePlanningCanvas.js`, and `services/mock_booking.py` after final rebuild.

1. Preserved the traveler's existing Flight checkout demo, Plan `244277e5-6e39-4771-92c7-1a5c725cfdb3`, with its already-confirmed BUD–GVA return itinerary. Loading it automatically persisted exactly one Geneva International Airport pin, source `iata:GVA`, coordinates 46.238098, 6.10895, with the flight sync marker true. Reopened confirmation has zero checkout map action components; reload/readback still has one airport.
2. Created isolated Plan `8e17cb6e-40e2-45db-a6d7-22f3e3ad1198` through real authenticated CRUD using explicitly simulated confirmed hotel/flight documents. Automatic reconciliation associated its nearby existing hotel, preserving ID `existing-hotel`, its original position and note `Traveler note: side entrance`; added MXP and LIN airports; persisted both sync markers. Screenshot shows all three pins.
3. Used actual place-row options and the removal confirmation to remove the test hotel. Reload/API readback retained only MXP and LIN with the stay sync marker still true. The removed hotel was not recreated. Deleted only this isolated test Plan using the revision/challenge API, then verified GET 404. The traveler's Geneva demo was preserved.
4. Exercised Show all places after final map framing fix, inspecting visible Geneva marker and surrounding airport on desktop 1440×1000 and mobile 390×844. Mobile document width equals viewport width, no horizontal overflow. Screenshots visually inspected for marker presence, layout and clipping.
5. Chrome console had no errors on the final mobile run. Browser resource inspection showed successful relevant profile/Plan/canvas/context/capabilities requests; final confirmation had no failed same-origin API requests. A transient unavailable page during the deliberate Docker restart resolved after startup and reload.

No new supplier payment was submitted for this change. Live checks cover saved-confirmation reconciliation and real persistence; new confirmation handling is covered by focused automated tests. This is a local implementation, with no production deployment or push. The earlier unidentified offer-verification error is not claimed fixed by this work.

## Evidence

- [Before](plan/before.png)
- [Intended confirmation without map actions](plan/intended-confirmation.png) — static browser preview before implementation
- [Actual confirmation](implementation/confirmation.png)
- [Geneva desktop map](implementation/geneva-desktop.png)
- [Geneva mobile map](implementation/geneva-mobile.png)
- [Simulated hotel and two airports, real persisted Plan](implementation/hotel-and-two-airports.png)
