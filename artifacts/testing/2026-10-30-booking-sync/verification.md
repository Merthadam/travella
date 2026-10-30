# Booking status recovery consolidation — 2026-10-30

## Scope and acceptance

One `useBookingSync(planId, mode, enabled, onBookingResult)` replaces separate flight/stay polling implementations. Shared receipt helpers preserve existing session keys and event names. The existing canvas is the visual target; no layout changes were proposed. User approved the internal refactor after the prototype offer.

Flight status remains `sandbox/flights/status`, retrying `pending` and requiring the flight mode on terminal results. Stay status remains `sandbox/status`, retrying `pending` and `not_found`. Both retain sandbox/booking-ID checks, 5-second intervals, 12 automatic checks, focus retries, Plan isolation and cleanup. In-flight updates queue one follow-up; responses for replaced receipts are ignored.

## Automated verification

Executed from the repository root:

- `npm test --prefix frontend -- src/features/plans/travel/useBookingSync.test.jsx src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/CanvasTravel.test.jsx src/features/plans/components/PlanningCanvas.test.jsx` — 81 passed across 4 matching files; no CanvasTravel.test.jsx exists.
- `npm test --prefix frontend -- src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx` — 114 passed across 4 files.
- After final test review corrected a route assertion and added mode-switch coverage: `npm test --prefix frontend -- src/features/plans/travel/useBookingSync.test.jsx` — 40 passed. Total distinct relevant tests: 196 across 8 files.
- `npm run build --prefix frontend` — passed; Vite reports large chunks, outside this refactor.
- `git diff --check` — passed. Scoped inline code review found no outstanding issues.

Coverage includes pending results, stay-only not-found retry, confirmed/cancelled/failed terminal states, invalid responses, storage failure, enablement, late responses, unmount cleanup, Plan/mode changes, latest callbacks, retry limits, network recovery and concurrent receipt replacement.

## Chrome DevTools verification

The configured Chrome DevTools MCP could not open its shared profile. Started the same installed Chrome DevTools MCP in an isolated headless profile, using its normal tools over MCP stdio; no other browser tool was substituted. Authenticated as the required example account using the supplied credential file without recording credentials.

Served this checkout through Vite at `http://localhost:5199`. A temporary development proxy forwards API requests to the already-running local backend on port 8003 and sets its expected localhost:5174 origin. No existing Docker stack was rebuilt or stopped. This verifies the changed frontend against the existing backend; it is not a new deployment.

Created one disposable Plan through the real API and seeded valid canvas data through its confirmation/challenge contract. An initial fixture with inconsistent card labels was correctly rejected and corrected before verification. Only this new Plan was changed.

Provider status responses were deliberately simulated in the browser for this Plan only. All other requests, including canvas challenge/save/read, used the real authenticated backend. The UI carried a visible simulated-provider label during recovery and receipt checks. No provider booking or charge occurred.

| Check | Observed result |
| --- | --- |
| Initial error responses for both status routes | Existing cards preserved; no false booked state or UI alert |
| Focus retry with both responses held open | One active request per mode |
| Replace both receipts and dispatch duplicate update events while held | Request count stayed at 4 until release (2 initial failures + 2 held requests) |
| Release obsolete responses | Exactly 2 additional checks; latest receipts checked; old booking ID not saved |
| Recovery updates and persistence | Both cards displayed Mock booked; real canvas challenge and PUT returned 200; GET returned TEST-SYNC-FLIGHT and TEST-SYNC-STAY |
| Open recovered flight and stay through visible UI controls | Correct saved itinerary and stay confirmation displayed |
| Remove simulated receipts and fully reload | Both saved references still present in the API and rendered canvas |
| Console and network inspection | No console errors; Lit development warning only. All 23 inspected real fetch/XHR requests returned 200 |
| Visual inspection | Before, recovered, receipt and reloaded screenshots inspected; affected cards and receipt content readable with no new layout issues |

The map was unavailable in the before and after states, with its existing list fallback visible. This is independent of status polling. Responsive layout checks were not repeated because layout did not change. Full repository suites and live provider checkout were not run; provider race verification is deterministic simulation, not live supplier validation.

## Evidence

- [Before-state visual target](plan/canvas-before.png)
- [Recovered canvas](implementation/canvas-recovered.png)
- [Saved flight receipt](implementation/flight-receipt.png)
- [Saved stay receipt](implementation/stay-receipt.png)
- [Canvas after full reload](implementation/canvas-reloaded.png)

## Cleanup

Removed this run's synthetic session receipts. The disposable Plan was soft-deleted using the normal confirmation contract; active GET returned 404. Signed out of the isolated browser session. Existing Plans, accounts, Docker stacks and volumes were preserved.
