---
phase: 10-evidence-grounded-iterative-agent-research
plan: 01
subsystem: agent
tags: [langgraph, anthropic, tavily, mcp, evidence]

requires:
  - phase: 03b
    provides: Authenticated Plan-scoped Agent graph and private research MCP tools
provides:
  - A bounded page-read result scoped to evidence issued for the current Plan and research run
  - Claude answers grounded in successfully read page text with application-validated evidence IDs
  - Explicit factual-research and destination-discovery routing with a safe clarification fallback
affects: [10-02, research-evaluation, agent-citations]

actuals:
  tokens: 16326
  tasks: 2
  commits: 2
plan_head_before: 1b550952b760bf9858e14fcb0b92e086b4fc20cc
commits: 2

tech-stack:
  added: []
  patterns:
    - Reuse the existing private source tool to read one Plan/run-scoped URL from Tavily Extract
    - Pass bounded, untrusted page content to Claude only after a successful read
    - Validate returned evidence IDs in the graph before exposing answer sources
key-files:
  created:
    - .planning/WINDOWS.md
  modified:
    - services/mcps/research_server.py
    - services/agent/claude/adapter.py
    - services/agent/claude/messages.py
    - services/agent/graph/nodes/research.py
    - services/agent/graph/nodes/conversation.py
    - services/agent/graph/builder.py
    - services/agent/service.py
    - services/agent/state/contracts.py
    - services/agent/prompts/conversation-v1.md
    - services/agent/prompts/research-v1.md
    - services/agent/tests/test_agent_graph.py
    - services/agent/tests/test_agent_api.py
    - services/agent/tests/test_agent_turn.py
    - services/agent/tests/test_model_provider.py
    - services/mcps/tests/test_mcp_tools.py
key-decisions:
  - "Keep the existing allow-listed MCP tool boundary; source reading accepts only evidence IDs from the current Plan and run."
  - "Claude receives successful page text as untrusted data, while the application rejects citations outside the read evidence set."
  - "Route factual place questions separately from destination discovery; missing or unknown intent asks one focused clarification."
patterns-established:
  - "Evidence-first synthesis: search identity -> scoped page read -> Claude answer -> application citation validation."
  - "Only validated citations from successfully read pages populate answer-level source links."
