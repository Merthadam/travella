# Guided flight review C — verification

Implemented the user-approved C: itinerary first, then fare and next step, with a persistent total/action footer. Source starts from main `3ca6c95`; prototype preserved on `prototype/flight-review-261030` at `4bdfdbf`. The production branch contains no prototype runtime.

## Evidence

- Approved: [itinerary](plan/c-desktop.png), [fare](plan/c-fare-desktop.png), [mobile](plan/c-mobile-fare.png).
- Before: [reported screen](plan/reported-before.png).
- Implemented: [itinerary](implementation/itinerary-desktop.png), [fare](implementation/fare-desktop.png), [mobile](implementation/fare-mobile.png), [expanded mobile itinerary](implementation/itinerary-mobile-expanded.png), [dark theme](implementation/fare-mobile-dark.png).
- Outcomes: [checkout review](implementation/checkout-review.png), [exact choice confirmation](implementation/choose-confirmation.png), [discussion attachment](implementation/discuss-exact-flight.png), [expiry recovery](implementation/expired-offer.png), [tokenless reload](implementation/reload-search-again.png).

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel`: 244 passed, 12 skipped; 18 files passed, one skipped. Includes exact offer references, navigation without mutations, live and event-boundary expiry, missing information, currency/estimated/excluded taxes, booked/unavailable checkout, focus restoration and stay regressions. External SSE fixtures in ResearchFlights and CanvasTravelJourney remain skipped.
- `npm --prefix frontend run build`: passed; existing large-chunk warning remains.
- `git diff --check`: passed.
- `bash scripts/start-local-ready.sh`: rebuilt canonical Docker app at http://localhost:5174, read-only Cognito precheck and sign-in/session/sign-out readiness passed. Running container hashes matched FlightDetails, flight-review.css, TravelSearch and TravelPresentation.
- Authenticated Chrome DevTools MCP with the example account; isolated Chrome profile because the default profile was occupied. Credentials were read from the supplied ignored configuration and excluded from artifacts.
- Created an isolated verification Plan for Lisbon, 12–17 May 2027, one traveler. Actual BUD airport lookup and sandbox flight search returned 54 flights. Viewed Nuitée Air BUD–LIS return at EUR 401.47. Both review steps and expanded leg details retained actual itinerary/fare facts.
- Continued to existing checkout review: matching itinerary and EUR 401.47, then returned to flights. No passenger submission, payment, prebooking or booking was performed.
- Discuss flight closed review and attached Nuitée Air to the composer. Choose for trip displayed the exact option, total, dates, terms and explicit confirmation; Keep researching cancelled it. No option was selected.
- Expiry event boundary exercised with a temporarily advanced browser Date.now for one click, restored immediately: checkout did not open; expired notice and Search again appeared; choose/discuss disappeared. This screenshot records simulated elapsed time, not a provider-expiry response. Timer expiry separately covered by component tests.
- Reloaded real persisted results: fare facts survived, memory-only token was absent, Search again replaced checkout. No expired notice was incorrectly shown for this fresh evidence.
- Real pointer open + Escape closed the dialog and restored focus to View flight. Step headings receive focus on navigation.
- Desktop 1440×1000 and mobile-width 390×844 inspected in light/dark themes, including expanded details. No horizontal overflow or footer overlap observed. Screenshots visually inspected. Mobile uses viewport resizing, not a physical device.
- Console inspection found no application exceptions: Vite/React development notices, existing Lit dev-mode warning and unnamed form-field browser issue. Inspected network requests and successful search/checkout/choice outcomes; no failure attributable to the changed review path. Test setup had rejected canvas payload/revision attempts, corrected before verification. Cleanup initially used a bare UUID idempotency key and received 400; retried with the application's timestamped requestId helper and succeeded.
- Cleaned only the verification Plan (33b03cc2-df23-4b16-9f9c-3d5ca2bf745f). Subsequent deleted-view read confirmed lifecycle=deleted and recovery deadline present. No user Plans changed.

## Limits

No backend code changed. Browser testing stops at checkout review; it does not establish booking/payment completion. Production-provider, already-booked, missing integration and invalid-fact states are covered by component tests, not fabricated live provider responses. Wider Phase 18 acceptance and existing fixture skips remain unchanged. No push, merge or deployment performed.
