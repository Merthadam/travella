# Checkout trip map verification — 4 November 2026

Status: implemented and verified for the post-confirmation map journey. User declined interactive prototypes, chose pins inside Travella and approved implementation with existing-place reuse.

## Delivered behavior

Confirmed stays offer the booked hotel; confirmed flights offer the destination arrival airport and the return departure airport when different. No pin is added automatically. Exact saved identities offer View; uncertain legacy matches require a choice. Association preserves the existing ID, edited coordinates, description and Google metadata. New places use validated provider coordinates or the shared airport catalogue. Missing location evidence stays unavailable. Save acknowledgement, retry, duplicate prevention, the 50-place limit and revision conflicts use the existing canvas persistence contract.

## Browser and visual evidence

The original shared Chrome DevTools profile conflict was resolved using an isolated Chrome DevTools MCP process (`--isolated --headless --no-usage-statistics`); no existing browser was stopped. The planning sketch was captured and inspected before feature verification. The running app was inspected with Chrome DevTools, authenticated as the designated example account. Credentials are absent from these artifacts.

Local runtime: isolated Docker project `travella-checkout-map`, frontend http://localhost:5200, auth port 8020 and agent port 8120. Secret/Cognito prechecks and example-account runtime authentication passed. Other stacks were left untouched.

One isolated Plan was created through the real authenticated API with clearly labeled test confirmation fixtures: a hotel with an existing manually positioned pin, outbound BUD–MXP and return LIN–BUD. These simulated confirmed documents exercised the affected post-confirmation journey; this run did not submit or verify a new supplier payment/booking.

Observed checks:

- Hotel Review → Use this saved place persisted the LiteAPI identity on the existing pin. Readback retained its ID, edited position (45.4643, 9.19) and traveler note. View selected/focused that place on the actual embedded Google map.
- Arrival airport Add persisted MXP. A one-shot injected canvas PUT 503 left LIN unsaved and displayed an accurate failure with Retry saving. Readback contained only hotel and MXP. Retry persisted LIN once.
- Reload retained exactly three pins and their source identities. Both airports then offered View rather than Add.
- At a 390 × 844 mobile viewport, View selected Malpensa on the map and revealed its place details. Measured document width equaled viewport width; no horizontal overflow.
- Desktop and mobile screenshots were visually inspected. A dark-mode review contrast issue found during inspection was fixed using design-system tokens, then light and dark review screenshots were recaptured and inspected.
- Console inspection found no application errors (only the existing Lit development warning). Sanitized same-origin fetch/XHR network evidence contains successful 200 responses. The deliberate 503 is documented separately.
- Final hotel association readback again contained exactly three identities and preserved the edited hotel data. The created test Plan was then soft-deleted and its subsequent read returned 404. The temporary credential-bearing sign-in script was removed.

Screenshots:

- [Planning sketch](plan/confirmation-map.png), [HTML source](plan/confirmation-map.html).
- [Hotel matching review, light](implementation/hotel-review-light.png) and [dark](implementation/hotel-review-dark.png).
- [Existing hotel selected on the map](implementation/hotel-existing-pin-focused.png).
- [Confirmed airports, desktop](implementation/airports-desktop-dark.png) and [390px mobile](implementation/airports-mobile-dark.png).
- [Selected airport on mobile map](implementation/airport-pin-mobile.png).
- [Failed save and retry action](implementation/save-failure.png).
- `implementation/dark-review-before-contrast-fix.png` is historical diagnostic evidence, not the final appearance.

Stored-state evidence: [failed save](save-failure.json), [retry](retry-success.json), [reload](after-reload.json), [network statuses](network-status.json), [cleanup](cleanup.json).

## Automated checks

### Frontend

`npm --prefix frontend test -- src/features/plans/travel/bookingLocations.test.js src/features/plans/travel/ConfirmationMapActions.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/CheckoutMapFocus.test.jsx`

Result: **100 passed across 8 files**. Includes eligible airport endpoints, exact/uncertain matches, old/missing coordinates, lookup cancellation, saved acknowledgement, failure/conflict/limit states, duplicate actions, existing-pin preservation and View navigation/filter clearing. [Log](frontend-tests.txt).

`npm --prefix frontend run build`: passed; existing chunk-size advisory remains. [Log](build.txt).

### Backend and actual CRUD HTTP persistence

`uv run pytest services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_stay_confirmation.py services/mcps/tests/test_liteapi.py services/crud/tests/test_checkout_map.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py -q`

Result: **123 passed**. [Log](backend-tests.txt). After adding the agent-projection assertion, the six checkout-map HTTP tests passed again.

`services/crud/tests/test_checkout_map.py` uses actual FastAPI handlers and the SQLite test database:

| Operation/check | Expected and observed result |
| --- | --- |
| Create Plan, save and read canvas | Successful response; persisted complete snapshot equals submitted data |
| Associate existing hotel | Readback preserves original fields and adds only source identity |
| Add airport and idempotent replay | Successful save/replay; readback contains one intended airport |
| Stale revision | 409; existing snapshot retained |
| Unauthenticated / other traveler | 401 / 404 for read, challenge and update |
| Remove airport | Subsequent read excludes removed pin |
| Delete / restore Plan | Deleted canvas returns 404; restore returns 200 and original saved snapshot |
| Duplicate source, invalid code/category/coordinates/private fields | 422; no snapshot persisted |
| Agent projection | Source identity retained; private stay reservation excluded |

Connector tests also verify hotel-coordinate propagation through sealed offers, reconstructed prebooking state and recovered confirmation, plus valid zero and invalid coordinates.

`git diff --check`: passed. `uv run ruff check services/map_locations.py`: passed.

## Limits and existing failures

A broader agent-to-frontend regression run produced 298 passes and five travel-search failures around legacy request-count assumptions. A representative `CanvasTravelJourney.test.jsx:120` failure (expected two requests, received four after reference-catalogue loading) was reproduced on unchanged HEAD in an isolated baseline checkout: [baseline log](baseline-search-test-failure.txt). This broader suite is not green; these unrelated search tests were not changed here.

Fresh supplier payment, live booking, external Google-account saving, live provider outage and real concurrent-tab browser interaction were not rerun. Relevant contract/error/concurrency behavior is covered by the focused tests, but this is not full production-booking acceptance. Existing phase-level acceptance remains unchanged.
