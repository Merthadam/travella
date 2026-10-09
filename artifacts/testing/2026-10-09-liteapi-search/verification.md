# LiteAPI search — design and implementation verification

Status: user-selected A implemented and browser-verified with live LiteAPI sandbox hotel and return-flight searches. Focused checks pass. Full suites retain 19 pre-existing failures reproduced on untouched main; details below.

## Historical prototype stage

## Setup

- Rebased `successful-fontina` onto fetched `origin/main` at `82c9ddf`. Resolved the planning-state documentation conflict by retaining main's phase-15 state and preserving the earlier LiteAPI research record. Production source rebase was clean.
- Started the separate `travella-liteapi-preview` Docker project using `npm run prototype:search --prefix frontend`. Frontend: `http://localhost:5374`; auth: 8303; agent: 8304. Existing stacks were left running.
- Signed into the browser as the required example account, reading its password from the local test-account file without displaying it. The isolated preview database needed an example traveler profile: created a Budapest test home and skipped optional onboarding steps through the real HTTP API (all four acknowledged with 200, completed version 2). No pre-existing profile or Plan was modified.
- Used the actual Chrome DevTools MCP server in a separate isolated headless Chrome session. The shared MCP profile was occupied, so a local stdio bridge launched the same installed server with `--isolated --headless --no-usage-statistics`; no shared browser was terminated.
- Captured the current accommodation placeholder before the design study. Prototype mutations are memory-only and visibly labeled. No LiteAPI calls, prebooks, bookings, payments, cancellations, or durable Plan writes occurred during these checks.

## Observed browser checks

| Check | Observed result |
| --- | --- |
| All A/B/C variants, accommodation and flights | Six desktop views rendered at 1440×1080; all sample images loaded; document and main width matched viewport |
| Existing flight/accommodation entry components in sample canvas | Both Explore actions opened their corresponding search; Back to plan returned to the sample cards |
| Flight filters | Direct flights reduced 3 results to 2; adding cabin baggage reduced them to 1 |
| Accommodation filters | Free cancellation reduced 3 results to 2 |
| Price sorting | Sample Europe (€224) and The Hive Hotel (€458) appeared first in their modes |
| Room details and choosing a room | Two sample room offers displayed; selection notice explicitly stated no booking or Plan change |
| Return-flight details and choice | Both legs and fare/baggage information displayed; selection stayed in memory |
| Compare | Selected two offers, opened a two-column comparison, closed with Escape and cleared the tray |
| Map and timeline | The Hive Hotel map pin updated the focused property and opened its rooms; Sample Europe timeline row updated the journey panel |
| Search loading and empty state | Searching Paris showed simulated loading, then Rome-only empty guidance; reset restored the three offers |
| Error and retry | Simulated error preserved criteria; retry restored three results |
| Mobile | All six variants inspected at an emulated 390×844 viewport; document/main widths were 390; C's table scrolled inside its own container |
| Mobile details | Flight details opened and closed from the comparison table (also checked at narrow 500 px viewport) |
| Keyboard | Page ArrowRight wrapped C to A; ArrowLeft while Destination was actually focused preserved C |
| Reload | URL restored C + flights; comparison and selection state reset intentionally |
| Network | Session, profile, active Plan list, and all three illustrative images returned 200; search interactions sent no provider requests |
| Console | No application errors; existing Lit development-mode warning only |

Browser inspection found inherited dark input styles and uncentered native dialogs; scoped prototype overrides fixed them and the affected views were recaptured. The floating prototype controls occupy the bottom of the viewport; scroll result actions above them when comparing. Early automation attempts clicked an obscured button or ran during viewport-triggered reload; the same paths passed after scrolling and waiting for the authenticated screen. No product error was hidden by those retries.

## Build and limits

- `npm run build --prefix frontend`: passed, 537 modules. Existing large-chunk warning remains.
- `git diff --check`: passed.
- Screenshots were captured with Chrome DevTools and visually inspected for legibility, overlap, image loading, dialogs and responsive behavior.
- No new automated tests for the throwaway prototype, per the prototype skill. No changed backend CRUD handlers to test. Production provider/security integration and its tests have not been implemented in this stage.
- Prototype data is fixed to a Rome trip, 13–16 November 2026, two adults. Editing dates/travelers does not fetch new offers, and the UI labels this limitation. Photographs and map locations are illustrative.

## Screenshots

| Variant | Stays | Flights | Mobile stays | Mobile flights |
| --- | --- | --- | --- | --- |
| A — familiar list | [Desktop](plan/a-stays-desktop.png) | [Desktop](plan/a-flights-desktop.png) | [Phone](plan/a-stays-mobile.png) | [Phone](plan/a-flights-mobile.png) |
| B — map/timeline | [Desktop](plan/b-stays-desktop.png) | [Desktop](plan/b-flights-desktop.png) | [Phone](plan/b-stays-mobile.png) | [Phone](plan/b-flights-mobile.png) |
| C — comparison table | [Desktop](plan/c-stays-desktop.png) | [Desktop](plan/c-flights-desktop.png) | [Phone](plan/c-stays-mobile.png) | [Phone](plan/c-flights-mobile.png) |

