# Passenger validation verification

Date: 2026-10-31. Source commit: `8ee3113`. App: http://localhost:5174.

## Changes and acceptance

- Passenger and contact names reject whitespace-only input. Server validators also reject blank names and trim accepted names; hotel guest behavior is unchanged.
- Birth dates are checked against age at outbound departure. Adults must be 12–120, children/infants must match the exact priced age. Invalid calendar dates and future birth dates are rejected.
- Passport expiry must be strictly after the return date, matching the server. The date control minimum is the following day, including year rollover.
- Required and format errors appear beside passenger/contact inputs after blur or Continue, are linked through aria-describedby/aria-invalid, and clear as values are corrected. Continue focuses the first invalid field and sends no reservation request for invalid input. Country controls also accept inline errors.
- Consent remains explicit and resets after edits. Existing server/provider error handling and reservation recovery remain in place.

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel`: 266 passed, 12 existing fixture/SSE tests skipped. Added birthday/age boundaries, leap-date validity, expiry rollover, whitespace/malformed inputs, blur feedback, first-invalid focus, blocked requests and successful correction.
- `uv run --locked pytest services/agent/tests/test_travel_api.py services/mcps/tests/test_flight_checkout.py -q`: 36 passed. FastAPI HTTP tests exercise blank first/last passenger/contact names returning 422 before any provider call. Connector tests verify blank names cannot claim/reserve and corrected retry succeeds. Existing tests cover authorization and other invalid passenger rules. Initial new HTTP test lacked the required auth scope (401); corrected its fixture, then reran successfully. Existing dependency deprecation warnings remain.
- `npm --prefix frontend run build`: passed; existing chunk-size warning.
- `git diff --check`: passed.
- Local Cognito read-only precheck and `bash scripts/start-local-ready.sh`: passed auth sign-in/session/sign-out checks. Docker hashes matched FlightCheckout, validation helper, SearchSelect, stylesheet and server contracts.

## Actual Chrome DevTools journey

Used the authenticated example account and the existing verification-owned Plan. Restored that Plan, searched fresh BUD–LIS sandbox flights, opened View flight and continued to Passengers.

1. Entered a whitespace-only given name and tabbed out: inline error appeared and aria-invalid/aria-describedby identified it.
2. Entered an adult birth date of 2020-01-01 and passport expiry on the 2027-05-17 return date. Chrome DevTools fill did not update the native date controls, so date values were entered through their native DOM setters and dispatched input/change events in the real page.
3. Confirmed consent and clicked Reserve test fare & continue: stayed on Passengers, first given-name field received focus, all three specific errors appeared, and browser resource records showed zero prebook requests.
4. Captured desktop 1440×1000 and mobile 390×844 screenshots. Inspected both: error text wraps, no overlap or horizontal clipping. Browser document width check also passed.
5. Corrected the given name: its error cleared immediately and the other two remained. Used Fill with test passengers: all errors cleared and consent was reset.
6. Reconfirmed consent and clicked Continue: exactly one prebook POST returned 200 and Seats opened. No payment or final booking was submitted.
7. Inspected console/network: initial expired research snapshot returned a documented 409, then fresh search and prebook succeeded. Existing Lit dev warning and form id/name advisory remain; no validation-related runtime failures.
8. Soft-deleted only the verification-owned Plan and read it back as deleted with a recovery deadline. Left app running at My plans.

## Evidence

- [Before, supplied screenshot](plan/before.png)
- [Desktop errors](implementation/passenger-errors-desktop.png)
- [Mobile errors](implementation/passenger-errors-mobile.png)
- [Corrected submission reaches Seats](implementation/corrected-passengers-continue.png)

Scope is sandbox passenger validation, not real-ticket booking certification. The 12 skipped tests are not claimed as passing. Wider phase acceptance is unchanged.
