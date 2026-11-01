# Stay guest details A and per-room requests

Verified 1 November 2026. Application source: `be5e319`. Canonical local app: http://localhost:5174/plans. User selected prototype A and requested requests plus implementation. Refined prototype source: `prototype/stay-guests-20261101`, commit `7b01442`; preview http://localhost:5199/plans?prototype=stay-guests&variant=A. Prototype actions remain simulated.

## Delivered behavior

Separate booking contact name/email, explicit staying/someone-else choice, one main guest per room, and visible optional requests capped at 500 characters per room. Review shows the exact submitted contact, guests and requests before consent. Contact maps to LiteAPI holder and room email; each request maps to that room's guest `remarks`. Empty requests are omitted. Requests are subject to availability, not guaranteed. No separate arrival field; arrival preferences may be included in requests.

Invalid public-boundary guest input can be corrected without locking checkout; unknown provider outcomes retain existing recovery protection. Edits clear consent and require revalidation. The removed YOUR STAY summary card remains removed. Checkout remains sandbox only.

## Automated checks executed

- Frontend Vitest: `StayCheckout.test.jsx` and `FlightCheckout.test.jsx`: 34 passed.
- Frontend Vitest: `travelApi.test.js` and `PlanningCanvas.test.jsx`: 27 passed. Total: 61 distinct focused frontend tests.
- After final navigation/spacing changes, the 15 stay checkout tests passed again; `npm run build` passed. Existing bundle-size warning remains.
- `uv run --locked pytest services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_stay_confirmation.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py -q`: 79 passed, existing deprecation warnings only.
- Coverage includes separate holder and guests, multi-room remarks mapping, empty requests, name/email/request validation, backward-compatible sandbox callers, HTTP rejection before provider dispatch, authorization/ownership, and exclusion of contact/requests from durable projections. CRUD regression tests use actual handlers and database persistence.
- `git diff --check`: passed.
- Cognito prestart discovery and `bash scripts/start-local-ready.sh`: passed, including example-account sign-in/session/sign-out. Final running source hashes matched checkout, guest component, stylesheet, hook, API adapter, schemas, public route and private provider adapter.

## Actual Chrome DevTools journey

Used an owned isolated Chrome DevTools MCP browser and authenticated with the supplied example account. Password and tokens excluded from evidence. Created only a dedicated Lisbon verification Plan. Actual accommodation search returned provider inventory; selected Meliá Lisboa Aeroporto, 12–17 May 2027, two rooms, three guests, and prebooked through the real UI.

1. Verified the selected A preview with visible requests before implementation; captured `plan/selected-a-requests.png`.
2. Exercised production contact, staying/someone-else controls, room names and requests. Invalid email prevented progression. Filled fictional contact Robin Tester; room guests Jamie Tester and Sam Tester. Requests: “Quiet room, please.” and “Late arrival around 21:00, if possible.”
3. Navigated to review and back. Values survived; consent reset on revisiting/editing and confirmation required an explicit checkbox. Browser request auditing observed exactly one booking submission with both matching guest requests and `test_only` true.
4. Inspected desktop 1440×1050 and narrow 390×844 viewport layouts. Document width matched 390 without horizontal overflow; textarea maxlength was 500. Saved screenshots were visually inspected for overlap, clipping, readable labels and usable controls. Narrow viewport verification did not simulate touch input.
5. Submitted one fictional LiteAPI sandbox booking. Prebook, booking and confirmation persistence returned success. Confirmation showed both guest names, was saved in the Plan and downloaded through the actual UI.
6. Reloaded checkout. Saved confirmation and guest names recovered without a second booking submission. Actual canvas readback retained two guests and two rooms; contact and request text were absent from durable Plan data, as intended.
7. Deleted only the verification Plan through actual prepare/commit API contracts. Readback returned the documented deleted lifecycle and active GET returned 404. Closed the owned browser, leaving the local app/prototype servers running.

## Network, console and limitations

Sanitized request statuses are in `network.txt`. A stale research snapshot returned 409 after a local rebuild; refreshing research recovered with 200 and the complete booking path passed. This was not a booking failure. Final reload showed no console errors; an existing Lit development warning remained.

LiteAPI returned inconsistent room assignments. Existing confirmation behavior explicitly displayed “Room assignment not verified” and retained null assignment values rather than inventing a mapping. The provider confirmed the sandbox booking; it did not separately guarantee fulfillment of requests. Contact/request text is submitted but not retained in the confirmation or durable Plan. No real charge or reservation was made; sandbox provider records were not cancelled. No production deployment, push or merge was performed. Full repository suites were not run; focused regressions and browser gates passed. Broader Phase 18 acceptance remains unchanged.

## Evidence

- Plan: [selected A with requests](plan/selected-a-requests.png).
- Desktop: [contact](implementation/desktop-guests.png), [room requests](implementation/desktop-room-requests.png), [review](implementation/desktop-review.png), [confirmation](implementation/desktop-confirmation.png), [reloaded confirmation](implementation/reloaded-confirmation.png).
- Narrow viewport: [contact](implementation/mobile-contact.png), [requests](implementation/mobile-room-requests.png), [review](implementation/mobile-review.png), [confirmation controls](implementation/mobile-payment-controls.png).
