# Guided Stays checkout verification

Status: passed for the agreed sandbox checkout scope. Broader Phase 18 acceptance remains open.

Correction after user report: the initial checks used programmatic scrolling and missed an overflow:hidden lock after entering checkout from the workspace. Fixed and verified with Chrome PageDown/PageUp in `../2026-10-29-stays-scroll/verification.md`.

## Scope and accepted behavior
One stay reservation per Plan, including multiple rooms. Sandbox-only guided review → guest names → exact final consent → provider confirmation → durable Plan record. Download a standalone HTML confirmation or print/save PDF. Cancellation terms/deadline are displayed; cancellation actions and the finalized-Plan documents page remain deferred. The user chose discussion without alternative prototypes.

The reservation retains allowlisted property, room, guest, date, reference, price, tax and cancellation evidence. Final booking details take precedence when complete; prebook fallbacks are explicitly labeled. No contact fields, payment credentials, checkout handles or raw supplier responses enter the saved document. Private guest details are removed before agent context/checkpoints.

## Automated checks executed
- Backend integration/regression command in `backend-tests.log`: 337 passed. Covers actual FastAPI HTTP handlers and SQLAlchemy persistence, supplier contract fixtures, auth proxy and agent limits, flight regression and manual/assisted travel observation.
- Final backend suite includes receipt lifecycle/projection coverage: startup and idle pruning, transient cleanup failure recovery, final-room ordering/taxes, unknown submission locking, identity mismatches and prior provider booking after receipt expiry.
- Frontend command in `frontend-tests.log`: 138 passed across StayCheckout, useStayBookingSync, FlightCheckout, TravelSearch, TravelWorkspace and usePlanningCanvas persistence.
- Production frontend build in `build.log`: passed; existing bundle-size advisory remains.

## CRUD HTTP/database evidence
`services/crud/tests/test_stay_reservation.py` creates a Plan, obtains exact-write challenges, saves the full two-room confirmation and reads back equality. It updates confirmation fields and verifies preserved content, replays idempotently, soft-deletes and observes404, restores and reads back the document, and advances seven days to verify actual database purge. Invalid/private fields and invalid room numbering return422 without a write; unknown provider room assignment is explicitly nullable. A different stay reference returns400 and preserves the existing document.

`test_canvas_mock_booking.py` covers missing authentication401, foreign owner404, missing Plan404, stale revision409 and legacy summaries. `services/auth/tests/test_stay_body_limits.py` exercises authenticated cookie-proxy HTTP persistence above the old16KB limit and verifies the65,536-byte cap; unrelated routes retain their former limits.

## Browser environment and evidence
Chrome DevTools MCP, isolated headless Chrome, authenticated as the supplied example account. `verify-live.py` reads credentials privately and redacts sensitive headers/handles from recorded tool results. No model calls were made for test setup.

Initial shared localhost5174 testing exposed a real long-cancellation-policy validation mismatch, fixed in both backend and frontend with regression tests. Another workspace then replaced the shared stack; the test Plan from that stack was soft-deleted and canvas404 verified. Final verification uses isolated Compose project `travella-stays-checkout`, frontend5198/auth8018/agent8118, preserving all unrelated workspaces and volumes.

Docker reached its6GB memory limit. A temporary2GB swap file at `/var/tmp/travella-stays-verification.swap` inside Colima relieved memory pressure without stopping other stacks. It was not configured in fstab. After memory pressure fell, swapoff succeeded and the temporary file was removed. No unrelated containers or volumes were stopped or deleted.

- Planning sketch: `plan/checkout-sketch.png` (simulated design, inspected).
- Initial search error: `implementation/search-error.png` (before validation fix).
- Final implementation screenshots: `implementation/confirmation-desktop.png`, `implementation/consent-mobile.png`, `implementation/confirmation-mobile.png`, `implementation/receipt-mobile.png`, and `implementation/saved-plan-desktop.png`. All inspected: no horizontal overflow, overlapping controls or unreadable receipt content at desktop 1440×1000 and mobile 390×844. The panel scrolls vertically.
- Earlier review/guest screenshots were inspected; `review-pay-mobile.png` is a 500px narrow viewport, superseded by the actual 390px `consent-mobile.png`. Loading, pending and empty checkout states are retained as supporting evidence.

