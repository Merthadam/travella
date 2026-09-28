---
phase: 03b-agentic-conversation
plan: '05'
subsystem: research-mcp
tags: [fastmcp, tavily, evidence, destination-normalization, security]
dependency_graph:
  requires: [03B-03]
  provides: [destination-entity-normalization, cited-claims, scoped-evidence-bindings]
  affects: [services/mcps/research_server.py]
tech_stack:
  added: []
  patterns: [bounded-source-normalization, stable-run-identifiers, evidence-bound-projections]
key_files:
  created: []
  modified:
    - services/mcps/research_server.py
    - services/mcps/tests/test_mcp_tools.py
    - services/mcps/tests/test_research_security.py
decisions:
  - Treat external source text as evidence only and accept destination entities only from a conservative supported location vocabulary.
  - Derive source and candidate IDs from the research run plus canonical source or place identity rather than result rank.
  - Represent every claim and caveat with current-run evidence IDs; mark duplicate-source conflicts uncertain.
metrics:
  duration: 00:25
  completed: 2026-09-28
  commits: 2
  plan_head_before: 353d6fb14f82fc1f4330f02673507ddaad6e8758
  estimateTokens: 17000
  actuals:
    tokens: 5290
    tasks: 2
    commits: 2
status: complete
---

# Phase 3B Plan 5: Evidence-backed destination normalization Summary

Tavily results now produce destination entities only when the source excerpt explicitly names a supported place. Article and list headings cannot become destination names, instruction-like source text is ignored, and unsupported or generic evidence produces an honest `uncertain` empty result.

Each candidate has a stable run-scoped ID, compact claims and caveats with evidence IDs, and allow-listed source metadata. Duplicate pages for one place are merged; conflicting source polarity lowers confidence and adds an evidence-bound uncertainty caveat. The existing scoped registry remains the only source-detail lookup path, so expired, foreign, or unknown evidence IDs do not resolve.

## Tasks

| Task | Description | Commit |
| --- | --- | --- |
| 1 | Add red tests for list/article pages, unsupported entities, and injection-shaped source text | `db2e7c8` |
| 2 | Implement destination extraction, stable IDs, evidence-bound claims/caveats, deduplication, and conflict uncertainty | `a025bc1` |

## Verification

- `uv run pytest -q services/mcps/tests/test_mcp_tools.py services/mcps/tests/test_research_security.py` — 8 passed.
- `uv run ruff check services/mcps/research_server.py services/mcps/tests/test_mcp_tools.py services/mcps/tests/test_research_security.py` — passed.
- `uv run python -m compileall -q services/mcps/research_server.py` — passed.

The complete MCP test directory still contains a pre-existing `test_map_security.py` call using the older three-argument map tool signature; it is outside this plan's files and was not changed.

## Deviations from Plan

None. The plan's requested normalization is implemented without introducing a provider call or exposing raw Tavily payloads.

## Threat Flags

| Flag | File | Description |
| --- | --- | --- |
| threat_flag: source-text-tampering | services/mcps/research_server.py | External source text is filtered as untrusted evidence, with instruction-like content rejected before entity extraction. |
| threat_flag: evidence-disclosure | services/mcps/research_server.py | Candidate projections allowlist compact source metadata and bind material claims/caveats to current-run evidence IDs. |

## Self-Check: PASSED

- `services/mcps/research_server.py` exists and contains destination and evidence normalization.
- `services/mcps/tests/test_mcp_tools.py` and `services/mcps/tests/test_research_security.py` exist with the new behavior coverage.
- Commits `db2e7c8` and `a025bc1` are present in the repository history.
