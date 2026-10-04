---
phase: 10-evidence-grounded-iterative-agent-research
plan: 04
subsystem: agent
tags: [langgraph, claude, tavily, sse, citations]

requires:
  - phase: 10-01
    provides: Evidence-first synthesis and Plan/run-scoped source identity
  - phase: 10-02
    provides: Bounded page reads and normalized source provenance
  - phase: 10-03
    provides: Validated bounded research loop and cited answer decisions
provides:
  - Validated successfully read source references alongside assistant replies
  - Candidate-preserving discovery synthesis with no durable Plan mutation
affects: [agent-citations, research-evaluation]

actuals:
  tokens: 8240
  tasks: 2
  commits: 3
  plan_head_before: a96b14d

tech-stack:
  added: []
  patterns:
    - Project source links only after resolving cited IDs against successfully read current-scope evidence
    - Preserve candidate records across answer synthesis and keep research turns read-only

key-files:
  created: []
  modified:
    - services/agent/graph/builder.py
    - services/agent/service.py
    - services/agent/tests/test_agent_api.py
    - services/agent/tests/test_agent_graph.py
    - services/agent/tests/test_agent_turn.py

key-decisions:
  - "Only successfully read, current evidence can become a browser-visible source reference; the candidate-evidence fallback was removed."
  - "The existing ordered SSE contract remains the transport for assistant text and validated source references."

patterns-established:
  - "Validate source IDs, read status, expiry, and HTTPS URLs at the service boundary before projecting references."
  - "Synthesis preserves discovery candidate identity, data, associations, and ordering."

requirements-completed: [DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Only validated source links for successfully read evidence appear with the relevant chat reply."
    requirement: TRUST-04
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_api.py services/agent/tests/test_agent_turn.py (28 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grounded synthesis retains destination candidates and does not mutate durable Plan data."
    requirement: DISC-09
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py (40 passed)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 04: Validated chat source projection Summary

**Plan chat streams the grounded answer with validated links to pages actually read while preserving destination candidates.**

## Performance

- **Duration:** approximately 25 minutes including recovery
- **Started:** 2026-10-04T12:31:00Z (approximate)
- **Completed:** 2026-10-04T12:56:00Z (approximate)
- **Tasks:** 2
- **Files modified:** 6 including this summary

## Accomplishments

- Added service-side source validation against current graph evidence, successful read status, expiry, and strict HTTPS URLs.
- Removed the unsafe candidate-evidence fallback so unread or unrelated sources cannot be attached to streamed replies.
- Preserved destination candidates through synthesis and covered discovery versus factual-answer behavior and Plan read-only guarantees.

## Task Commits

1. **Task 1: Project only validated read sources with the assistant reply** - `d13d7b3` (fix)
2. **Task 2: Preserve destination candidates alongside grounded explanations** - `2234c8e` (test)

**Plan metadata:** Summary commit follows this file.

## Files Created/Modified

- `services/agent/graph/builder.py` - Projects cited, successfully read sources with the graph answer.
- `services/agent/service.py` - Validates source identity, scope, freshness, and URL before SSE projection.
- `services/agent/tests/test_agent_api.py` - Covers streaming source validation and malformed URLs.
- `services/agent/tests/test_agent_graph.py` - Covers candidate preservation through synthesis.
- `services/agent/tests/test_agent_turn.py` - Covers source/candidate answer behavior and read-only research.

## Decisions Made

- Source links are resolved only against successful reads in the active evidence set, then checked for expiry and HTTPS format.
- Existing chat streaming and terminal-event placement continue to carry the answer and its sources.

## Deviations from Plan

None in implementation scope. The assigned executor exhausted its usage allowance after committing both tasks, before producing the summary. The orchestrator inspected the task commits and ran both exact verification commands before recording this summary.

## Issues Encountered

- Recovery verification passed: `uv run pytest -q services/agent/tests/test_agent_api.py services/agent/tests/test_agent_turn.py` (28 passed), and `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py` (40 passed).

## User Setup Required

None - the existing Bedrock and Tavily configuration is reused.

## Next Phase Readiness

Plan 10-05 can extend the validated source and answer projections with resumable evidence state and freshness handling.

## Self-Check: PASSED

- Task commits `d13d7b3` and `2234c8e` exist.
- Both exact verification commands passed.
- No unrelated worktree changes were included.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