## Provider contract references
[LiteAPI hotel integration guide](https://docs.liteapi.travel/docs/hotel-integration-guide), [booking confirmation details](https://docs.liteapi.travel/reference/get_bookings-bookingid), [booking submission](https://docs.liteapi.travel/reference/post_rates-book).

Unknown submission outcomes never authorize another booking. The UI explains the unresolved state and status/provider-support path. Temporary technical receipts expire after seven days from their signed issuance time; service startup and idle maintenance prune them. The canonical saved confirmation follows Plan deletion/recovery/purge. A provider-reported hotel/date/prebook mismatch is withheld instead of constructing a mixed confirmation.

## Final authenticated browser results

Chrome DevTools exercised destination selection, two rooms with one adult each, fresh room availability, prebook review, guest entry, exact final consent, sandbox confirmation, download, print invocation and saved-Plan reopening. Confirmation was disabled before consent. The first run also left checkout while submission was pending; background synchronization saved its confirmed result.

Final test Plan `78532b6d-bdd5-439f-97a1-f4dae176fc57` received LiteAPI sandbox reference `a6cXAOsh6` for Meliá Lisboa Aeroporto, May 12–17 2027, two rooms, EUR 1670.06. HTTP canvas readback at revision4 contained both Alex Tester and Sam Tester, two room descriptions, city tax EUR20.17 per room and cancellation deadline May8 with EUR835.03 penalties. Booking total came from final booking evidence; incomplete room terms remained explicitly labeled prebook evidence.

The live provider duplicated occupancy_number and nested guest data. The final fix preserves each room-level lead name and uses null room assignment instead of guessing. Both UI and offline document explain this uncertainty. Regression fixtures cover the observed response. A second real sandbox checkout on the rebuilt code verified the fix.

Removed the technical receipt from sessionStorage and reloaded: confirmed=true, saved=true, receiptAbsent=true. Reopening through the Plan accommodation card → View stay confirmation also succeeded. No checkout handle enters the URL. A POST to sandbox/prebook against the saved Plan returned409/stay_already_booked before provider processing.

Clicked Download confirmation and inspected the resulting Blob, saved as `implementation/downloaded-confirmation.html`: both guest names and uncertainty labels are present; no email address or encrypted handle is present. The standalone document has no external dependencies. An initial broad @ scan matched CSS @media; the email-pattern recheck was negative. Print / save as PDF invoked the browser beforeprint event. PDF file output was not generated; full-term print expansion/restoration is covered by frontend tests.

Final console inspection had no application errors; only the existing Lit development warning. Network inspection after persisted reload showed successful application requests; the deliberate second-checkout409 and post-delete404s were expected. Earlier search validation failure was fixed and the entire search/checkout path rerun successfully. Automated tests cover duplicate submission suppression and unknown-outcome recovery; no live payment, model call or actual reservation was made.

Both isolated test Plans (`7514e1fc-bc95-4d57-a88e-970cf7e688f1` and the final Plan above) were soft-deleted through exact-write challenges and their subsequent canvas reads returned404. The earlier shared-stack test Plan was also cleaned up. Sandbox supplier records were not canceled; cancellation is outside this scope. Final auth health/sign-in/session/sign-out check passed (`final-auth.log`). Representative app and connector source hashes all match (`runtime-hashes.json`). Local preview remains http://localhost:5198/plans.

## Executed commands

```sh
uv run --locked pytest services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_stay_confirmation.py services/mcps/tests/test_stay_maintenance.py services/mcps/tests/test_flight_checkout.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py services/crud/tests/test_topic_conversations.py services/agent/tests/test_travel_api.py services/agent/tests/test_travel_client_limits.py services/auth/tests/test_stay_body_limits.py services/auth/tests/test_travel_proxy.py services/agent/tests/test_canvas_travel.py -q --tb=short
# frontend/
npm test -- src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/useStayBookingSync.test.jsx src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx
npm run build
# repository root
TRAVELLA_LOCAL_ORIGIN=http://localhost:5198 uv run --locked python scripts/check-local-auth.py
```

Warnings: Python datetime adapter deprecations and existing frontend bundle-size advisory. No skipped checks in these final targeted suites. Full repository tests, live payments and generated PDF output were not part of this verification. Cancellation actions and the finalized-Plan documents page are deferred as agreed.
