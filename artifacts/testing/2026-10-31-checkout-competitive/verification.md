# Checkout competitive redesign verification

Date: 2026-10-31. Source commit: `4362110`. Local URL: http://localhost:5174.

## Design evidence

- [Primary-source comparison and limitations](plan/competitive-analysis.md): five airlines' seat policies; official easyJet/Travelport and Lufthansa agent-interface references. These are not represented as current consumer checkout screenshots.
- [Desktop plan](plan/layout-desktop.png), [mobile plan](plan/layout-mobile.png), [before](plan/before-seats-desktop.png). Chrome DevTools captured and images visually inspected before implementation. Prior direct-implementation preference honored; no new prototype-selection approval was required.
- [Final paid-seat desktop](implementation/paid-desktop-final.png), [mobile controls](implementation/seats-mobile-final.png), [mobile map interaction](implementation/map-mobile.png), [no-charge choice](implementation/airline-mobile.png), [recovered no-charge review](implementation/review-free-desktop.png).

## Executed checks

`npm --prefix frontend test -- src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/travel/FlightSeats.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/checkoutTotal.test.js`

Result: **4 files, 45 tests passed**. Covers passenger/seat transition locking, multiple travelers, per-leg assignments, infant and offer eligibility, duplicate physical seats, retaining baggage, empty inventory, service failure/recovery, estimates including removals and quantities, mixed-currency/missing-price fallback, and existing stay checkout behavior. Added a regression for status recovery reusing a token after an unconfirmed removal.

`npm --prefix frontend run build`: **passed**. Existing large-chunk warning remains (bundle exceeds 500 kB); no build errors. `git diff --check`: passed.

Ran the mandatory Cognito precheck and `bash scripts/start-local-ready.sh`. Local health and temporary example-account sign-in/session/sign-out check passed. [SHA-256 source comparisons](implementation/source-check.txt) match all five changed runtime source files in the running container.

## Real Chrome DevTools journey

Used an isolated Chrome DevTools MCP instance and the prescribed example account. Password read privately, never printed. Created two isolated Plans with two adult travelers, BUD–LIS return, 12–17 May 2027; no user Plan was changed.

1. Searched actual sandbox inventory, reviewed a flight, continued through fictional passenger details and explicit reservation consent to Seats. Passenger controls remained on their stage during prebook; seats loaded after success. Real prebook returned **€802.94**.
2. Selected 22A for traveler 1 and 22B for traveler 2 on outbound and return. Each selection advanced to the next eligible traveler; completed assignments were retained and other travelers' occupied seats remained disabled. The visible estimate incremented to **€850.94**.
3. Held a real service response to inspect [loading](implementation/loading-desktop.png): busy state and disabled seat/skip controls remained in place. Released response; provider confirmed all four assignments and **€850.94**, then Baggage opened. Repeated this flow on a fresh quote after the first quote expired. [Sanitized final provider events](implementation/provider-final.json).
4. Injected a local 422 response for a seat removal, without transmitting that request. [Error screen](implementation/error-desktop.png) hid seat controls and required status readback. Real status restored paid seats. This uncovered and fixed a stale-estimate bug when the provider reused a token. Re-ran the failure path against final code: review showed the provider-confirmed **€850.94**, with no stale €802.94 estimate. [Final recovery evidence](implementation/recovery-verified.json).
5. At **390 × 844**, reloaded the paid reservation, navigated back to Seats, chose traveler 1 and changed 22A to 22C using the real map button. Traveler 2's 22B remained selected. Inspected scrolling and screenshot: seat buttons, selected ownership, and Continue remained usable; no document or checkout horizontal overflow. [Mobile observations](implementation/mobile-interaction.json). Desktop checked at **1440 × 1000**.
6. On the final fresh quote, explicitly chose airline assignment for all flights. Estimate returned to **€802.94**. Continue submitted an empty selected-service list; real provider returned **€802.94** with no paid seats. Opened Review and reloaded: no-seat/airline-assignment summary and confirmed total persisted. [Reload readback](implementation/reload-free.json).
7. Opened Flight details, observed two itinerary legs, then closed it. Details are collapsed by default on subsequent stages; there is no full summary sidebar. Checked Baggage and Review layouts and consent-disabled final booking action. No payment or final booking was submitted.
8. Final console inspection found only the existing Lit development-mode warning, no application error. Scoped [network evidence](implementation/network.txt) shows successful verification/prebook/services responses. Earlier development-server restart failures and normal session expiry were resolved by readiness wait and reauthentication. The first long-lived quote returned `checkout_expired` (409); its status readback still worked, and the clear-seat path was repeated successfully on a fresh quote.
9. Both verification Plans were soft-deleted and read back in the deleted collection with recovery deadlines; only their checkout/canvas session entries were removed. [Cleanup results](implementation/cleanup.json).

## Scope and limits

No backend CRUD code changed. Test setup/cleanup used the real authenticated API. Empty provider inventory, infant-specific rules and mixed-currency estimates are covered by focused tests; the real provider browser run used available maps and two adults. Payment submission and ticket confirmation were intentionally not executed. Current competitor consumer checkout visuals, conversion rates, and carrier-specific family policies are not verified or copied. This change does not promise that airline-assigned seats will be together.

All delivered screenshots were visually inspected. The map is a bounded scroll region; long mobile checkout content remains scrollable with the action area visible. The local stack remains running with the committed source.
