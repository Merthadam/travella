# Travel details extraction — 2026-10-30

## Scope and result

Extracted FlightDetails and StayDetails from TravelSearch. Each receives the existing workspace observation; workspace state ownership is unchanged. Stay refresh keeps rooms, their search/option reference, observation time and expiry in a single state value. Shared dialog lifecycle, evidence labels, pricing and flight-leg presentation preserve the existing markup. Removed the unused booking-result callback through TravelSearch/TravelWorkspace; actual checkout callbacks remain.

No visual redesign was requested. The existing session's prototype offer and agreement to preserve the screens apply. Before-state screenshots are the visual reference.

## Automated checks

Executed:

```sh
npm --prefix frontend test -- src/features/plans/travel/TravelDetails.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx
npm --prefix frontend run build
git diff --check
```

Result: 5 test files passed; 139 tests passed, 1 existing test skipped because TRAVELLA_CANVAS_SSE_FIXTURE was not supplied. Production build and whitespace check passed. Existing Vite large-chunk warning and Lit development-mode warning remain.

Ten new behavioral cases cover exact flight references/no hotel requests, expired/invalid evidence, recovery and booked checkout gating, consistent refreshed room identity/expiry, fresh choose/checkout callbacks, historical and exact-room observations, refresh failure/401/retry/empty state, and abort/late-response/focus restoration. The canvas mock now enters the actual checkout callback path instead of invoking an unused search callback. Initial failures from a missing shared duration import and the obsolete test mock were corrected before the passing run.

## Chrome DevTools inspection

Used the installed Chrome DevTools MCP server with an isolated headless Chrome profile because the shared profile was locked. Authenticated with the prescribed example account using credentials read privately from the local test-account file. Temporary Vite preview: http://localhost:5199, proxying the existing local backend at port 8003. No backend changes or Docker rebuild.

Created a disposable Lisbon Plan through the real API and saved its canvas through the real confirmation challenge. Reloaded the app and verified dates, travelers and travel cards survived. Search inventory, hotel details and provider refresh responses were explicitly simulated in the real app; this is not a live-provider verification. Snapshots remained token-free; synthetic checkout tokens existed only in simulated manual offer responses. No provider booking was submitted.

Observed checks:

- Flight search → details rendered both legs, price, fare terms and actions. Opening details made no hotel requests. Escape closed it and restored focus to View flight.
- Stay search → details fetched hotel information and room availability and displayed the refreshed timestamp.
- Compare room closed details and displayed the exact room comparison. Reopening its Details displayed the original-observation and earlier-search notices and made zero new requests; it offered no checkout token.
- Simulated refresh failure displayed the retry alert and preserved original room offers. Retry with an empty availability response cleared the error and showed the empty-state message.
- At 390×844, the stay dialog had clientWidth=348 and scrollWidth=348. Actions remained readable; vertical scrolling reached the total and footer.
- Inspected all saved images: desktop flight/stay layout matched the before screenshots; error, empty and observed-only states were readable; mobile content scrolled without horizontal overflow.
- Final Chrome console inspection showed only the existing Lit development warning. Auth, Plan, canvas, context, conversation, capability and topic HTTP reads returned 200. Simulated provider calls are covered by the in-page request ledger and automated assertions, not live-network claims.

Cleanup: the disposable Plan was soft-deleted through its real challenge/commit flow, then read back as 404; signed out (200). Only the task's temporary browser and Vite process were stopped.

## Evidence

- Before: [flight](plan/details-before-flight.png), [stay](plan/details-before-stay.png).
- After: [flight](implementation/details-after-flight.png), [stay](implementation/details-after-stay.png).
- Edge states: [observed room](implementation/details-observed-room.png), [refresh error](implementation/details-refresh-error.png), [empty](implementation/details-empty.png).
- Responsive: [mobile top](implementation/details-mobile.png), [mobile bottom](implementation/details-mobile-bottom.png).

Limits: no live-provider booking or agent discussion was performed. Checkout and choose callback identity/gating are verified in component/integration tests. The external Python SSE fixture test remains skipped. The baseline unavailable map is unrelated to this refactor.