requirements-completed: [DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Research reads a scoped page before synthesis and withholds answer citations for unavailable or foreign evidence."
    requirement: TRUST-04
    verification:
      - kind: integration
        ref: "uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py services/mcps/tests/test_mcp_tools.py"
        status: pass
    human_judgment: false
  - id: D2
    description: "Factual place questions and destination discovery use separate validated paths; candidate IDs remain unchanged for discovery."
    requirement: DISC-06
    verification:
      - kind: integration
        ref: "services/agent/tests/test_agent_graph.py"
        status: pass
      - kind: unit
        ref: "services/agent/tests/test_agent_turn.py"
        status: pass
    human_judgment: false
duration: 20min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 01: Evidence-grounded iterative agent research Summary

**Plan-scoped place research now reads a source page before Claude answers and validates every answer citation against that successful read.**

## Performance

- **Duration:** approximately 20 min
- **Started:** 2026-10-04T11:34:00Z (approximate; execution start time was not recorded)
- **Completed:** 2026-10-04T11:53:39Z
- **Tasks:** 2
- **Files modified:** 17 (15 implementation/test files, the summary, and the deviation ledger)

## Accomplishments

- Extended the existing private source tool to extract one Plan/run-scoped page, bound its text to 10,000 characters, and mark unavailable pages without returning their search excerpts as page evidence.
- Added Claude synthesis that treats extracted text as untrusted, validates cited IDs against the successfully read evidence, and streams answer text only after validation.
- Added explicit factual research versus destination discovery intent. Factual search uses the question as written and works without destination candidates; discovery preserves its structured candidates and IDs.
- Routed only validated read-page citations into the existing answer source-link projection.

## Task Commits

1. **Task 1: Trace one place question through page reading to Claude synthesis** - `2bb89a4` (feat)
2. **Task 2: Route factual questions and candidate discovery through the evidence path** - `290d12a` (feat)

## Files Created/Modified

- `services/mcps/research_server.py` - Plan/run-scoped source records and bounded Tavily page extraction.
- `services/agent/claude/adapter.py`, `services/agent/claude/messages.py` - Read evidence delivery and Claude synthesis validation.
- `services/agent/graph/nodes/research.py`, `services/agent/graph/nodes/conversation.py` - Evidence-first synthesis and validated intent routing.
- `services/agent/graph/builder.py`, `services/agent/state/contracts.py`, `services/agent/service.py` - Carry only validated source links through the existing response projection.
- `services/agent/prompts/conversation-v1.md`, `services/agent/prompts/research-v1.md` - Intent and evidence handling rules.
- `services/agent/tests/test_agent_graph.py`, `services/agent/tests/test_agent_api.py`, `services/agent/tests/test_agent_turn.py`, `services/agent/tests/test_model_provider.py`, `services/mcps/tests/test_mcp_tools.py` - Fixture coverage for order, unavailable reads, citations, intent routing, and candidate preservation.

## Decisions Made

- Reused the existing source MCP tool and allow-list. The caller can request reading only by a scoped evidence ID; it cannot supply an arbitrary page URL.
- The answer cites only a source ID from a successfully read page. On a failed read, the graph returns a clear limitation and no answer-level source link.
- Kept destination discovery candidates in their existing structured path and let the model add only an evidence-grounded explanation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Connected validated source identities to the existing response links**
- **Found during:** Task 1
- **Issue:** The declared Agent files did not include the state/projection/service fields required to carry Claude-validated source IDs to the existing answer source links. Falling back to the old candidate projection could expose unrelated, unread search sources under the answer.
- **Fix:** Added an explicit source projection and made the service prefer it, including an intentional empty source list when no citation is eligible. Also included traveler scope in the source tool arguments required by the local authenticated MCP transport.
- **Files modified:** `services/agent/graph/builder.py`, `services/agent/state/contracts.py`, `services/agent/service.py`, `services/agent/claude/adapter.py`
- **Verification:** Graph/API and MCP fixture tests passed.
- **Committed in:** `2bb89a4`

**2. [Rule 2 - Missing critical functionality] Supported factual search without destination candidates**
- **Found during:** Task 1 integration
- **Issue:** The existing Connector always rewrote research queries as destination recommendations and retained page identities only through candidate records, preventing factual research on arbitrary country/place topics.
- **Fix:** Added validated factual/discovery query intent to the existing MCP operation and retained generic scoped source identities for factual results even when no candidates are produced.
- **Files modified:** `services/mcps/research_server.py`, `services/mcps/tests/test_mcp_tools.py`
- **Verification:** A fixture asserts a factual query reaches Tavily unchanged and returns scoped source identity without candidate records.
- **Committed in:** `2bb89a4`

**Total deviations:** 2 auto-fixed (Rule 2)
**Impact on plan:** Both extensions were required to deliver the promised answer citations and arbitrary factual place research through the current authenticated service boundaries. No frontend or durable Plan data changes were made.

## Issues Encountered

- The first verification run exposed a mock-client signature mismatch and missing typed LangGraph projection fields. Fixed both and reran the checks successfully.

## User Setup Required

None - no new external service configuration required; the existing Tavily API key is reused.

## Next Phase Readiness

Plan 10-02 can build on the new intent and page-read evidence contract to add bounded refinement and multiple targeted reads. This plan reads one page per run; iterative refinement and freshness reuse remain for later plans.

## Self-Check: PASSED

- Summary file exists at the planned path.
- Task commits `2bb89a4` and `290d12a` exist in Git history.
- The measured count from `plan_head_before` to HEAD is 2 task commits.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
