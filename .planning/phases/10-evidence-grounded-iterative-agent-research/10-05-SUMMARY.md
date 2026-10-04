---
phase: 10-evidence-grounded-iterative-agent-research
plan: 05
subsystem: agent
tags: [langgraph, checkpoint, freshness, evidence]

requires:
  - phase: 10-04
    provides: Validated source projection and candidate-preserving synthesis
provides:
  - Versioned compact Plan-scoped checkpoint evidence metadata
  - Stable, rules/schedule, and live evidence freshness windows
  - Same-Plan evidence reuse for relevant resumed follow-up questions
affects: [agent-resumption, research-freshness]

actuals:
  tokens: 9320
  tasks: 2
  commits: 2
  plan_head_before: 3fbe8fe

tech-stack:
  added: []
  patterns:
    - Keep checkpointed reuse evidence in a bounded per-Plan allow-list and omit raw graph evidence fields
    - Revalidate Plan scope, read status, relevance, retrieval age, and explicit expiry before reuse

key-files:
  created: []
  modified:
    - services/agent/checkpoint.py
    - services/agent/state/contracts.py
    - services/agent/graph/nodes/research.py
    - services/agent/tests/test_agent_checkpoint.py
    - services/agent/tests/test_agent_graph.py

key-decisions:
  - "Checkpoint schema version 2 stores at most six successful HTTPS reads with excerpts capped at 1,200 normalized characters."
  - "Stable facts expire after 30 days, rules and schedules after 24 hours, and live conditions after 1 hour."
  - "A follow-up reuses prior evidence only when Plan scope and topic match and Claude judges it sufficient; otherwise a new search proceeds."

patterns-established:
  - "Model research reuse as compact typed metadata plus excerpt rather than provider/page payloads."
  - "Fail closed on malformed timestamps, unsupported fact types, invalid URLs, unread evidence, and foreign Plan entries."

requirements-completed: [DISC-06, DISC-07, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Checkpoint serialization retains bounded allow-listed evidence metadata and excludes raw page payloads and secrets."
    requirement: TRUST-04
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_checkpoint.py services/agent/tests/test_agent_graph.py (24 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Relevant recent evidence is reused after resumption while stale, unread, unrelated, and foreign-Plan evidence is rejected."
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_checkpoint.py services/agent/tests/test_agent_graph.py (24 passed)"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 05: Resumable evidence freshness Summary

**Plan-scoped research now supports bounded, freshness-checked evidence reuse for relevant follow-up questions.**

## Performance

- **Duration:** approximately 30 minutes
- **Started:** 2026-10-04T12:56:00Z (approximate)
- **Completed:** 2026-10-04T13:26:00Z (approximate)
- **Tasks:** 2
- **Files modified:** 6 including this summary

## Accomplishments

- Added schema version 2 checkpoint projection with at most six same-Plan, successfully read sources and 1,200-character normalized excerpts.
- Excluded raw `evidence` and `research_evidence` page bundles from the safe checkpoint projection; malformed URLs, timestamps, fact types, unread pages, and foreign-Plan entries are rejected.
- Added fact-type expiry windows and a resumed research path that lets Claude answer from relevant fresh evidence without a new search.
- Added fake-clock freshness coverage and an integration test proving an eligible resumed follow-up does not call search.

## Task Commits

1. **Task 1: Persist only compact evidence eligible for Plan-thread reuse** - `3f4b299` (feat)
2. **Task 2: Apply fact-type freshness and reuse evidence after chat resumption** - `2a4b4a0` (feat)

**Plan metadata:** Summary commit follows this file.

## Files Created/Modified

- `services/agent/checkpoint.py` - Versioned allow-list for compact, bounded evidence metadata.
- `services/agent/state/contracts.py` - Typed evidence reuse and research state shapes.
- `services/agent/graph/nodes/research.py` - Relevance, scope, and freshness checks; reuse and refresh routing.
- `services/agent/tests/test_agent_checkpoint.py` - Checkpoint size, scope, URL, schema, and privacy coverage.
- `services/agent/tests/test_agent_graph.py` - Freshness boundaries and resumed evidence reuse coverage.

## Decisions Made

- Freshness is enforced in application code even when `valid_until` is present, preventing a bad timestamp from extending a fact beyond its type window.
- A reused excerpt is passed to the existing synthesis path and must still be judged sufficient before it can answer the traveler.

## Deviations from Plan

None in implementation scope.

## Issues Encountered

- Ruff initially found import ordering issues after adding checkpoint and graph coverage; both were corrected.
- Verification passed: `uv run pytest -q services/agent/tests/test_agent_checkpoint.py services/agent/tests/test_agent_graph.py` (24 passed), and targeted Ruff checks passed.

## User Setup Required

None - no external service configuration is required by this change.

## Next Phase Readiness

Plan 10-06 can now test adversarial and superseded-run behavior against the completed evidence loop and add the deterministic evaluation harness.

## Self-Check: PASSED

- Task commits `3f4b299` and `2a4b4a0` exist.
- Exact plan verification passed: 24 tests.
- No unrelated worktree changes were included.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
