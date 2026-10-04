---
phase: 10-evidence-grounded-iterative-agent-research
plan: 06
subsystem: agent
tags: [pytest, evaluation, prompt-injection, cancellation, travel-research]

requires:
  - phase: 10-01
    provides: Evidence-first research and read-source identity
  - phase: 10-02
    provides: Bounded page reads and provenance
  - phase: 10-03
    provides: Bounded iterative research and supported uncertainty
  - phase: 10-04
    provides: Validated chat source projection
  - phase: 10-05
    provides: Freshness-aware evidence reuse
provides:
  - Twenty sanitized deterministic country/place research evaluation scenarios
  - Regressions for adversarial page text and superseded turn output
  - Offline evaluation schema and category contract
affects: [research-quality, safety-review, release-evaluation]

actuals:
  tokens: 7640
  tasks: 2
  commits: 2
  plan_head_before: 376e008

tech-stack:
  added: []
  patterns:
    - Use synthetic fixture scenarios and fake adapters for offline research evaluations
    - Recheck Plan generation before publishing model text or a completed research projection

key-files:
  created:
    - services/agent/evals/fixtures/research_cases.json
    - services/agent/evals/test_research_eval.py
  modified:
    - services/agent/service.py
    - services/agent/tests/test_agent_api.py
    - services/agent/tests/test_agent_graph.py
    - services/agent/tests/test_local_mcp.py

key-decisions:
  - "The evaluation harness checks deterministic fixture completeness and safety contracts only; it does not call Bedrock, Tavily, or an LLM judge."
  - "AgentTurnService suppresses late text and returns an interrupted result when a newer Plan generation supersedes the active turn."

patterns-established:
  - "Keep source conflicts, unavailable reads, domain caveats, tool order, and terminal behavior explicit beside each synthetic case."
  - "Treat the latest Plan generation as the authority for whether answer deltas and citations may publish."

requirements-completed: [DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Twenty labeled synthetic cases exercise entry, health/safety, season/transport, evidence failures/conflicts, and adversarial control."
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/evals (4 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prompt-injection content cannot expand tool capability or rewrite candidates, and superseded research cannot publish late text or sources."
    requirement: TRUST-04
    verification:
      - kind: unit
        ref: "uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_api.py services/mcps/tests/test_research_security.py (55 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "High-consequence entry, health, and safety reference cases receive specialist review before release."
    requirement: DISC-06
    verification: []
    human_judgment: true
    rationale: "The plan requires qualified travel, immigration/consular, health, and safety reviewers to judge domain applicability and caveats; deterministic schema tests cannot substitute for that review."

duration: 25min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 06: Research evaluation and adversarial coverage Summary

**An offline 20-case evaluation corpus and turn-generation guard now cover research quality, evidence failures, injection attempts, and obsolete output.**

## Performance

- **Duration:** approximately 25 minutes
- **Started:** 2026-10-04T13:26:00Z (approximate)
- **Completed:** 2026-10-04T13:51:00Z (approximate)
- **Tasks:** 2
- **Files modified:** 7 including this summary

## Accomplishments

- Added 20 sanitized scenarios in the required category mix: five entry applicability, four health/safety, three season/transport, three unread/conflicting-source, and five adversarial/control cases.
- Added deterministic harness checks for labels, required evidence and caveat fields, category counts, tool-sequence bounds, high-consequence qualifications, and safe terminal behavior.
- Added adversarial retrieved-page coverage proving malicious text cannot rewrite candidate identity or add a booking capability.
- Added a superseded-turn race regression: late text and source references are suppressed and the result is marked interrupted.
- Updated an older local MCP assertion to match the existing `research_intent` request contract.

## Task Commits

1. **Task 1: Add adversarial and superseded-run regression coverage** - `05490fd` (test)
2. **Task 2: Create the labeled research evaluation corpus and pytest harness** - `85e1f3c` (test)

**Plan metadata:** Summary commit follows this file.

## Files Created/Modified

- `services/agent/evals/fixtures/research_cases.json` - Twenty synthetic scenarios with expected reads, claims, caveats, tool sequences, and terminal behavior.
- `services/agent/evals/test_research_eval.py` - No-network fixture contract harness.
- `services/agent/service.py` - Suppresses late output and interrupts a superseded generation.
- `services/agent/tests/test_agent_api.py` - Covers a late completion after newer input takes ownership.
- `services/agent/tests/test_agent_graph.py` - Covers malicious page instructions and candidate preservation.
- `services/agent/tests/test_local_mcp.py` - Aligns expected local tool arguments with the current request schema.

## Decisions Made

- The test harness measures deterministic contracts, not model answer quality; human domain review remains a release requirement for consequential cases.
- A generation check gates streamed deltas and final projections so an older turn cannot surface after a newer turn begins.

## Deviations from Plan

### Auto-fixed Issues

**1. Superseded turns could complete after a newer Plan event**
- **Found during:** Task 1 (adversarial and superseded-run regression coverage)
- **Issue:** A non-candidate research answer could finish after a later generation began, and the service had no final generation check for text or sources.
- **Fix:** Check the active generation before emitting deltas and before processing/publishing the graph result; return an interrupted projection for obsolete work.
- **Files modified:** `services/agent/service.py`, `services/agent/tests/test_agent_api.py`
- **Verification:** The late-completion regression passes in the full Agent/MCP suite.
- **Committed in:** `05490fd`

**2. Local MCP request assertion lagged the current research intent contract**
- **Found during:** Full phase regression gate
- **Issue:** The older test expected a request without `research_intent` although the adapter sends it.
- **Fix:** Updated the expected payload to include `destination_discovery`.
- **Files modified:** `services/agent/tests/test_local_mcp.py`
- **Verification:** Full Agent/eval/MCP suite passes.
- **Committed in:** `85e1f3c`

**Total deviations:** 2 necessary corrections. No new runtime feature beyond the plan's obsolete-run protection.

## Issues Encountered

- The first full regression run exposed the stale local MCP test expectation; corrected and reran the complete suite.
- `uv run pytest -q services/agent/evals services/agent/tests services/mcps/tests` passed: **121 passed**.
- Targeted Ruff checks passed.

## User Setup Required

None for automated tests. Before release, obtain the specialist review described in coverage D3 for entry-rule, health, and safety cases.

## Next Phase Readiness

All six Phase 10 plans have implementation and automated regression coverage. The phase verifier should assess the phase-wide goal and route D3 to a human release check.

## Self-Check: PASSED

- Task commits `05490fd` and `85e1f3c` exist.
- The 20-case corpus passes its offline harness.
- The phase-wide automated test suite passes: 121 tests.
- High-consequence human review is recorded as pending rather than claimed complete.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
