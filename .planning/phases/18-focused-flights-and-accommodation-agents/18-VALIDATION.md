---
phase: 18
status: partially_executed
nyquist_compliant: false
wave_0_complete: false
---

# Phase 18 validation strategy

## Current shared-workspace validation amendment —2026-10-27

Status: planned and not executed; keep nyquist_compliant:false and wave_0_complete:false until execution proves them. Historical results below remain dated evidence. Plans18-06–18-12 have automated checks plus explicit immediate nonzero-exit/zero-collection/missing-test failure conditions. No application tests ran during this planning turn.

| Plan | Existing/new meaningful tests | Required proof |
| --- | --- | --- |
| 18-06 | NEW frontend/src/features/plans/travel/TravelWorkspace.test.jsx; existing TravelSearch/CanvasTravelJourney and Agent travel API/auth proxy tests | Manual-only mounted search; actual HTTP normalization; draft/applied distinction; current-request fences; strict final effect reducer invariants |
| 18-07 | NEW services/agent/tests/test_travel_workspace_journey.py; existing CRUD topic/checkpoint/plansApi/topic UI suites | Actual Agent→graph→CRUD database completion; matching input digest; request-local input/output; state/terminal/current-run projection; no history replay |
| 18-08 | Existing test_specialist_tools.py, test_specialist_worker.py, new journey/workspace tests | Actual SDK registration and host dispatch; valid filters/sort/dismiss/restore; provider10/3/6 and local12 budgets; exact current references; Undo and dirty-input denial |
| 18-09 | NEW frontend/src/features/plans/travel/CarrierMark.test.jsx; existing test_liteapi.py/test_travel_research.py/test_travel_registry.py/TravelSearch | Supplier discrete identity/logo through all strict schemas, mixed/error fallback, source and total-price scope |
| 18-10 | Existing travelApi/TravelWorkspace/TravelConversation/TravelSearch tests plus real specialist journey/CRUD topic tests | Main2–3 factual compare with chat failure/draft preserved; exact deterministic manual review; challenge/confirm/readback/reload; no model/history gating |
| 18-11 | Existing canvasViewState.test.js, AccountApp.test.jsx, new workspace/journey tests | Bounded owner/Plan/topic recovery, direct401 cleanup→new account, expiry/restart, all late-event/cancel/brief races; actual keyboard/mobile/zoom |
| 18-12 | All named suites plus build and runtime evidence | Actual authenticated Chrome journeys, HTTP/database readback and bounded live agent/provider sample; prior gaps preserved |

New test creation is explicit in the owning task before implementation. Every other source/test path was grounded in the checkout. Tests target actual concurrency, projection, reference and durable-choice behavior; no static styling mirror tests are requested. No package install or new migration is planned.

### Grounded execution commands

Run per-task selectors for quick feedback, then these proven grouped commands at integrated validation. Every exit must be zero and tests must collect; measure actual duration rather than treating a timeout as a pass.

- `uv run --locked pytest -q services/agent/tests/test_travel_registry.py services/agent/tests/test_specialist_worker.py services/agent/tests/test_travel_specialist_journey.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py services/crud/tests/test_topic_conversations.py`
- `npm --prefix frontend test -- --run src/plansApi.test.js src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/travelApi.test.js src/features/plans/travel/CanvasTravelJourney.test.jsx`
- `uv run --locked pytest -q services/mcps/tests/test_liteapi.py services/mcps/tests/test_travel_research.py services/agent/tests/test_specialist_tools.py services/agent/tests/test_travel_workspace_journey.py`
- `npm --prefix frontend test -- --run src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/CarrierMark.test.jsx src/features/plans/canvasViewState.test.js src/AccountApp.test.jsx`
- `npm --prefix frontend run build`

Changed TopicRun begin/complete digest and exact-choice create/read/update/remove require real FastAPI handlers and isolated actual database readback using a new session/connection. Check invalid input, missing references, unauthenticated/cross-owner/topic denial, stale revision/brief, duplicate identity and active lease. Existing migration0012 is historical evidence; rerun migrations only if implementation actually changes schema. Never point migration testing at the ordinary local application database.

### Actual browser/live matrix

Use Chrome DevTools and travella.local@example.com; read the supplied password privately, rebuild the intended checkout through the local skill and verify source hashes. Save implementation screenshots and verification/agent-evaluation reports under artifacts/testing/2026-10-27-shared-travel-workspace/ with actual execution timestamps. Inspect every capture and console/network. The existing planning sketch at artifacts/testing/2026-10-27-shared-travel-planning/ remains planning evidence only.

