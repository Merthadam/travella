# Phase 16 verification

## Planning evidence (2026-10-16)

- User accepted existing A2UI styling and declined alternative prototypes.
- Root authenticated with the configured example account through Chrome DevTools. Password/tokens excluded from output/evidence.
- Created isolated test Plan `f507ba21-deb6-467b-a566-a519934fc386` using New plan; opened Canvas and captured `plan/canvas-before-desktop.png`. Do not alter unrelated Plans. This record must be cleaned up after verification.
- Inspected rendered static sketch in Chrome DevTools: desktop flights View all displayed four matching simulated results; Back preserved composer text. Mobile 390x844 flights chat and stays full-results had no horizontal overflow. Missing dates state asked for check-in/check-out including year and displayed no options. All inventory was explicitly labeled simulated.
- Inspected screenshots: `plan/desktop-chat.jpg`, `plan/desktop-results.jpg`, `plan/mobile-chat.jpg`, `plan/mobile-results.jpg`. No clipping/overlap/unreadable content observed; long mobile pages scroll naturally.
- DevTools direct screenshot file writes are blocked by MCP workspace-root mismatch; captured images returned by DevTools were saved without alteration through the local shell. PNG/emulated screenshot calls intermittently stalled the dedicated automation browser; restarted only its process and recovered with JPEG full-page captures. Production checks remain pending.
- Research baseline: 31 targeted backend tests passed (see 16-RESEARCH.md).
- Installed locked frontend dependencies with `npm ci --prefix frontend`; no manifest changes intended.

## Implementation verification

Plan 16-01 deterministic implementation evidence: commits `0e0e190` and `447d776`. Final backend suite `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_travel_api.py -q`: 58 passed in 9.20s. Five actual HTTP→LangGraph→SDK-tool-handler→SSE→plansApi→React/A2UI journeys cover 0/1/2/4 stays and two-turn clarification. SDK/provider network edges are fixtures; graph, handlers, projection, parser and renderers are production code. View all has matching IDs and no extra provider call; Back preserves editor/composer; dates remain search-only; invalid/foreign/deleted inputs never call travel; nested private sentinels do not reach tool text/SSE/compiled checkpoint output.

Frontend focused command passed 14 tests with 1 fixture-dependent skip; that skipped test runs in all five Python-driven journeys. Production build passed with the existing chunk-size warning. No dependency/lockfile change. No durable saver was enabled; nested projection defense remains Plan 16-03.

Production Chrome verification remains pending for root/Plan 16-03. Planning/sketch evidence is not production verification. Live model/provider behavior has not been exercised for Phase 16.

Plan 16-02 deterministic evidence: commits `707775c` and `663aeab`. Flight tracer: 2 passed; mixed cases: 16 passed; final `uv run --locked pytest services/agent/tests/test_canvas_travel.py -q`: 82 passed in 10.87s. Eight real application-boundary SSE/React journeys now include flights and both mixed-mode View all paths. Explicit local overnight timestamps, estimated EUR 824.50 return-party fares, unknown terms, separate mode IDs, shared five-call limit/dedup, unavailable/failed/empty modes, and token exclusion are asserted. Provider/SDK network responses remain fixtures.

Legacy travel/checkout frontend command across CanvasTravelJourney, TravelSearch, SandboxCheckout and FlightSandboxCheckout: 15 passed, one actual-SSE-fixture-only standalone skip (executed by Python). Build passed with the existing chunk warning. No dependency, infrastructure or checkout change. Production Chrome and live evidence remain pending.

## Plan 16-03 deterministic handoff (production browser pending)

Task 01 commit `a6bc489` implements cancellation/currentness, four-snapshot memory bounds, reference-only chat, relevant-fact invalidation, expiry and opaque history/reload recovery. Its backend suite passed 85 tests; lifecycle/PlanningCanvas frontend passed 19 with one standalone fixture-only skip. Actual emitted-SSE journeys cover history Forward/Back and reload without refetch.

