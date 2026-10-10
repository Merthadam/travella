# Flight booked state verification — 2026-10-10

## Acceptance and change
The user reported that a mock flight booking did not change the Plan card as accommodation does. The open user Plan was inspected read-only: accommodation showed Mock booked, flights Not booked. Its draft was not edited or saved.

Flight confirmation previously reached the Plan only through an effect in the checkout component. Closing the details dialog unmounted that effect and stopped its pending-status polling. Returning to or loading the canvas did not recover an existing receipt.

The Plan now reads its own opaque flight receipt on load, return from travel search and window focus. It polls pending confirmations, processes receipt updates after an in-flight submission finishes, ignores obsolete Plan responses and updates only from confirmed sandbox results. Submission completion also reports to the Plan after the dialog closes. Durable persistence still requires explicit Save plan. No provider booking is submitted by recovery.

## Planning evidence
- [Before: both cards unbooked](plan/before-card.png), captured in Chrome DevTools using the isolated test Plan.
- [Expected booked card](plan/expected-booked-card.png), preserved from the earlier verified prototype-A implementation.
- The already-selected prototype A remains unchanged; this fixes state delivery, not layout.

## Executed checks
- `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/useFlightBookingSync.test.jsx src/features/plans/travel/FlightSandboxCheckout.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/TravelSearch.test.jsx` — **28 passed**.
- Coverage includes a booking request completing after checkout unmounts, pending confirmation polling outside checkout, late receipt notification, return-to-canvas A2UI booked rendering, initial receipt recovery, Plan isolation, error/focus recovery, explicit save behavior, and existing accommodation/search regressions.
- `npm --prefix frontend run build` — passed; existing large-chunk warning remains.
- `git diff --check` — passed.
- Local skill Cognito precheck and `scripts/start-local-ready.sh` with the existing `travella-liteapi-fresh` Compose project — passed, including example-account sign-in/session/sign-out. Data volumes preserved. App available at http://localhost:5474.
- SHA-256 comparisons of running-container and worktree PlanningCanvas, FlightSandboxCheckout and useFlightBookingSync — all MATCH.

## Chrome DevTools journey
Authenticated explicitly with the supplied example account. Created an isolated test Plan, saved its initial unbooked canvas, and searched BUD–FCO, 20–23 November 2026, two adults, Hungary, EUR. Selected the actual LiteAPI sandbox Nuitée Air offer, verified the fare (€356.66 return total), consented to prebook, reviewed the final fare and confirmed the test booking with fictional passengers.

Closed flight details immediately after submission and returned to the canvas. The sandbox book and status endpoints both returned 200. After the final container rebuild and example-account sign-in, the saved unbooked Plan automatically recovered provider confirmation without reopening checkout. Its flight card became Mock booked with BUD ↔ FCO, dates and the test reference; accommodation remained Not booked.

Clicked Save plan: challenge and PUT both returned 200. Removed only this test Plan's session recovery receipt, then reloaded. The flight card remained Mock booked with Save plan disabled, proving it came from the durable saved canvas rather than session recovery. Clicked View mock flight at mobile width: the flight screen showed the saved mock booking summary.

- [Recovered flight draft](implementation/recovered-flight-card.png)
- [Saved and reloaded flight](implementation/saved-flight-reloaded.png)
- [Mobile booked state](implementation/mobile-booked-flight.png)

Screenshots visually inspected at 1440×900 and 390×844: badge, route, dates, test reference and action fit; long reference wraps on mobile. No clipping or overlapping content found.

Final console: no runtime errors; existing Lit development warning and search form id/name issue remain. Provider search, verify, prebook, book, status and canvas save/read requests all returned 200. Container restarts briefly produced /auth/session 500 responses; readiness and fresh sign-in succeeded afterward. One superseded airport query was aborted normally. No final booking/canvas request failure remained.

Only the isolated test Plan was soft-deleted through the UI after verification; it is recoverable for seven days. Its recovery receipt was removed. The user's existing Plan was untouched. No backend contract or CRUD handler changed, so additional backend CRUD tests were not required. No real reservation, ticket or charge was created.