Additional evidence: [before state](plan/before-accommodation-placeholder.png), [canvas entries](plan/canvas-entry-points.png), [mobile search form](plan/a-stays-mobile-search.png), [room choice](plan/hotel-room-selection.png), [flight choice](plan/flight-details-selection.png), [comparison](plan/flight-comparison.png), [empty state](plan/empty-search.png), [error state](plan/search-error.png).

Capture branch: `prototype/liteapi-search-layouts` at `cce528a`. The user subsequently selected A: ‘I think a is best as long as its implementable with liteapi endpoints’. Production implementation follows below. The prototype files and preview script were removed from the implementation branch; the capture branch retains them.

## Production implementation — 2026-10-09

The existing A2UI Explore accommodation / Explore flights actions now open the approved classic search layout inside the Plan. The form, results, details, filters, sort, pagination and three-option comparison all use normalized responses from the private LiteAPI connector. Searches and comparisons remain transient; no booking or saved-option controls are exposed.

### Local runtime and source freshness

Canonical URL: **http://localhost:5374**. Open a Plan → Open plan canvas → Explore accommodation or Explore flights. The verification-only Plan was created through the New plan UI in the isolated project. It remains available for review. No pre-existing Plan was changed.

Started/rebuilt with:

```sh
COMPOSE_PROJECT_NAME=travella-liteapi-preview TRAVELLA_SECRETS_MODE=local \
TRAVELLA_FRONTEND_PORT=5374 TRAVELLA_AUTH_PORT=8303 TRAVELLA_AGENT_PORT=8304 \
FRONTEND_ORIGIN=http://localhost:5374 TRAVELLA_LOCAL_ORIGIN=http://localhost:5374 \
bash scripts/start-local-ready.sh
```

- Read-only AWS SDK Cognito precheck verified the existing expected pool, public app client, password auth flow and matching ignored local settings. The initial comparison encountered quoted env values; parsing them with dotenv resolved that check without changing AWS configuration.
- Read LiteAPI from the existing Secrets Manager secret and routed it only to the private MCP env. Never printed the key. The configured key is sandbox.
- Final startup passed health and the example account sign-in → session → sign-out checker. Browser verification used that same example account, with the password read privately from the prescribed file. An early browser sign-in coincided with container replacement; it succeeded after readiness, without changing credentials.
- SHA-256 comparisons matched checkout and running `/app` copies of TravelSearch.jsx, travel-search.css, PlanningCanvas.jsx, Agent travel routes, auth API, LiteAPI adapter and travel MCP server. The last rebuild included the focus-restoration correction.
- Existing Docker projects and volumes were preserved. AWS Gateway deployment was not performed. Optional `TRAVEL_MCP_ENDPOINT` reconciliation and Runtime transport are implemented and tested locally; cloud deployment remains an operator step documented in the runbook.

### Browser observations — actual provider calls

Chrome DevTools MCP inspected the authenticated application at 1440×1080 and 390×844. The 390px viewport exercised the responsive CSS, with document width exactly 390px; touch-device behavior was not separately tested. Light/dark screenshots used the root appearance attribute for inspection without saving an account preference.

| Journey/check | Observed result |
| --- | --- |
| Capabilities and both A2UI entry cards | Authenticated capabilities 200; cards show LiteAPI sandbox/test inventory and open the correct screen. No search runs merely by opening a screen. |
| Hotel search | Rome, Italy; 13–16 November 2026; one room, two adults; HU nationality; EUR. Real `/travel/hotels/search` returned 200 and 29 properties, labeled sandbox. |
| Hotel property and room details | `/travel/hotels/detail?hotel_id=…` and a hotel-scoped rate refresh both returned 200. Property photos, description, facilities and 20 room offers displayed. Full-stay totals and excluded city taxes were distinct; refundable/unknown terms were not called free cancellation. |
| Hotel filters/sort/page | Lowest-total sort worked; maximum total €1 produced filter-empty guidance; reset restored 29 results. Show more expanded 10 rendered cards to 20. |
| Airport autocomplete | Budapest and Rome queries both returned 200. Explicit BUD and FCO suggestions were selected before search. |
| Return flights | BUD–FCO, 13–16 November 2026, two adults, Economy, HU residence, EUR. Real `/travel/flights/search` returned 200 and the bounded first 100 itineraries. The UI explains the cap. |
| Flight details | Both Wizz Air legs rendered with local airport times, 110-minute leg durations, operating carrier, flight numbers, baggage and non-refundable fare/change conditions. A returned full-party total was €143.34; prices are observations, not guarantees. |
| Flight filtering and sorting | Price sort exercised; combined direct-both-ways and cabin-bag filters yielded zero matching returned offers, honestly shown as filter-empty. Reset restored results. |
| Comparison | Two returned flights displayed side by side; Clear comparison removed the transient comparison. |
| Navigation and cancellation guards | Stays → Flights → Stays and Back to canvas → reopen preserved each mode's criteria/results. The final asynchronous A2UI focus correction returned keyboard focus to Explore accommodation. Unit coverage also rejected late responses after leaving a screen. |
| Mobile and appearance | Search controls, hotel cards, full return-flight cards and both dialogs were legible at 390px with no horizontal overflow. Hotel dialog client/scroll widths were both 348px; its room list scrolls vertically. Dark search and dialogs were inspected at desktop width. |
| Plan durability | Full Plan response before/after live searches matched, revision remained 1. Subsequent reads after detail, comparison, failure and retry checks also remained revision 1. No Save plan, prebook, booking, payment or cancellation was called. |
| Network projection | Observed capability, airport, hotel search/detail and flight requests all returned 200. Inspected normalized browser responses contained no API key, offerId, rateId or bookingId. |
| Console | No application errors during the final journey; existing Lit development-mode warning only. |