Exercise both modes manually with chat collapsed/unavailable through search/filter/sort/dismiss/Undo/details/compare/exact choose/reload. Exercise bounded real specialist search/refine/view updates and exact structured comparison, preserving draft. Cover all13 WORKSPACE-SPEC Edge Coverage rows and7 current UI Considerations via the mapping inCOVERAGE.md: dirty inputs, manual search during cancellation, view edits, Stop/navigation, error/empty, stale comparison, incompatible scope, room precision, saved dismissal, carrier fallbacks, mobile/keyboard, forged cross-scope references and reload/expiry/restart. Include multiple tabs, committed-before-Stop history, relevant saved-brief invalidation, light/dark and200% zoom.

Live facts and model quality are separate from deterministic fixtures. Complete the current AI-SPEC cases with bounded actual calls within approved search/inspection tools, and record exactly which prior full-quality cases remain open. No booking/payment request is necessary. Missing credentials/Chrome/runtime/provider capability leaves the affected gate blocked; never substitute mock data or an uninspected screenshot. Traveler UAT is a final distinct pending activity, not inferred from implementation authorization.

## Historical validation strategy — original18-01–18-05

Execution results are recorded in 18-VERIFICATION.md and the linked artifact report. The matrix below remains the full acceptance target; unexecuted live/browser combinations are explicitly pending.

## Before implementation

Resolve the Chrome DevTools profile conflict without closing unrelated user sessions. Inspect current Flights/Stays and the static planning outline; save and inspect desktop/mobile screenshots under `artifacts/testing/<execution-date>-focused-travel/plan/`. Record adjustments to UI-SPEC. This is required even though the user declined interactive alternatives. This gate was resolved with an isolated Chrome DevTools session; desktop/mobile planning screenshots were inspected.

## Automated and API coverage

| Plan | Tests to create | Existing regression seams |
| --- | --- | --- |
| 18-01 | CRUD topic isolation/migration/lifecycle, Agent topic dispatch/context, frontend topic chat/navigation | CRUD API/research context and Agent turn/Canvas chat suites |
| 18-02 | Catalog normalization/filter validation, apartment facts/room comparison, grounded ordering | MCP LiteAPI/inspection tools and TravelSearch/CanvasTravelJourney |
| 18-03 | Flights-only tool access, route/party/verify, per-topic stale evidence | Agent flight research/generation and flight booking sync |
| 18-04 | Notes provenance/correction, safe choice challenge/commit, conflicts and readback | Canvas persistence, purge/recovery, auth proxy and migrations |
| 18-05 | Combined topic switching/reload/changed-context races and evaluation fixtures | Relevant backend/frontend regressions plus production build |

Every new command must collect tests; zero collection or nonzero exit fails. Every plan adds its tests before expanding dependent behavior. Deterministic scripted model/provider fixtures run through real registration, MCP dispatch and normalized responses. Do not mock the CRUD store for persistence acceptance.

CRUD checks must exercise authenticated HTTP against real isolated databases: create/read topic messages and notes, update/replace/remove choices, readback after new connection, stale revisions, duplicate request identity, cross-topic event mismatch, invalid topic, unauthenticated/cross-traveler access, deleted Plan denial, seven-day restore and purge. Migrations must run on an isolated PostgreSQL test database; `TEST_DATABASE_URL` may not point to `travella`, `postgres`, or the normal local app DB. Follow `services/crud/tests/test_migrations.py`, which upgrades with Alembic and asserts the schema head. Skips due to a missing test database leave migration acceptance pending.

Update existing migration-head assertions and cleanup tables for new schema. Confirm pre-migration Trip data survives and all legacy context/generation queries exclude specialist messages. Verify new records are cascaded/purged through both ORM and actual DB behavior.

## Browser and live acceptance

Use Chrome DevTools and `travella.local@example.com`; read credentials privately from `~/.config/travella/test-account.json`. Create test-owned Plans. Exercise Stays conversation → compare → shortlist → choose → reload; Flights conversation → refine → verify → choose; topic switches with independent histories; Trip changes refreshing both briefs; bounded independent refinement and budget exhaustion; explicit preferred-option readiness/removal/Needs review; stop/retry/network loss; another tab and another Plan; mobile/desktop/light/dark/zoom. Confirm persistence through API readback. Inspect console/network and screenshots, then clean up only test-owned data.

Run the AI-SPEC cases using deterministic fixtures first, then a bounded explicitly recorded live SDK/provider sample during execution. Live account availability may block some cases; label those unverified rather than passing from fixture evidence. No booking or payment calls are needed.

## Known baseline and delivery rule

At `caf905b`, 387 regression cases passed and eight old React fixtures failed on absent “Edit details” controls; the same eight fail on unchanged main `4e0780a`. See `artifacts/testing/2026-10-25-liteapi-research-tools/verification.md`. Any fixture adapted while implementing this phase needs assertions for the actual supported UI and must not simply be skipped.

Completion requires all applicable integration, PostgreSQL, browser and agent-quality checks with actual evidence. Plan lint and static source review do not establish runtime behavior. Record blockers and preserve earlier phase acceptance gaps independently.
