# Booked hotel on the global map

Date: 2026-11-05. Canonical preview: http://localhost:5202.

## Result

The existing example-account Lisbon Plan now shows Internacional Design Hotel on its main Google map alongside São Jorge Castle, Praça do Comércio and Time Out Market. One hotel pin is persisted with the reservation's provider coordinates (38.713055, -9.138499), and remains after a browser reload. No additional reservation was created.

The bug dropped coordinates between the provider search and checkout receipt, and the booking callback only updated the accommodation card. Coordinates now survive offer → prebook → confirmation → saved reservation. Confirmation adds a stay pin through normal canvas autosave. Legacy reservations recover coordinates using the exact provider hotel ID. Unknown/mismatched locations are not guessed. Repeated status updates preserve the location and do not duplicate pins or undo explicit pin edits/removal. Matching cancellation removes only the booking's managed pin.

## Browser verification — actual Chrome DevTools

- Authenticated with the supplied example account on port 5202.
- Before: confirmed hotel card, three food/activity places, no hotel marker.
- Recovery: exact hotel detail GET 200; canvas challenge POST 200; canvas PUT 200; subsequent canvas GET 200 contains four pins and the same hotel coordinates in the reservation and stay pin.
- Clicked Stays, selected the hotel marker, verified the matching place expands, and restored All places. All three existing places remain.
- Reloaded the Plan: exactly one booked hotel pin and four places persisted.
- Desktop 1440×900 and narrow 390×844 exercised. No horizontal overflow; hotel pin and matching details usable. Screenshots visually inspected.
- After reload: no console errors or failed fetch/XHR requests. Existing Lit development-mode and Google Advanced Marker event warnings remain. Initial signed-out `/auth/session` 401 was expected.
- Initial readiness sign-in returned HTTP 503 during startup. After app health and Cognito network checks passed, browser sign-in and the independent sign-in → session → temporary sign-out checker both passed. No credentials changed.
- SHA-256 source matches verified in the running app for the hook, schema, shared booking model and checkout; connector container matches verified for checkout, confirmation and shared model.

## Automated verification

`cd frontend && npx vitest run src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/useBookingSync.test.jsx`

85 passed. Covers new confirmations, pending/no-location states, legacy exact-ID recovery, duplicate prevention, saved reload, cancellation identity, preserved activities and explicit pin removal.

`uv run --locked pytest -q --tb=short services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_stay_confirmation.py services/crud/tests/test_stay_reservation.py services/crud/tests/test_canvas_mock_booking.py services/auth/tests/test_stay_body_limits.py`

86 passed. Provider integration verifies location through offers/prebook/booking/status. Real FastAPI handlers and a SQLAlchemy test database verify create/read/update, exact saved location and pin, idempotency, invalid coordinates, ownership/authentication boundaries, missing records, soft delete/restore, and purge after recovery expiry. An outdated proxy assertion was corrected to account for existing guest/contact defaults; production proxy behavior is unchanged.

`cd frontend && npm run build` and `git diff --check` passed. Existing large-bundle and dependency deprecation warnings remain.

The map's existing 50-place limit remains; a full map keeps the confirmed reservation and reports that its pin could not be added. Live testing reused the user's existing sandbox confirmation; fresh checkout transitions were covered by automated integration tests.

## Evidence

- [Before: hotel missing](plan/before-booked-hotel-missing.png)
- [Desktop: hotel on global map](implementation/booked-hotel-global-map.png)
- [After reload](implementation/hotel-pin-after-reload.png)
- [Narrow layout](implementation/hotel-pin-mobile.png)