### Deterministic browser fixtures (not provider outcomes)

Only the isolated DevTools browser's fetch function was temporarily overridden for these states. No repository test switch or production mock endpoint was added. The real transport was restored afterward and a real flight retry returned 100 itineraries.

- **503 fixture:** refresh showed an error and retained all 100 previous completed flight results and their criteria.
- **Empty-result fixture:** a normalized 200/empty response produced “No availability for this search” and visible guidance. Its notice explicitly identifies the verification fixture.
- **401 fixture:** a hotel search returned the browser to the sign-in screen. Reload recovered the existing valid test session after removing the override.
- Loading was also observed during real provider requests. Error and empty outcomes were not represented as live LiteAPI failures or availability claims.

### Automated checks and known baseline failures

- `npm --prefix frontend run test -- src/features/plans/travel/TravelSearch.test.jsx`: **4 passed**. Explicit-submit criteria, sandbox display, failed-refresh retention, late-response rejection, confirmed-airport requirement and unknown-aware filters are covered.
- Focused Python contract/provider/security/Gateway/BFF tests passed. The full Python run below includes every new test; no new test failed.
- `npm --prefix frontend run build`: **passed**, 538 modules; existing large-chunk warning remains.
- `git diff --check`: **passed**.
- `uv run --locked pytest -q services/mcps/tests services/agent/tests services/auth/tests scripts/tests`: **294 passed, 2 failed**.
- `npm --prefix frontend run test`: **63 passed, 17 failed**, plus seven errors associated with stale conversation test doubles.

To establish whether these failures were introduced here, exported untouched `origin/main` (`82c9ddf`) to a separate temporary baseline directory, reused the same installed dependencies, and ran the failing Python tests plus the complete frontend suite there. It reproduced both Python failures and the exact same 17 frontend failures/seven errors (59 frontend passes before the four new tests).

Known baseline failures: Agent profile-memory expectation omits newly defaulted profile fields; auth test expects a removed onboarding route; AccountApp tests expect the old onboarding flow; PlanConversation/PlansApp test doubles lack `researchContext`; TripBrief expects the old default need state. They remain unresolved in this search task. **The full repository suites are not green**, despite the new feature's checks passing. Existing dependency/deprecation warnings also remain.

### Inspected final evidence

- Design: [approved A stays](plan/a-stays-desktop.png), [approved A flights](plan/a-flights-desktop.png), [original placeholder](plan/before-accommodation-placeholder.png).
- Entry cards: [mobile A2UI cards](implementation/connected-cards-mobile.png).
- Hotels: [desktop light](implementation/hotel-results-desktop-light.png), [desktop dark](implementation/hotel-results-desktop-dark.png), [mobile cards](implementation/hotel-results-mobile-light.png), [property dialog](implementation/hotel-detail-desktop-dark.png), [mobile room terms](implementation/hotel-room-terms-mobile-light.png).
- Flights: [desktop](implementation/flight-results-desktop-dark.png), [mobile form](implementation/flight-form-mobile-light.png), [mobile results](implementation/flight-results-mobile-light.png), [desktop itinerary](implementation/flight-detail-desktop-dark.png), [mobile itinerary](implementation/flight-detail-mobile-light.png), [comparison](implementation/flight-comparison-desktop.png).
- States: [real loading](implementation/hotel-loading-final-dark.png), [filter-empty](implementation/hotel-filter-empty.png), [fixture error retaining results](implementation/fixture-flight-error-retains-results.png), [fixture empty](implementation/fixture-flight-empty.png), [fixture expired session](implementation/fixture-expired-session.png).

Screenshots were visually inspected. Corrections made after inspection: reset inherited form-label margins, apply dark appearance consistently, center native dialogs, preserve whitespace when stripping provider HTML, and wait for A2UI rendering before restoring keyboard focus. No unresolved clipping or horizontal overflow was observed in the inspected search views.
