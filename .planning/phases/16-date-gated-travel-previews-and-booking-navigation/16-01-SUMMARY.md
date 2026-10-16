---
phase: 16-date-gated-travel-previews-and-booking-navigation
plan: "01"
subsystem: [agent, ui, testing]
tags: [langgraph, ag-ui, a2ui, travel, stays, provenance]
requires:
  - phase: 14-standalone-a2ui-planning-components
    provides: Mounted Canvas draft and chat, existing A2UI catalog pattern
provides:
  - Exact-date stay search through Canvas SDK tools, graph and SSE
  - Token-free transient previews and matching read-only results navigation
  - Focused authenticated clarification and search-only date overrides
affects: [16-02, 16-03]
tech-stack:
  added: []
  patterns: [request-scoped travel collector, exact source-span validation, composed strict A2UI parser]
key-files:
  created:
    - services/agent/claude/canvas_travel.py
    - services/agent/tests/test_canvas_travel.py
    - frontend/src/features/plans/travel/CanvasTravel.jsx
    - frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
    - frontend/src/features/plans/travel/travel-results.css
    - services/agent/research_assets/.claude/skills/canvas-travel/SKILL.md
  modified:
    - services/agent/claude/canvas_editor.py
    - services/agent/graph/builder.py
    - services/agent/request_context.py
    - services/agent/editing_contracts.py
    - frontend/src/features/plans/useCanvasConversation.js
    - frontend/src/features/plans/components/PlanningCanvas.jsx
    - frontend/src/features/plans/components/CanvasConversation.jsx
key-decisions:
  - Reuse past traveler dates only within an active host-authored clarification chain; completed searches do not authorize stale dates.
  - Keep full safe inventory outside compiled graph channels and attach it only to the successful returned projection.
  - Use the existing mounted Canvas and opaque browser history entries to preserve draft, open editor and composer during results navigation.
patterns-established:
  - Real SSE emitted by the Python HTTP/graph path feeds the real JavaScript plansApi parser and A2UI renderer in a subprocess integration test.
requirements-completed: [TRAVEL-16-01, TRAVEL-16-02, TRAVEL-16-03, TRAVEL-16-04, TRAVEL-16-05, TRAVEL-16-07]
actuals:
  tokens: 22321
  tasks: 2
  commits: 2
plan_head_before: aa4f16f34e2847f897ae941d2d0b6cb3b792edea
coverage:
  - id: stays-journey
    description: Observed stay previews and matching results preserve draft/chat without refetch or checkout
    requirement: TRAVEL-16-03
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_stay_journey_actual_sse_to_react
        status: pass
    human_judgment: false
  - id: dates-clarification
    description: Exact current dates and authenticated clarification sources are validated before any provider call
    requirement: TRAVEL-16-01
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_stay_journey_two_turn_clarification_actual_sse_to_react
        status: pass
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_ambiguous_or_invalid_current_override_never_calls
        status: pass
    human_judgment: false
  - id: production-browser-and-provider
    description: Production desktop/mobile appearance and live model/provider behavior
    verification: []
    human_judgment: true
    rationale: Root owns Chrome acceptance after all implementation in Plan 16-03; live calls have not run.
duration: 21min
completed: 2026-10-16
status: complete
---

# Phase 16 Plan 01: Grounded Canvas stay previews Summary

**Canvas chat searches exact-date stays through the existing SDK/graph/SSE path, displays observed A2UI previews, and opens the same bounded inventory while retaining the unsaved Canvas and chat.**

## Performance

- Started: 2026-10-16T10:30:26Z
- Completed: 2026-10-16T10:51:00Z
- Tasks: 2
- Source/test files modified: 14
- Actuals measured from the persisted plan ledger before this summary commit; tokens are diff characters divided by four, not model token usage.

## Accomplishments

- Read-only tools bind authenticated owner/Plan and fixed actions, enforce complete date/destination/room/nationality inputs before calls, and bound call counts, time, selection IDs and serialized inventory.
- Nested room offers omit checkout tokens and raw payloads; the model receives compact candidates and selects observed IDs. Host-authored prose prevents speculative booking/price claims from streaming. Provider notices and known price/cancellation terms are retained.
- ISO, explicit-year spelled-month dates and exact ranges support search-only overrides. Ambiguous, conflicting, quoted, invalid and stale dates fail closed. Active authenticated clarification reuses exact source spans without treating assistant text as date authority.
- A2UI shows zero/one/two/three previews honestly, with matching full results, no navigation refetch/checkout and no durable travel mutation. Browser Back and the explicit Back control preserve the mounted editor and composer.

## Task Commits

1. **16-01-01: Grounded stays tracer and matching results** — `0e0e190`
2. **16-01-02: Exact date overrides and focused clarification** — `447d776`

## Verification

- Task-one tracer: `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k stay_journey -q` — 1 passed before expansion.
- Task-one complete suite: `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_travel_api.py -q` — 17 passed.
- Final expanded backend suite with actual SSE→React subprocess tests: same full command — **58 passed in 9.20s**. This includes five actual transport/parser/A2UI journeys: inventory counts 0/1/2/4 and a two-turn clarification.
- `npm --prefix frontend test -- src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/components/PlanningCanvas.test.jsx` — **14 passed, 1 intentionally skipped** in standalone execution. The skipped test requires the temporary actual-SSE fixture and ran successfully in all five Python-driven journeys.
- `npm --prefix frontend run build` — passed. Existing large-chunk warning remains; no dependency or lockfile changes.
- `git diff --check` — passed. Existing LangGraph/Python deprecation warnings remain.
- Tracer asserts owner/Plan binding, unauthorized Plan zero calls, unchanged draft/revision, state_changes=[], no nested private sentinels in tool text/SSE/compiled output, and no travel snapshot in serialized compiled checkpoint-helper output. No durable saver was enabled or provisioned. Plan 16-03 retains the additional defensive nested-projection exclusion.

## Deviations from Plan

- Runtime limitation: reused this UI-research agent context as executor because the collaboration thread limit prevented a new executor. Followed execute-plan/task commit workflow in the already negotiated sequential `none` isolation mode. The authorized existing `longing-angora` branch was retained instead of switching to an agent namespace; no other worktree was touched.
- Runtime tool adaptation: Read/Write tools are unavailable in this environment; used shell reads and apply_patch writes. No heredoc file creation.
- Deterministic fixture testing required a jsdom dialog.close shim and a complete saved_context_revision fixture. Empty-inventory assertions were scoped to the result surface after a first run correctly exposed unrelated chat `<article>` elements. Production behavior was not relaxed to satisfy tests.

## Issues Encountered

All implementation test failures were fixed and the failed paths rerun. Production Chrome screenshots, responsive/light/dark inspection, live model/provider evidence and final lifecycle/security/evaluation acceptance remain **unverified here**, intentionally assigned to Plan 16-03/root. Deterministic fixtures prove the application transport and presentation path, not real provider availability or model tool choice.

## Evidence and Next Plan

Approved preimplementation screenshots and runtime notes are in [verification.md](../../../artifacts/testing/2026-10-16-travel-previews/verification.md) and its `plan/` directory. The root inspected these before implementation. Plan 16-02 can now extend the working stays path to return flights and mixed modes. Shared phase requirements remain pending until their remaining declaring plans and final phase gates pass.

## Self-Check: PASSED

Both task commits exist; all six new files and this summary exist. The changed source/test paths match Plan 16-01. No live model/provider call, booking flow, durable schema, browser storage or infrastructure change was introduced.
