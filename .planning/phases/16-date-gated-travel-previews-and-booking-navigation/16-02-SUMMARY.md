---
phase: 16-date-gated-travel-previews-and-booking-navigation
plan: "02"
subsystem: [agent, ui, testing]
tags: [flights, stays, a2ui, ag-ui, bounded-tools]
requires:
  - phase: 16-date-gated-travel-previews-and-booking-navigation
    provides: Plan 01 grounded stay tracer, transient collector and matching results navigation
provides:
  - Return-flight previews and matching read-only results with local dates and party totals
  - Independent mixed-mode criteria/results/errors under shared call and byte limits
affects: [16-03]
tech-stack:
  added: []
  patterns: [mode-discriminated snapshots, serialized shared tool budget, independently validated partial results]
key-files:
  created: []
  modified:
    - services/agent/claude/canvas_travel.py
    - services/agent/claude/canvas_editor.py
    - services/agent/research_assets/.claude/skills/canvas-travel/SKILL.md
    - services/agent/tests/test_canvas_travel.py
    - frontend/src/features/plans/travel/CanvasTravel.jsx
    - frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
key-decisions:
  - Validate country of sale separately from guest nationality; echo schema currency/cabin defaults.
  - Known explicit airport codes use the shipped reference catalog; city lookup resolves only a unique observed code after all non-location inputs pass.
  - Serialize tool execution around a shared memoized budget so parallel SDK requests cannot duplicate capability/search calls.
  - Keep failed or incomplete modes separate from independently complete snapshots; model selections never substitute cross-mode IDs.
patterns-established:
  - A discriminated Python/browser snapshot union retains existing stay behavior while adding token-free flight legs and terms.
requirements-completed: [TRAVEL-16-01, TRAVEL-16-02, TRAVEL-16-03, TRAVEL-16-04, TRAVEL-16-05, TRAVEL-16-06]
actuals:
  tokens: 15449
  tasks: 2
  commits: 2
plan_head_before: 9e8b3fe0a8e3e2c1fb111f6e92d33e76d2d17d09
coverage:
  - id: flight-tracer
    description: Actual emitted flight SSE renders local dates, return-party fares and matching full results
    requirement: TRAVEL-16-03
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_flight_journey_actual_sse_to_react
        status: pass
    human_judgment: false
  - id: mixed-modes
    description: Separate observed stays/flights navigate without refetch and preserve independent successes
    requirement: TRAVEL-16-06
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_mixed_journey_actual_sse_to_react
        status: pass
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_mixed_shared_lookup_budget_dedup_and_concurrency
        status: pass
    human_judgment: false
  - id: live-acceptance
    description: Authenticated Chrome desktop/mobile and live SDK/provider acceptance
    verification: []
    human_judgment: true
    rationale: Root owns final Chrome and live acceptance in Plan 16-03; deterministic fixtures do not prove external model/provider behavior.
duration: 18min
completed: 2026-10-16
status: complete
---

# Phase 16 Plan 02: Return-flight and mixed-mode research Summary

**Canvas chat now carries return flights and independent flight/stay batches through the existing graph/SSE/A2UI path into matching read-only result screens.**

## Performance

- Started: 2026-10-16T10:52:00Z
- Completed: 2026-10-16T11:10:00Z
- Tasks: 2; source/test files modified: 6.
- Actuals measured from the persisted Plan 02 ledger before this summary commit (diff characters/4, not model usage).

## Accomplishments

- Fixed search_airports/search_flights tools accept no model criteria/identity/action overrides. Exact dates, explicit passenger ages, distinct airports and country of sale are required. A nationality does not silently become flight pricing country. EUR/ECONOMY defaults are visible.
- Flight snapshots preserve observed outbound/return segments, local timestamps/offsets, carriers, stops, technical stops, baggage, known refundability, estimates and excluded taxes. Route and first departure dates must match validated criteria; nested checkout/raw payloads never enter model tool text or SSE.
- Up to three observed previews open the same retained inventory. A four-offer test displays flight-0/1/2 in chat and flight-0 through flight-3 on View all. EUR 824.50 remains an estimated return-party total; unknown price/baggage/cancellation stay unknown. The fixture preserves outbound START at 23:30 +02:00 and next-day arrival at 01:00 +01:00 without browser timezone conversion.
- Mixed requests produce distinct search IDs/criteria/options. Missing, disabled, failed, empty, oversized or wrong-mode responses cannot replace the other completed mode. Ambiguous shared dates block both. Concurrent tool requests share one capability result, two lookups and at most one search per mode; no sixth provider call is dispatched.
- Snapshot byte trimming retains whole options and marks truncation. Compact model candidates exclude verbose tax details while full safe UI snapshots retain those terms.

## Task Commits

1. **16-02-01: Grounded return-flight tracer** — `707775c`
2. **16-02-02: Independent mixed results and shared limits** — `663aeab`

## Verification

- `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k flight_journey -q` — **2 passed** (four known offers and one unknown-terms offer).
- Task-one full feature suite — **66 passed**; standalone CanvasTravelJourney schema test passed with its actual-SSE-fixture case skipped.
- Focused mixed-mode suite — **16 passed**.
- Final `uv run --locked pytest services/agent/tests/test_canvas_travel.py -q` — **82 passed in 10.87s**, including eight actual HTTP→LangGraph→SDK handler→SSE→plansApi→React/A2UI journeys across stays/flights/mixed/clarification. Only provider and SDK network edges are deterministic fixtures.
- `npm --prefix frontend test -- src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/FlightSandboxCheckout.test.jsx` — **15 passed, 1 intentionally skipped**. The fixture-dependent skipped case runs through the eight Python-triggered journeys. Existing legacy sandbox checkout behavior passes unchanged.
- `npm --prefix frontend run build` — passed, existing large-chunk warning only. `git diff --check` passed. Existing LangGraph/Python deprecation warnings remain.
- Mixed browser-component fixture opens stays, returns with preserved editor/composer, opens flights with no stay IDs, then returns again; network request count is unchanged by both navigations. Complete direct-code mixed search uses three provider calls; two observed airport lookups bring the total to exactly five.

## Deviations and Issues

- No scope expansion. Reused the existing stylesheet and editing-contract import: the discriminated alias propagates through the existing optional travel field without another contract/store or checkout component.
- Continued the orchestrator-authorized sequential execution in the existing worktree and reused agent context. No new dependencies, branch switch, durable schema or infrastructure.
- Flight tracer passed before mixed expansion. All final tests passed; no unresolved implementation test failure. Production Chrome/live SDK/provider acceptance remains explicitly **unverified** and belongs to root/Plan 16-03.

## Evidence and Readiness

See [verification.md](../../../artifacts/testing/2026-10-16-travel-previews/verification.md) for deterministic evidence and approved preimplementation screenshots. Root owns production screenshots, console/network checks, visual inspection, final lifecycle/privacy/evaluation work and live proof. Shared requirement completion still awaits the final declaring plan and phase verification.

## Self-Check: PASSED

Both task commits and all six changed source/test files exist. Summary is committed before progress advances. No production browser/live-call success is claimed. Ready for Plan 16-03 after root spot-check.
