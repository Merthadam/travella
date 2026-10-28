# Guided flight checkout verification — 2026-10-27

Result: implemented and verified on `feature/guided-flight-checkout`, implementation commit `f9a0eaa`. The approved A guided flow and C document confirmation replace the old inline flight checkout. Stay checkout remains available. No production deployment or merge was performed.

## Design and implementation evidence

- Approved plan: [guided prototype](plan/a-guided-desktop.png), [document prototype](plan/c-trip-document-desktop.png), [prototype confirmation](plan/test-confirmation-desktop.png).
- [Passenger form, desktop dark](implementation/04-passengers-desktop-dark.png), [seat availability](implementation/05-seats-desktop-dark.png), [final review](implementation/06-payment-desktop-dark.png).
- [Recovered checkout, mobile](implementation/07-recovered-payment-mobile.png), [mobile payment consent](implementation/08-payment-consent-mobile.png).
- [Saved itinerary, desktop light](implementation/12-saved-itinerary-desktop-light.png), [mobile confirmation](implementation/10-confirmation-mobile.png), [mobile document actions](implementation/11-document-actions-mobile.png).
- [Confirmed Flights component](implementation/13-plan-confirmed-flight.png), [reopen receipt from Flights](implementation/14-reopen-from-flights.png).
- [Offline itinerary](test-flight-itinerary.html), [offline rendering](implementation/15-offline-itinerary.png).

All implementation screenshots were visually inspected. Desktop 1440×1000 and mobile 390×844 layouts remain readable without horizontal overflow; longer forms and receipts scroll vertically. Screenshot 02 preserves the early focus behavior; it was adjusted so step changes retain the sandbox banner at the top. The later screenshots show the final behavior.

## Real browser journey

Used Chrome DevTools MCP through the isolated `verify-live.py` bridge and the required example account. Credentials were loaded locally and never recorded. The implementation runs in its own Docker project `travella-flight-checkout` at http://localhost:5197, with separate database and checkout-journal volumes; another worktree's port 5174 stack was preserved. Startup health and real Cognito sign-in/session/sign-out checks passed. Final runtime files match the checkout; see [runtime hashes](runtime-hashes.json).

Created a task-owned Plan with confirmed Milan dates and a complete Canvas through the actual APIs, then exercised:

1. Flights component → airport selection BUD / MIL → real provider search → Nuitée Air result → flight details → dedicated checkout. Search returned real sandbox inventory including actual MXP endpoints. Verify showed the selected flight times and EUR 354.80 for two test passengers.
2. Browser Back returned to the same flight results; Forward reopened checkout. Reload before reservation showed the honest [empty recovery state](implementation/03-checkout-empty-after-reload.png). No offer or personal data appears in the URL.
3. Fictional passenger/contact defaults passed browser and backend validation. Reservation remained disabled until explicit fare/passenger consent. The actual LiteAPI prebook succeeded. Seats and extra bags were clearly unavailable; the actual personal-item allowance was displayed without fabricated extras.
4. Reload/mobile emulation recovered the existing reservation at final review. No passenger names or documents were reconstructed. Payment confirmation required fresh consent to the exact fare and saving the confirmation to the Plan.
5. Actual booking creation returned HTTP 201 at LiteAPI. The initial confirmation readback failed closed because the existing connector expected `booking.providerEnvironment`, while current provider readback uses `booking.ticketData.pointOfSale.environment`. The connector now accepts either explicit sandbox marker and rejects missing, production or conflicting markers. Regression tests cover both accepted shapes and rejection cases. The [initial error state](implementation/09-confirmation-error-mobile.png) never claimed confirmation.
6. After rebuilding, a status read recovered that same booking as CONFIRMED; no second booking was submitted. The Plan autosaved revision 5 with reference `01a17f3b-aac5-7699-8424-17cd744dcf49`, flight ND 5640 outbound on 2026-11-26, ND 3550 return on 2026-11-29, and EUR 354.80. All are sandbox data, not valid travel documents.
7. API readback confirmed `mock-booked` and the full allowlisted itinerary. The snapshot and browser storage contain no passenger names, birth dates, documents, contact values or card data. The opaque recovery handle was then removed; reload and reopening via the Flights component still displayed the saved document with **zero checkout/provider calls**.
8. Clicked Download itinerary and observed the download-started notice. Opened the same exported HTML independently through Chrome DevTools: correct reference, flights, fare and TEST ONLY label, with **zero external resource requests**. Native Print / Save as PDF is wired but the operating-system print dialog/PDF output was not exercised.
9. Final confirmation-page console had no errors (only the existing Lit development-mode warning); all final fetch/XHR requests were HTTP 200. During setup, an invalid optional-step skip and incomplete manually prepared Canvas fixture were corrected before feature testing. Rebuild-time session failures were resolved by reauthentication. The provider-readback failure above was fixed and rerun successfully.
10. Cleaned up only this task's Plan using the real challenge/delete API. Active detail returns 404; deleted detail reports `lifecycle=deleted` and a recovery deadline, preserving the documented seven-day recovery behavior. The example-account onboarding fixture and isolated stack remain available. The old prototype server on 5196 was stopped; its source remains on `prototype/flight-checkout-20261027`.

