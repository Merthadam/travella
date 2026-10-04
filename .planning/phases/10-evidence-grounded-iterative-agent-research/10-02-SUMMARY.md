---
phase: 10-evidence-grounded-iterative-agent-research
plan: 02
subsystem: api
tags: [tavily, mcp, extraction, source-quality, security]

requires:
  - phase: 10-01
    provides: Plan/run-scoped private source identities for page reading
provides:
  - Bounded multi-page extraction with explicit per-page read outcomes
  - Normalized source publisher, domain, retrieval time, and advisory quality labels
  - Fail-closed URL and provider-response handling at the private research boundary
affects: [10-03, 10-04, research-evaluation, agent-evidence]

actuals:
  tokens: 5834
  tasks: 2
  commits: 3
plan_head_before: d94383f31d305d85f87c9f294a4d00b1dcfdc717
commits: 3

tech-stack:
  added: []
  patterns:
    - Select at most three canonical HTTPS sources from Plan/run-scoped evidence IDs before extraction
    - Keep failed, redirected, malformed, and oversized reads as explicit unavailable outcomes without snippets
    - Derive advisory source quality from validated hostnames and never treat it as claim support

key-files:
  created: []
  modified:
    - services/mcps/research_server.py
    - services/mcps/tests/test_mcp_tools.py
    - services/mcps/tests/test_research_security.py

key-decisions:
  - "Extract only selected, deduplicated HTTPS source URLs, with per-page and per-turn text bounds."
  - "Keep source-quality labels advisory and host-based; they do not establish that a source supports a claim."
  - "Return generic unread outcomes for provider failures and reject redirects, unsafe URLs, and malformed page data."

requirements-completed: [DISC-09, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Private extraction reads no more than three distinct HTTPS pages and enforces page and turn text caps."
    requirement: TRUST-04
    verification:
      - kind: integration
        ref: "uv run pytest -q services/mcps/tests/test_mcp_tools.py"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each selected page is either bounded read evidence or an explicit unavailable result; search excerpts do not become read evidence."
    requirement: TRUST-04
    verification:
      - kind: integration
        ref: "uv run pytest -q services/mcps/tests/test_mcp_tools.py services/mcps/tests/test_research_security.py"
        status: pass
    human_judgment: false
  - id: D3
    description: "Source-quality labels distinguish configured official and reputable travel hosts, while unsafe URL, redirect, malformed, and oversized outcomes fail closed."
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "services/mcps/tests/test_research_security.py"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-10-04
status: complete
---

# Phase 10 Plan 02: Bounded private page extraction Summary

**The private research MCP now reads a bounded set of selected pages, reports unavailable sources explicitly, and returns normalized provenance without provider payloads.**

## Performance

- **Duration:** approximately 12 minutes
- **Started:** 2026-10-04T11:58:37Z (approximate, from Phase execution session start)
- **Completed:** 2026-10-04T12:10:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added canonical HTTPS URL validation and deduplicated extraction for at most three Plan/run-scoped source records per pass.
- Enforced 1,800 characters per page and 10,000 characters across the turn; failed, unsafe, malformed, and oversized reads return unavailable without excerpt text.
- Added publisher/domain and advisory official/reputable/general source classifications; extracted page text remains inert and untrusted.
- Added deterministic coverage for selection caps, failed reads, text boundaries, host classification, hostile content, redirects, malformed payloads, and unsafe URLs.

## Task Commits

1. **Task 1: Bound selected page extraction and surface unavailable reads** - `051f8ea` (feat)
2. **Task 2: Normalize source quality and defend the private extraction boundary** - `0c3446c` (feat)

**Plan metadata:** Summary commit follows this file.

## Files Created/Modified

- `services/mcps/research_server.py` - URL validation, bounded Tavily Extract calls, normalized provenance, quality metadata, and fail-closed read outcomes.
- `services/mcps/tests/test_mcp_tools.py` - URL selection and page/turn text-boundary fixtures.
- `services/mcps/tests/test_research_security.py` - source-quality, unsafe URL, malformed-response, redirect, and raw-payload fixtures.

## Decisions Made

- Only evidence IDs already scoped to the authenticated traveler, Plan, and run can select extraction URLs.
- Host-quality classifications are advisory. The model still needs successfully read evidence to support a claim.
- A redirect or malformed/oversized extraction is marked unavailable instead of returning its snippet or provider error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved the empty destination-discovery source contract**
- **Found during:** Task 2 (source-quality normalization)
- **Issue:** Adding generic source identities caused unsupported destination-discovery results to expose source titles despite returning no supported candidate.
- **Fix:** Suppress source projections for empty destination-discovery results while retaining generic source identities for factual research.
- **Files modified:** `services/mcps/research_server.py`
- **Verification:** Existing unsupported-entity fixture and the complete MCP verification command passed.
- **Committed in:** `0c3446c`

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Preserved the existing destination-discovery contract while keeping factual research source identities available.

## Issues Encountered

- The first Plan 10-02 verification exposed an empty `excerpt` key in page-read results. Removed it so search snippets cannot be mistaken for page evidence; reran the exact test command successfully.

## User Setup Required

None - the existing private Tavily configuration is reused.

## Next Phase Readiness

Plan 10-03 can use the bounded page records and explicit read outcomes as inputs for the iterative research loop. The Connector remains private and returns only normalized evidence metadata and text.

## Self-Check: PASSED

- Summary file exists at the planned path.
- Task commits `051f8ea` and `0c3446c` exist in Git history.
- The required Plan 10-02 MCP test commands passed (11 tests for Task 1; 27 combined tests for Task 2).
- No unresolved stubs or threat-surface additions were found in the changed implementation files.

---
*Phase: 10-evidence-grounded-iterative-agent-research*
*Completed: 2026-10-04*
