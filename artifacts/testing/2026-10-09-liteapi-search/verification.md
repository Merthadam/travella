# LiteAPI search — prototype-stage verification

Status: three interactive design alternatives verified; production LiteAPI integration awaits the user's layout selection. This is not completion of the full search implementation request.

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

Capture branch: `prototype/liteapi-search-layouts`. The user's production design decision is pending. After that choice, use the GSD quick plan, implement the selected design with authenticated server-side LiteAPI search, and remove prototype-only code from the implementation branch.
