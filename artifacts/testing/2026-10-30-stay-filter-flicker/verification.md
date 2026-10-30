# Accommodation filter opening flicker — verification

## Scope and cause
User reported an obsolete-looking form flashing when opening Property type, amenities & cancellation. Existing design reuse was already selected; no redesign. Inline GSD debug workflow tracked in `.planning/debug/resolved/stay-filter-flicker.md`.

There is one filter implementation. Native details expansion preceded the asynchronous toggle handler; catalog fetching then started after expansion. Empty headings and a refund checkbox appeared first, followed by a loading line, then the options.

Fix: synchronously control summary clicks, preload the two metadata catalogs when accommodation search becomes active, preserve pending loads across collapse/reopen, and render only a loading message until options or an error are available. Supplier searches still require explicit submission. The current chip design and error/retry controls remain.

## Planning evidence
- [Reported trigger](plan/reported-trigger.png)
- [Before](plan/before.png)
- [Intended settled design](plan/intended-open-state.png)
- [Original frame samples](plan/before-frames.json)

## Executed automated checks
- `npm --prefix frontend test -- src/features/plans/travel/StaySearchFilters.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx`: **107 passed**, 3 files.
- Regression proof: temporarily restored the original filter component with exact restoration in finally; the pending-catalog/incomplete-controls test failed against the original implementation. Fixed source restored and full targeted run passed.
- `npm run build` from frontend: passed. Existing large bundle warning remains.
- `git diff --check`: passed.
- Tests cover active-only preload, pending collapse/reopen without abort/refetch, selection preservation and retry after failure, empty options, keyboard chip toggles, expanded selections/focus, max 10 selections, explicit search submission and workspace races.
- Search/workspace mocks now separate metadata reads from supplier/research calls, preserving assertions that no search or durable action happens automatically.

## Actual runtime
Ran the local skill Cognito precheck and `bash scripts/start-local-ready.sh` from this worktree. Health and example-account sign-in/session/sign-out checker passed. SHA-256 hashes for StaySearchFilters.jsx and TravelSearch.jsx match the running Compose app. Database volumes preserved. Running URL: http://localhost:5174.

Authenticated example-account journey exercised using an isolated Chrome DevTools MCP browser. Used existing verification Plan; no supplier search, booking, or durable Plan mutation was submitted. Temporary draft filter selections were cleared.

## Browser results
- Real provider catalogs returned HTTP 200 for both hotel_types and facilities.
- Before: closed 35.8px → incomplete open form 220.2px → loading plus incomplete form 239.4px → full options 588.2px. Two intermediate jumps.
- After: closed 35.8px → complete form 588.2px with all 24 initially visible options. **No incomplete or loading frame on the preloaded first opening.** [Frame evidence](implementation/opening-frames.json).
- Enter closed the disclosure; Space reopened it. No additional catalog requests; no supplier search request.
- Real mobile options: Apartments toggled pressed, Show all expanded to 51 property types (63 total visible chips including 12 amenities), collapse and Clear search filters worked.
- 390×844 mobile viewport: no horizontal overflow; chips wrap and text stays readable.
- Simulated delayed catalog responses: immediate loading-only body, zero headings/buttons/checkboxes; collapse/reopen kept exactly two pending requests.
- Simulated HTTP 503: explicit error and Retry filters appeared; refundable filter remained available. Retry with simulated empty catalogs produced two No options available states and removed the error. Browser fetch was restored and page reloaded; real provider catalogs verified again.
- Final network inspection: all 13 fetch/XHR requests succeeded, including both catalogs and destination suggestions. A transient 500 seen earlier after the restart did not recur after reload. No filter-specific runtime failures.
- Final console: no errors; existing Lit development-mode and Google Maps event API warnings only.
- Saved screenshots visually inspected for clipping, overlap and incorrect states.

## Implementation evidence
- [Desktop real options](implementation/desktop-open.png)
- [Mobile real options](implementation/mobile-open.png)
- [Mobile simulated loading](implementation/mobile-simulated-loading.png)
- [Mobile simulated error](implementation/mobile-simulated-error.png)
- [Mobile simulated empty results](implementation/mobile-simulated-empty.png)

## Limits
Loading/error/empty provider responses were deliberately simulated in the real browser. Normal opening used real catalog responses. No backend CRUD changed; booking and live supplier searches were outside this fix. On genuinely slow connections, the loading message still transitions to ready options once metadata arrives.
