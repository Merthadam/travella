---
phase: 03b-agentic-conversation
plan: '06'
subsystem: agent
tags: [claude-sdk, mcp, langgraph, candidate-actions, generation-safety]
dependency_graph:
  requires: [03B-03, 03B-04, 03B-05]
  provides: [claude-mcp-agent-path, plan-scoped-candidate-actions, generation-safe-receipts]
  affects: [services/agent]
tech_stack:
  added: []
  patterns: [typed-mcp-result-extraction, process-local-plan-state, atomic-event-reservation]
key_files:
  created: []
  modified:
    - services/agent/claude.py
    - services/agent/graph.py
    - services/agent/app.py
    - services/agent/state.py
    - services/agent/tests/test_agent_api.py
decisions:
  - Route production research, map, and source actions through Claude beta.messages.create and its configured Gateway MCP connector.
  - Validate candidate and evidence selectors against the current Plan-scoped in-process snapshot before provider calls.
  - Keep candidate state process-local until durable LangGraph checkpoint restoration and CRUD revision reconciliation are implemented.
metrics:
  duration: 00:45
  completed: 2026-09-28
  commits: 1
  estimateTokens: 32000
  actuals:
    tokens: 10500
    tasks: 3
    commits: 1
status: complete
---

# Phase 3B Plan 6: Claude MCP agent path and candidate action safety

The Plan agent now executes research, map resolution, and source inspection through Claude's MCP connector configured for the private Gateway. Claude MCP result blocks are parsed as typed provider projections and fail closed on missing, malformed, mismatched, or errored tool results.

The authenticated agent API now maintains bounded Plan-scoped candidate state with validated explore, reject, extend, refresh, inspect, and name semantics. Evidence inspection uses the run and evidence IDs held by the current shortlist; caller messages cannot choose a source run. Atomic event reservations prevent concurrent duplicate delivery from starting duplicate external work, and generation checks suppress obsolete refresh results while preserving the previous complete shortlist on failure.

## Tasks

| Task | Description | Commit |
| --- | --- | --- |
| 1 | Route graph tool work through Claude SDK MCP connector and validate typed results | `b1afe0a` |
| 2 | Implement Plan-scoped candidate actions and evidence validation | `b1afe0a` |
| 3 | Add generation-safe state and duplicate event coordination | `b1afe0a` |

## Verification

- `uv run pytest -q services/agent/tests` — 10 passed.
- `uv run pytest -q` — 103 passed.
- `uv run ruff check services/agent services/mcps` — passed.
- `uv run python -m compileall -q services/agent services/mcps` — passed.

## Deviations from Plan

None. The production state boundary remains explicitly process-local as required by the plan; durable checkpoint restoration is deferred.

## Threat Flags

| Flag | File | Description |
| --- | --- | --- |
| threat_flag: mcp-output-tampering | services/agent/claude.py | Claude MCP results are accepted only from the expected allowlisted tool and must decode to a structured object. |
| threat_flag: candidate-selector-tampering | services/agent/app.py | Candidate and evidence selectors are checked against the current verified Plan snapshot before action or source calls. |
| threat_flag: obsolete-generation | services/agent/state.py | Atomic generation reservations prevent stale external completions from replacing a newer Plan projection. |

## Self-Check: PASSED

- Agent source and tests exist at the listed paths.
- Commit `b1afe0a` is present and contains only the intended agent files.
- Full test, lint, and compile checks passed.
