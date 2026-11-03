# Passenger ticket records — 2026-11-03

## Result and scope

Flight confirmations now offer an explicit **Load passenger tickets** action and one HTML download for each issued passenger ticket record. It works when reopening an existing saved flight without a browser checkout token. Each document contains only its passenger name/index, provider ticket number/status, issuance time, booking reference, common flight legs and that passenger's saved extras. Documents open offline and can be printed as PDF. They explicitly identify themselves as Travella-generated sandbox records, not airline originals or boarding passes.

The new authenticated POST `.../travel/sandbox/flights/tickets` is a read-only lookup. The connector checks an existing encrypted receipt against both subject and Plan before any supplier request, then makes only GET booking-details requests. It validates booking identity and sandbox environment, preserves explicit passenger indices and rejects mismatched passenger associations. Only allowlisted fields leave the connector. Passport, contact and payment fields are never returned or newly persisted. No CRUD mutations, new bookings or payments were introduced or submitted.

Official provider reference checked: https://docs.liteapi.travel/reference/get_flights-bookings-bookingid . Real scoped sandbox response inspection confirmed zero-based passenger indices, matching first/last names and `issued` status. No supplier PDF URL was provided. This feature generates individual ticket records from that data; it does not integrate an airline-original PDF endpoint.

## Automated checks executed

- `uv run --locked pytest -q services/mcps/tests/test_flight_tickets.py services/mcps/tests/test_flight_checkout.py services/agent/tests/test_travel_api.py`: **47 passed**.
- These include actual FastAPI HTTP handlers with a temporary SQLite receipt journal: unauthenticated 401, foreign/missing/deleted-scope behavior via ownership checks, unknown booking 404, malformed/extra input 422, authorized lookup 200, no-store response and private-field exclusion. Connector tests cover subject/Plan/key isolation before provider I/O, mismatched booking/environment, missing first ticket without passenger shifting, pending/cancelled bookings and GET-only supplier requests. Provider HTTP is mocked for isolated tests; live checks below supplement them.
- `npm --prefix frontend test -- src/features/plans/travel/PassengerTickets.test.jsx src/features/plans/travel/FlightCheckout.test.jsx`: **34 passed**.
- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: final **356 passed, 12 existing skips**.
- First broad run found an existing payment-test timing race (`events.ready` called before registration). The test now waits for callback registration; production payment code unchanged. Broad suite then passed.
- Frontend tests cover explicit loading, separate downloads, missing tickets, pending/cancelled bookings, failure/retry, response identity, unmount cancellation, per-passenger document isolation, HTML escaping, private-field exclusion and refusal of unissued ticket documents.
- `npm --prefix frontend run build`: passed; existing large-chunk advisory remains.
- `uv run --locked ruff check services/mcps/flight_tickets.py services/mcps/tests/test_flight_tickets.py`: passed. `git diff --check`: passed. Existing Python dependency deprecation warnings remain.

## Real browser and API checks executed

Actual isolated Chrome DevTools MCP, authenticated with the configured example account; canonical URL http://localhost:5174. Used the existing two-passenger Lisbon test booking. No user Plan modified, no new test Plan or booking created.

1. Rebuilt through local-stack skill, readiness/authentication passed. Changed app source hashes matched the container. A connector hash differed after an import-format fix; rebuilt that service and verified all three connector files matched. Database/journal volumes preserved.
2. Reopened saved flight, explicitly loaded tickets through real Agent → MCP → LiteAPI. Two issued records appeared with correct passenger names and distinct numbers; POST returned 200.
3. Clicked both actual download controls. Captured the exact HTML blobs passed to browser download links, asserted each excludes the other passenger/name/ticket and private fields, saved copies and opened both as local files in Chrome. Both render offline with zero scripts and correct individual seat assignment. These downloaded-file copies and screenshots are linked below.
4. Reloaded/revisited desktop and mobile; the saved booking remains available, tickets load again through read-only lookup. No ticket details are stored in the Plan or browser persistent storage by this feature.
5. Desktop 1440×1000 and mobile 390×844: both ticket cards/buttons usable, long references wrap, no horizontal overflow. Detail screenshots are scrolled views, with the fixed app header remaining above the content.
6. Browser-only synthetic failure for this one ticket endpoint: error and Retry appeared, obsolete download controls disappeared. Removed interception and retried real provider: both records returned. Browser-only synthetic empty response: both passengers correctly showed “No ticket record supplied yet” and zero download buttons. Fixtures labeled in screenshots, removed by reload; no server records altered.
7. Real HTTP boundary checks in browser: omitted credentials **401**, another owned Plan requesting this booking **404**, malformed booking ID **422**. Final valid reload and ticket lookup **200**.
8. Final console/network inspection: no unexpected errors or failing application requests; existing Lit development warning only. Deliberate negative HTTP checks produced expected 401/404/422. All saved screenshots visually inspected for readable content, association and layout.

No create/update/delete API was changed, so no CRUD write sequence was applicable. Temporary SQLite fixtures cleaned by pytest. Physical printing/browser PDF saving and live production airline tickets were not exercised. Access relies on the retained encrypted checkout receipt and its signing key; if unavailable, the existing itinerary remains accessible and ticket lookup reports an error.

## Evidence

- [Before](plan/before-flight.png) · [Layout sketch](plan/ticket-records-sketch.png)
- [Desktop](implementation/tickets-desktop.png) · [Mobile](implementation/tickets-mobile.png)
- [Retry error fixture](implementation/retry-error-fixture.png) · [Missing-ticket fixture](implementation/no-tickets-fixture.png)
- [Passenger 1 downloaded HTML](implementation/passenger-1-ticket.html) · [Rendered document](implementation/passenger-1-document.png)
- [Passenger 2 downloaded HTML](implementation/passenger-2-ticket.html) · [Rendered document](implementation/passenger-2-document.png)

Local worktree only; no main merge, push or production deployment for this task.
