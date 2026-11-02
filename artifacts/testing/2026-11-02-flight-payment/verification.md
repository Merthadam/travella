# Flight payment matches accommodation B

Application commit: `97c405c`.

User chose a direct match to accommodation on 2 November 2026. The approved visual reference is [accommodation B](plan/accommodation-reference.png). The final flight step now uses a centered 660px card, prominent exact provider total and route/dates, expandable itinerary/passenger/seat/baggage/fare details, separate Stripe-hosted card fields, billing name/country/postcode and a full-width Pay button. Earlier flight steps, explicit consent and confirmation persistence remain intact. Legacy reservations without a payment intent retain their existing confirmation path.

## Automated checks

- Frontend travel and PlanningCanvas regression suite: 343 passed, 12 existing external-fixture/SSE skips. Command: `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`.
- Focused checkout tests: 25 passed, including complete hosted-field/consent gating, decline without booking, and booking only after successful test authorization. Existing recovery tests updated for the new heading and total location.
- FlightPayment and StayPayment checks: 10 passed, covering split-field readiness, billing sent only to Stripe, decline/retry, already-authorized recovery, lost authorization response, live-intent rejection, loader retry and processing-intent lockout.
- Production build passed; existing large-chunk advisory remains. `git diff --check` passed.
- Initial suite found two outdated heading assertions, then an overly broad test-selector update. Corrected only the expected heading/total selector; focused rerun passed. No unresolved failure.

## Running application and browser

Applied travella-local: validated the existing Cognito setup, ran `bash scripts/start-local-ready.sh`, and passed sign-in/session/sign-out readiness. SHA-256 comparisons for FlightCheckout.jsx, FlightPayment.jsx and flight-payment.css matched the running canonical app container. URL: http://localhost:5174.

The built-in Chrome DevTools MCP hit a shared-profile conflict. Started an isolated Chrome DevTools MCP session with `--isolated --headless` using the existing MCP Python client; authenticated with the example account from the supplied private account file. No credentials were saved in evidence.

Created a temporary verification Plan using normal CRUD APIs and an existing verification canvas as fixture. Performed a real LiteAPI sandbox BUD–LIS return search for 12–17 May 2027, one traveler. 58 flight results returned. Opened the first flight, filled fictional passengers/contact, explicitly consented to a test reservation, kept airline-assigned seats and included baggage, then reached the actual payment screen at EUR 401.47.

1. Desktop: all three Stripe hosted iframes loaded; Pay remained disabled until card fields and consent were complete. Expanded/collapsed booking details and checked exact route, passenger, seat, baggage and fare information.
2. Submitted the Stripe decline test card. The form displayed “Your card has been declined.” and remained available for retry.
3. Checked a 500px narrow viewport, then explicitly emulated 390×844 (Chrome window resizing alone clamps to 500px). Captured the actual 390px layout. No horizontal overflow or overlapping controls.
4. Device emulation reloaded the app. The same unsubmitted reservation recovered into payment; billing/card fields were empty and consent unchecked. Three hosted fields reloaded.
5. Entered a successful test card with billing initially empty. Native validation focused Name on card and prevented submission. Filled fictional billing, retried, and reached the provider-confirmed sandbox itinerary. No real charge or ticket.
6. Confirmation saved to the Plan. Reload restored the saved itinerary with no card fields. HTTP readback found mock-booked, BUD–LIS, EUR 401.47; no test card number, billing object, passenger name or payment secret appeared in the saved canvas.
7. Chrome DevTools console inspection found only existing Lit development and Stripe HTTP test-mode warnings, with no runtime errors. Inspected sanitized browser network timing/status entries: payment configuration, reservation status/book and canvas challenge/save returned 200. Stripe iframe timing entries hide response status cross-origin; no success was inferred from those entries alone. The real decline and success UI establish the tested provider outcomes.
8. Soft-deleted only the temporary test Plan through its challenge contract; readback returned 404. Left canonical app running.

All screenshots were visually inspected. Desktop evidence uses 1440×1600 so the complete payment form is visible; mobile evidence uses 390×844, except decline-mobile.png, which is the earlier 500px narrow viewport. The reference design was already captured with Chrome DevTools; no old-flight screenshot was available before rebuilding.

## Screenshots

- [Approved accommodation format](plan/accommodation-reference.png)
- [Desktop payment](implementation/payment-desktop.png)
- [Expanded flight details](implementation/booking-details-desktop.png)
- [390px payment overview](implementation/payment-mobile.png)
- [390px card fields](implementation/payment-mobile-fields.png)
- [390px payment actions](implementation/payment-mobile-actions.png)
- [Declined test card, 500px](implementation/decline-mobile.png)
- [390px provider confirmation](implementation/confirmation-mobile.png)

Pending accommodation/backend work was preserved and excluded from this task's commit. The existing shared Stripe loader is included as a required flight dependency. No push, main merge or deployment.
