---
phase: 10-evidence-grounded-iterative-agent-research
plan: 03
subsystem: agent
tags: [langgraph, claude, bedrock, tavily, evidence]

requires:
  - phase: 10-01
    provides: Evidence-first synthesis and Plan/run-scoped source identity
  - phase: 10-02
    provides: Bounded page reads and normalized source provenance
provides:
  - Validated answer/refine research decisions with bounded targeted query text
  - LangGraph-owned three-search-call limit with supported terminal uncertainty
  - Per-pass selection of up to three read pages within a 10,000-character turn budget
affects: [10-04, research-evaluation, agent-citations]

actuals:
  tokens: 15026
  tasks: 2
  commits: 3
  plan_head_before: 40ee2a0

tech-stack:
  added: []
  patterns:
    - Validate model review output and evidence IDs in application code before routing or streaming
    - Keep search pass count and normalized query history in bounded graph state
    - Carry selected candidate IDs unchanged through destination-discovery refinements

key-files:
  created: []
  modified:
    - services/agent/claude/messages.py
    - services/agent/prompts/research-v1.md
    - services/agent/state/contracts.py
    - services/agent/graph/builder.py
    - services/agent/graph/nodes/research.py
    - services/agent/tests/test_agent_turn.py
    - services/agent/tests/test_agent_graph.py

key-decisions:
  - "Use ordinary Anthropic Messages JSON output on Bedrock; add no unsupported constrained-output request fields."
  - "LangGraph enforces one initial search plus at most two targeted refinements, with a recursion ceiling as a backstop."
  - "At the cap, require an evidence-grounded partial answer and expose the remaining uncertainty; never answer from fallback knowledge."

patterns-established:
  - "Claude can request only a bounded refinement query after naming a concrete evidence gap; it cannot call tools directly."
  - "Only successfully read, current-turn evidence IDs can be cited; malformed or foreign citations fail closed."

requirements-completed: [DISC-07, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Model review decisions accept only bounded answer/refine actions, exact known citations, and applicable travel safety limits."
    requirement: TRUST-04
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_turn.py"
        status: pass
    human_judgment: false
  - id: D2
    description: "The graph performs at most three search calls, reads no more than three pages per pass, and ends with cited supported facts and uncertainty."
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py"
        status: pass
    human_judgment: false

duration: 19min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 03: Bounded iterative research Summary

**Claude now reviews read-page evidence, requests only targeted refinements, and returns a supported answer within a deterministic three-search-call limit.**

## Performance

- **Duration:** approximately 19 minutes
- **Started:** 2026-10-04T12:12:16Z (execution session start)
- **Completed:** 2026-10-04T12:30:46Z
- **Tasks:** 2
- **Files modified:** 8 including this summary

## Accomplishments

- Added a strict answer/refine contract: query text is capped at 300 characters, only current successfully read evidence IDs are accepted, and malformed actions fail closed.
- Reworked the research node to accumulate up to three bounded page reads per search pass within a 10,000-character per-turn evidence limit.
- Added a conditional LangGraph loop with at most three total search calls, duplicate/empty/oversized query rejection, and a forced answer after the cap.
- Preserved initial destination candidate IDs across refinements and retained both source references when an answer explains a conflict.
- Kept the configured Bedrock Claude Sonnet 4.5 Messages request compatible; no provider-specific constrained JSON field was added.

## Task Commits

1. **Task 1: Define and validate Claude's evidence review decision** - `51edfb9` (feat)
2. **Task 2: Enforce the hard pass cap and finish with supported uncertainty** - `42eedc7` (feat)

**Plan metadata:** Summary commit follows this file.

## Files Created/Modified

- `services/agent/claude/messages.py` - Builds an evidence review request and streams only a validated terminal answer.
- `services/agent/prompts/research-v1.md` - Specifies evidence sufficiency, bounded refinement, source disagreement, and entry/health safeguards.
- `services/agent/state/contracts.py` - Defines the validated answer/refine schema and loop state fields.
- `services/agent/graph/builder.py` - Routes targeted refinements through a bounded cycle and sets a recursion backstop.
- `services/agent/graph/nodes/research.py` - Searches, reads and bounds evidence, validates citations, preserves candidates, and completes with uncertainty.
- `services/agent/tests/test_agent_turn.py` - Covers valid decisions, malformed output, unknown citations, query bounds, prompt safeguards, and Bedrock request compatibility.
- `services/agent/tests/test_agent_graph.py` - Covers pass ordering, cap behavior, duplicate/invalid refinement rejection, citations, page limits, and candidate preservation.
- `.planning/phases/10-evidence-grounded-iterative-agent-research/10-03-SUMMARY.md` - Records execution results.

## Decisions Made

- LangGraph owns the search loop and its three-call ceiling; the model may only return a validated targeted query.
- Search snippets and unread pages never enter the evidence set. Claude sees only bounded successfully read page text as untrusted content.
- The third pass is marked as terminal for model review, and the graph appends unresolved evidence gaps to the traveler-facing answer.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

- Initial graph verification exposed an un-awaited async terminal helper. The helper calls were awaited and the exact plan verification then passed.
- Targeted Ruff checks pass. Pytest reports existing LangGraph deprecation warnings only.

## User Setup Required

None - the existing Bedrock and Tavily configuration is reused.

## Next Phase Readiness

Plan 10-04 can build on validated bounded review state and the three-pass loop. The search and read call limits are enforced in application code and do not rely on prompt compliance.

## Self-Check: PASSED

- Summary file exists at the planned path.
- Task commits `51edfb9` and `42eedc7` exist in Git history.
- Exact Plan 10-03 verification passes: `21 passed`.
- No unresolved stubs or new network endpoints were found in the changed implementation files.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
