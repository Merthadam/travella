---
phase: 16-date-gated-travel-previews-and-booking-navigation
plan: "03"
subsystem: [agent, ui, testing]
tags: [lifecycle, privacy, evaluations, history, cancellation]
requires:
  - phase: 16-date-gated-travel-previews-and-booking-navigation
    provides: Plans 01 and 02 grounded stay/flight snapshots and matching results
provides:
  - Cancellation, supersession, expiry, bounded memory and history recovery guards
  - Twenty executable host-enforced evaluations and checkpoint/receipt privacy proof
affects: [phase-16-verification]
tech-stack:
  added: []
  patterns: [request-local collector, reference-only chat results, explicit currentness checks]
key-files:
  created:
    - services/agent/evals/test_canvas_travel_eval.py
  modified:
    - services/agent/claude/canvas_travel.py
    - services/agent/checkpoint.py
    - services/agent/tests/test_canvas_travel.py
    - services/agent/tests/test_agent_checkpoint.py
    - frontend/src/features/plans/useCanvasConversation.js
    - frontend/src/features/plans/components/PlanningCanvas.jsx
    - frontend/src/features/plans/travel/CanvasTravel.jsx
    - frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
key-decisions:
  - Keep only four snapshots per mounted Plan and reference them from chat messages.
  - Compare captured Canvas source facts separately from explicit search-only criteria.
  - Preserve opaque local view history without copying unrelated history data or persisting inventory.
  - Reproduce unrelated regression failures against preimplementation source and retain them as explicit debt.
patterns-established:
  - Real provider barriers and deferred browser promises prove cancellation and generation behavior without guessed sleeps.
requirements-completed: []
requirements-pending: [TRAVEL-16-01, TRAVEL-16-02, TRAVEL-16-03, TRAVEL-16-04, TRAVEL-16-05, TRAVEL-16-06, TRAVEL-16-07]
actuals:
  tokens: 12848
  tasks: 2
  commits: 2
plan_head_before: 4091af23022c0e385dc7864e87ccf0147460fea8
coverage:
  - id: lifecycle
    description: Obsolete travel results cannot become current; ordinary Back preserves local work
    requirement: TRAVEL-16-06
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py
        status: pass
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
        status: pass
    human_judgment: false
  - id: authority-privacy
    description: E01–E20 enforce authority, observed IDs, scope and safe lifetime boundaries
    verification:
      - kind: integration
        ref: services/agent/evals/test_canvas_travel_eval.py
        status: pass
    human_judgment: false
  - id: browser-acceptance
    description: Authenticated Chrome desktop/mobile, network and screenshot inspection
    requirement: TRAVEL-16-07
    verification: []
    human_judgment: true
    rationale: Task 16-03-03 is assigned to root and has not executed; fixtures do not establish live SDK/provider behavior.
updated: 2026-10-16
status: in_progress
---

# Phase 16 Plan 03: Lifecycle and privacy Summary — partial

**Travel snapshots now reject cancelled, superseded, stale, expired and missing references, with deterministic privacy and authority checks passing. Root browser acceptance is still pending.**

## Task Commits

1. **16-03-01: Obsolete result guards and local navigation recovery** — `a6bc489`
2. **16-03-02: Privacy, evaluation and regression gates** — `5c0320b`
3. **16-03-03: Root Chrome verification** — pending; no completion claimed.

## Accomplishments

- Provider work that resolves after cancellation cannot publish; actual graph/SSE barriers cover cooperative and swallowed cancellation, transport cleanup, newer generations and retries. Browser epoch/run guards stage results until successful terminal completion.
- A new search supersedes prior results for its modes immediately, including failed or stopped replacements. Only four snapshots remain in mounted Plan memory. Chat stores references, historical server chat cannot recreate offers, and Plan changes clear the registry. Relevant Canvas dates/destination/party changes invalidate captured facts; note edits do not. Search-only exact dates remain usable until a real source change or expiry. Chat-only search criteria changes supersede the appropriate mode.
- Ten-minute expiry is checked at activation/click and by timer. Local history contains only view kind and an opaque search ID. Forward/Back, ordinary explicit Back and missing/reloaded references preserve honest recovery; mounted editor/composer state survives ordinary results navigation. No automatic search occurs on navigation, expiry or reload.
- Recursive checkpoint filtering excludes transient snapshots/date evidence and nested checkout tokens. An injected real `InMemorySaver` test inspects actual compiled graph channels and serialized saver storage. Default application construction still has no saver; no infrastructure was enabled. Concurrent owner/Plan calls cannot mix collectors; exceptions/cancellation reset request context. Process-local receipt replay keeps original expiry and performs no additional provider call.
- Fixed telemetry contains only mode/outcome, call/result/discard counts and bounded elapsed milliseconds. Secret sentinels, identity, source quotes and criteria do not appear in captured travel logs. E01–E20 execute actual host boundaries rather than scoring prompt wording.

