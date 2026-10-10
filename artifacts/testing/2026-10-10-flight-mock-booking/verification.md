# Sandbox flight checkout verification — 2026-10-10

Result: verified locally at **http://localhost:5474**, Compose project `travella-liteapi-fresh`. The existing search design A was retained, as selected earlier in this session.

## Observed problem and change

Flights previously stopped at itinerary details. The new sandbox path verifies a selected offer, collects explicit test consent, creates a provider prebook with fictional passengers, presents the refreshed final fare, and completes simulated payment after a second explicit confirmation. Provider readback determines confirmation. Pending bookings are checked automatically for up to one minute and can also be checked manually.

The confirmed flight updates the canvas draft as **Mock booked**. **Save plan** explicitly persists its non-sensitive reference, airports and dates. Saving, reopening, trip edits, and concurrent checkout/save handling preserve independent stay and flight summaries. Search results and checkout handles are not persisted in the canvas.

The connector rejects live keys and foreign traveler/Plan handles before calling the provider. A persistent local journal stores encrypted technical receipts, preventing repeat prebooks for the same offer and enabling recovery after container recreation. Booking retries reuse the provider's prebook ID. A prebook with an uncertain response is not automatically repeated or claimed successful.

## Authenticated Chrome DevTools journey

Used Chrome DevTools MCP through the isolated local bridge and the configured example account; credentials were read from the local test-account file and never recorded. Also signed out, explicitly signed back in with that account, and reopened the saved test Plan successfully.

1. Created a separate test Plan and opened its canvas → Flights.
2. Chose Budapest BUD and Rome FCO using provider airport suggestions; return dates **20–23 November 2026**, two adults, Hungary, EUR.
3. Searched LiteAPI, filtered to **Nuitée Air**, opened an itinerary, and selected **Try mock flight booking**.
4. Observed verification/loading and the verified **€356.66** return total. The prebook button remained disabled until test consent.
5. Started the mock reservation. The provider returned the prebook and refreshed final itinerary/fare. Completion required fresh consent.
6. Intentionally went offline before completion. The UI reported failure without confirmation; the same checkout remained recoverable. Restored connectivity, read its status, and completed that same prebook on a **390 × 844** viewport.
7. LiteAPI readback reported **CONFIRMED** in its **sandbox** environment. The screen displayed a test booking reference and confirmation. No real ticket or payment was created.
8. Returned to the canvas: flight card showed **Mock booked**, BUD ↔ FCO, and the dates; accommodation remained **Not booked**. The draft was unsaved until **Save plan**.
9. Saved, reloaded, and observed **Saved plan loaded** with the flight state intact. Rebuilt the containers, reloaded again, opened **View mock flight**, and recovered the same provider-confirmed checkout with a status request.
10. Soft-deleted only the test Plan through its challenge/DELETE API: delete **200**, active read **404**, recoverable read **200**. The pre-existing user's Plan and unrelated stacks were preserved.

Initial airport queries returned temporary 503s while services were settling; repeating the lookup succeeded. Rebuild-time session 401/500 events did not persist. After the final healthy reload, authentication, canvas read, and flight status requests returned **200**; Chrome reported **no console errors**, only the existing Lit development-mode warning. The intentional offline failure and a malformed cleanup request ID (corrected before cleanup) are test artifacts, not successful requests.

## Evidence inspected

All saved images were opened and inspected. Desktop and mobile checkout content wraps and scrolls; consent, completion, recovery, and closing controls remained accessible. Test references wrap on mobile. No horizontal clipping, overlapping controls, credentials, or unrelated personal data were observed.

- [Before: flight search without checkout](plan/before-flight-search.png)
- [Verification loading](implementation/verification-loading.png)
- [Verified fare and consent](implementation/verified-fare.png)
- [Offline recovery](implementation/offline-recovery.png)
- [Mobile final fare](implementation/mobile-final-fare.png)
- [Mobile explicit confirmation](implementation/mobile-consent.png)
- [Mobile provider confirmation](implementation/mobile-confirmed.png)
- [Desktop provider confirmation](implementation/desktop-confirmed.png)
- [Canvas draft](implementation/canvas-mock-draft.png)
- [Saved canvas reloaded](implementation/canvas-reloaded.png)
- [Saved flight card after reauthentication](implementation/saved-flight-card.png)
- [Saved flight detail](implementation/saved-flight-details.png)
- [Provider status recovery after rebuild](implementation/recovered-confirmation.png)

## Automated checks

**78 backend tests passed**:

```sh
uv run --locked pytest services/mcps/tests/test_flight_checkout.py services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_liteapi.py services/crud/tests/test_canvas_mock_booking.py services/crud/tests/test_api.py services/agent/tests/test_travel_api.py -q
```

Connector tests cover verify/reprice, no prebook without consent, HTTP 201, trailing-slash endpoint, pending/confirmed/cancelled readback, lost responses, repeat prebooks, stable booking retries, scope isolation, live-key rejection, and rejection of a production-environment confirmation. Existing hotel and travel tests also pass.

CRUD tests use actual FastAPI handlers and a test database. They verify challenge-required saves, readback, idempotency, stale-revision rejection, flight-state updates with stay data preserved, invalid mode/summary combinations, unauthenticated/foreign-owner access and missing records. Browser save/reload additionally exercises the complete deployed local path.

**21 frontend tests passed**:

```sh
npm --prefix frontend test -- src/features/plans/travel/FlightSandboxCheckout.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/TravelSearch.test.jsx
npm --prefix frontend run build
```

Tests cover both consents, changed totals, automatic pending-status checks, timeout recovery without a repeat prebook, one-time confirmation notification, real canvas hook save/reload, concurrent-save preservation, and existing hotel/navigation flows. Production build passed; Vite retained its existing large-chunk advisory.

Local startup used the repository's Cognito precheck and `scripts/start-local-ready.sh` with `COMPOSE_PROJECT_NAME=travella-liteapi-fresh`, frontend 5474, auth 8403, agent 8404. Ready-script authentication checks passed. SHA-256 comparisons matched the checkout for the running app's flight checkout/search and CRUD files and the connector's flight checkout/handle files. `git diff --check` passed.

## Provider evidence and limits

Official contracts consulted: [flight access and E2E testing](https://docs.liteapi.travel/docs/getting-access-to-flights), [booking flow](https://docs.liteapi.travel/docs/build-a-flight-booking-experience), [verify](https://docs.liteapi.travel/reference/post_flights-verify), [prebook](https://docs.liteapi.travel/reference/post_flights-prebooks), [booking completion](https://docs.liteapi.travel/reference/post_flights-bookings), [booking details](https://docs.liteapi.travel/reference/get_flights-bookings-bookingid).

The configured sandbox key was also probed directly: prebook exposed `ACC_CREDIT_CARD`; completion required `/flights/bookings/`, returned 201 with pending status, and subsequent readback confirmed sandbox completion. No card data was submitted.

This verifies mock bookings with Nuitée Air, not every sandbox airline. Provider availability and offer expiry still apply. Live ticketing, optional seats/bags, cancellation UI, and real payments are outside this fix. Checkout recovery handles expire after seven days; the deliberately saved canvas summary persists. The local journal uses its own Docker volume; a horizontally scaled deployment would need a shared receipt store before supporting this sandbox checkout there.