Task 02 commit `5c0320b`: E01–E20 plus travel/checkpoint tests **115 passed in 19.97s**. Actual injected saver channels and serialized storage exclude transient inventory, date evidence and private token sentinels. Concurrent real graph calls isolate owner/Plan collectors; receipt replay preserves original expiry. Fixed telemetry sentinel checks pass. SDK/provider network edges remain deterministic fixtures; no paid/live call was made by executor.

Full requested backend regressions: **257 passed, 1 failed in 14.24s**. The profile-memory payload assertion failure reproduces at preimplementation `aa4f16f`. Full frontend: **131 passed, 6 failed, 1 skipped**; all six AccountApp/TripBrief failures reproduce from `git archive aa4f16f` (**13 passed, 6 failed** in those files). Temporary archive reproduction leaves shared working source unchanged. Existing travel/activity/legacy checkout regressions passed. Build and diff whitespace checks passed, with existing warnings. Full suites are not green; unrelated baseline failures were not altered.

`16-03-SUMMARY.md` is partial, two tasks complete and root task 03 pending. `16-VALIDATION.md` retains incomplete browser/sign-off status. Root must rebuild current source, verify container hashes, use the isolated Plan, inspect real Chrome desktop/mobile interaction, network/console and eight implementation screenshots. Planning JPEGs and fixture tests do not satisfy production browser acceptance. No new CRUD operation or durable schema was added; tests assert unchanged Plan storage through research/navigation.

## Workflow runtime notes

The native collaboration service refused a fourth child thread (`agent thread limit reached`). Existing separate agent contexts are reused for subsequent roles. Planning and checking remain in different contexts; role-specific new agent creation is unavailable. GSD isolation negotiation reported `head-diverged-from-fork` after planning commits, so execution is sequential in this existing worktree; the resolved mode was recorded as `none`. No branch was switched and no unrelated worktree was altered.

## Root production browser checks in progress

- Rebuilt with `bash scripts/start-local-ready.sh`; existing Cognito configuration validated read-only. Authentication sign-in/session/sign-out check passed. SHA-256 of `canvas_travel.py`, `CanvasTravel.jsx`, and `travel-results.css` matched running container source.
- Authenticated example-account Chrome session opened isolated test Plan `f507ba21-deb6-467b-a566-a519934fc386`. Missing-date stay request returned the focused exact-date question with no previews; captured and inspected `implementation/missing-dates.jpg`.
- Live SDK/private LiteAPI sandbox search for Lisbon, 2027-04-14 to 2027-04-21, 1 room/2 adults, HU nationality returned 27 observed stays, previewed 3, labeled sandbox/freshness/search-only dates and price/tax basis. Actual results screenshot `implementation/desktop-stay-results.jpg` inspected; no horizontal overflow. Navigation/Back preservation still needs controlled root check.
- DevTools full-page screenshots repeatedly deadlocked its dedicated Chrome process. Viewport JPEG capture (`fullPage:false`) succeeds; restarted only dedicated automation browser. Existing auth refresh returned initial401 followed by refresh200/session200; not a new feature failure.
- Review discovered and is fixing weekday date-intent fallback, mixed-result follow-up retention, and explicit stay currency handling. Final acceptance must use rebuilt corrected source.

## Corrected navigation/imagery design gate

User explicitly replaced the results-only destination with existing manual TravelSearch preloaded data and required sidechat pictures. Root inspected real existing page (`plan/manual-flight-page-before.jpg`) and revised simulated sketch in Chrome. View all opened prefilled manual form/results. Desktop/mobile screenshots inspected: `corrected-preview.jpg`, `corrected-manual-preload.jpg`, `corrected-mobile-preview.jpg`, `corrected-mobile-manual.jpg`; no horizontal overflow observed. Sketch controls/inventory are simulated; the actual existing manual page remains the implementation pattern. Earlier results-only browser evidence is superseded for final navigation acceptance.