Detailed sanitized commands and browser observations: [browser-results.json](browser-results.json).

## Automated and HTTP persistence checks

| Executed check | Outcome |
| --- | --- |
| `npm test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx` from frontend | **73 passed, 12 skipped**; [log](frontend-tests.log) |
| `npm test -- src/features/plans/travel/FlightCheckout.test.jsx` after final focus adjustment | **8 passed**; [log](checkout-tests-final.log) |
| `uv run pytest services/mcps/tests/test_flight_checkout.py services/mcps/tests/test_liteapi.py services/crud/tests/test_canvas_mock_booking.py services/agent/tests/test_travel_api.py -q --tb=short` after readback fix | **75 passed**; [log](backend-tests.log) |
| `npm run build` after final frontend adjustment | **Passed**, existing bundle-size warning; [log](build.log) |
| `git diff --check` | Passed |

The 12 skipped tests are existing Research/Canvas agent-SSE fixture tests whose external fixture environment variables were not supplied. The changed deterministic checkout flow was exercised through both focused tests and real browser/provider requests. Existing Python deprecation and Node/Lit development warnings remain.

`services/crud/tests/test_canvas_mock_booking.py` uses actual FastAPI handlers and SQL persistence. The itinerary tests create a Plan, obtain the exact save challenge, PUT/read the itinerary, repeat idempotently, update total and read back preserved fields, reject stale revisions, clear the booking and read back absence. They verify 401 unauthenticated, 404 foreign-owner and missing-resource behavior, and 422 invalid/sensitive fields without writes. Legacy flight/stay summaries remain compatible. The live browser independently saved/read the confirmed itinerary and exercised Plan soft-deletion for cleanup.

Connector/frontend coverage includes explicit consent, refreshed fare, transient party forwarding, no PII in sealed receipts/projections, invalid party rejection before provider calls, at-most-once prebooking, lost-response recovery, pending polling, leaving during submission, sandbox readback validation, legacy receipt display and HTML escaping.

## Scope and provider limits

This is a sandbox flight flow using the configured sandbox account payment. Seat purchases, additional baggage purchases and card-entry/payment-SDK integration are not connected; the UI says so. No reusable passenger profile is created. One saved flight is retained per Plan through the UI. Whole-Plan export and live ticket issuance remain outside this change.

Provider references checked during implementation: [flight prebook](https://docs.liteapi.travel/reference/post_flights-prebooks), [booking readback](https://docs.liteapi.travel/reference/get_flights-bookings-bookingid), [flight sandbox environments](https://docs.liteapi.travel/docs/getting-access-to-flights). The nested environment compatibility fix is based on the actual sandbox readback observed in this verification run.
