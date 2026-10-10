# Canvas state after a sandbox booking

Verified 2026-10-10 using Chrome DevTools MCP and the configured example account at http://localhost:5474. Existing selected design retained. GSD session: `.planning/debug/canvas-mock-booking.md`.

## Change

Confirmed sandbox checkout and recovered confirmations update the accommodation draft to `mock-booked`. The existing booked styling shows **Mock booked**, hotel, dates, test reference, and an explicit no-real-reservation label. Search opens the test stay summary. Flights remain unchanged. Save plan explicitly persists the bounded summary through CRUD; handles, tokens, guests, prices and raw provider payloads are excluded. Research regeneration preserves the test stay. Cancellation/failure only clears a matching previously recorded booking. A confirmation arriving during Save remains an unsaved change.

## Browser journey

Created a separate disposable plan. Searched Kreischberg, Austria, 3–7 February 2027, one room/two adults, Hungarian nationality, EUR. LiteAPI returned three stays. Opened Mooswirt, refreshed offers, prebooked, explicitly confirmed the sandbox checkout. LiteAPI returned confirmed, and returning to the canvas immediately showed Mock booked and Mooswirt while Flights remained Not booked.

Clicked Save plan; observed Saved. Fully reloaded; the same card and summary returned from persistence. Opened View mock stay and View last mock checkout: read-only status recovery returned confirmed, without resubmitting a booking or making the saved plan dirty. Simulated offline during status check: the failure was visible, existing confirmed state remained, and retry after restoring connectivity succeeded. Checked 1440×900 and 390×844 layouts in both light and dark mode, changing theme through Account Settings. No horizontal overflow; badge, dates, reference and action remained legible. Original dark preference restored. Only the temporary verification plan was soft-deleted after testing; the existing user plan was not changed.

## Screenshots

- [Before checkout: not-booked cards](plan/before-checkout.png)
- [Initial loading state before implementation](plan/before-canvas.png)
- [Search loading](implementation/search-loading.png)
- [Checkout loading](implementation/checkout-loading.png)
- [Provider sandbox confirmation](implementation/confirmed-checkout.png)
- [Updated unsaved draft](implementation/mock-booked-draft-desktop.png)
- [Saved and reloaded, dark desktop](implementation/saved-mock-stay-desktop.png)
- [Saved and reloaded, dark mobile](implementation/saved-mock-stay-mobile.png)
- [Light desktop](implementation/saved-mock-stay-light-desktop.png)
- [Light mobile](implementation/saved-mock-stay-light-mobile.png)
- [Recovered checkout](implementation/recovered-checkout.png)
- [Offline status failure](implementation/status-offline.png)

## Automated checks

- `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/TravelSearch.test.jsx` — 15 passed. Includes real A2UI state rendering, confirmation callback, lost-response/status recovery, idempotent status notification, Plan scope, pending/failed/live-result rejection, explicit save/reload, regeneration, trip edits, matching cancellation, and confirmation arriving during Save. Existing editor/chat navigation regressions also pass.
- `uv run --locked pytest services/crud/tests/test_canvas_mock_booking.py services/mcps/tests/test_sandbox_checkout.py -q --tb=short` — 16 passed. New CRUD tests use actual FastAPI handlers and SQLite persistence: challenge-required creation, exact read-back, update/read-back with flights preserved, replay idempotency, stale revisions, invalid real-booked/flight/missing/null/secret/date fields, missing Plan, unauthenticated and foreign-owner read/challenge/write.
- `uv run --locked pytest services/crud/tests/test_api.py -q --tb=short` — 27 passed.
- `uv run --locked pytest services/agent/tests/test_travel_api.py -q --tb=short` — 3 passed.
- `npm --prefix frontend run build` — passed; existing bundle-size warning.
- `git diff --check` — passed.

Initial new CRUD test assertions were corrected to match the existing required challenge header: missing header is 422; ownership checks require a syntactically present header. Final runs above pass.

## Runtime / network

Read-only Cognito precheck and `scripts/start-local-ready.sh` succeeded for `travella-liteapi-fresh`; the launcher rebuilt and recreated the stack, preserved the database volume, and verified example-account sign-in/session/sign-out. Running container SHA-256 matches checked for SandboxCheckout, usePlanningCanvas, CRUD canvas and the shared mock summary contract.

Observed hotel search/detail, sandbox prebook/book/status, canvas challenge/PUT, and reload canvas GET all returned 200. One auth/session 500 occurred while the app container was restarting; it returned 200 after startup. The only later failed request was the deliberate offline status check; retry returned 200. Console contained the existing Lit development-mode warning and the deliberate offline network error, with no application exception from the new state flow.

## Scope

Sandbox accommodation only. No real reservation or charge was made, and no flight booking support is claimed. Existing pre-fix mock bookings can be synchronized by reopening **View last mock checkout** in their original tab and checking status, then choosing **Save plan**. Saved summaries survive browser reload; provider checkout handles still follow the existing tab-scoped seven-day recovery policy. Full unrelated suites were not rerun.