## Verification

- Task 01: **85 backend tests passed**; focused lifecycle/PlanningCanvas frontend: **19 passed, 1 fixture-only standalone skip**.
- `uv run --locked pytest services/agent/evals/test_canvas_travel_eval.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q` — **115 passed in 19.97s**, including all 20 critical evaluations. Eight Python-triggered actual HTTP→graph→tool handler→SSE→plansApi→React journeys run the fixture-dependent browser case. External SDK/provider calls are fixtures.
- Full requested backend command (Agent/MCP/auth travel proxy/CRUD mock booking) — **257 passed, 1 failed in 14.24s**. The existing profile-memory expected payload lacks newer optional profile fields; the exact failure reproduces at preimplementation `aa4f16f`.
- `npm --prefix frontend test` — **131 passed, 6 failed, 1 skipped**. Five AccountApp onboarding/auth expectation failures and one TripBrief confirmation expectation reproduce at `aa4f16f` (**13 passed, 6 failed** for those two files). No travel test failed. The skip is exercised by Python-supplied SSE fixtures.
- `npm --prefix frontend run build` and `git diff --check` passed. Existing chunk-size, LangGraph/Python deprecation and test-key warnings remain.
- Baseline reproduction used temporary git archives plus installed locked dependencies, without switching branches or replacing working source. Full suites are not described as green. No unrelated assertion was changed to force a pass.
- No new CRUD operations or durable schema. The travel handlers assert unchanged stored Plan data; existing proxy/CRUD mock-booking regressions passed.

## Deviations and Pending Gates

- The post-await provider cancellation guard was included in task 01 rather than task 02 because the complete cancellation tracer required it.
- Continued the root-authorized sequential existing-worktree execution and reused agent context due runtime thread/isolation limits. No new dependencies or source scope expansion.
- Actuals are realized diff characters/4 over the two implementation commits, not model usage. Two of three tasks are complete. Requirement completion remains empty until final browser/review evidence resolves the shared requirements.
- Full-suite acceptance retains seven reproduced preexisting failures. Phase-specific deterministic checks pass, but this partial summary does not waive root browser, independent review or existing debt.
- **Production Chrome, live model/provider behavior, implementation screenshots, console/network inspection and container-source verification remain unverified.** Planning sketches are not production evidence. Root owns task 03 and will update this summary/validation after the handoff.

## Root Browser Handoff

Rebuild using `.agents/skills/travella-local/SKILL.md`, preserve volumes and verify current source hashes. Reuse only isolated Plan `f507ba21-deb6-467b-a566-a519934fc386`; set destination Lisbon, Portugal and a valid exact future date pair within the provider bounds. Authenticate using the configured example account without emitting credentials.

- Stays: `Find stays; 1 room for 2 adults; nationality: HU`
- Return flights: `Find return flights; origin: BUD; destination airport: LIS; passengers: 2 adults; flight country: HU`
- Mixed: combine both clauses. Search-only override: append an explicit valid `YYYY-MM-DD to YYYY-MM-DD` pair. Missing/ambiguous dates must clarify without provider search.

Verify View all matching IDs, explicit/browser Back with unsaved editor and composer, Stop, stale/expired/reload recovery, mobile overflow, focus and console/network behavior. Capture/inspect the eight implementation JPEGs named in Plan 03. Separate real SDK/provider observations from isolated fixtures; executor made no paid/live call. See [verification.md](../../../artifacts/testing/2026-10-16-travel-previews/verification.md).

## Self-Check: PASSED for tasks 01–02; task 03 PENDING

Both source commits and test/eval files exist. This partial summary is committed without advancing the plan or marking the phase complete. Root must complete the mandatory browser gate and independent reviews before final sign-off.
