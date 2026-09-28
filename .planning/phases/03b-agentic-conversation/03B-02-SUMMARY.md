---
phase: 03b-agentic-conversation
plan: '02'
subsystem: private-mcp-boundary
tags: [fastmcp, tavily, google-maps, agentcore-gateway, security]
requires: [03B-CONTEXT]
provides: [authenticated-fastmcp-targets, bounded-evidence-registry, gateway-dry-run-contract]
affects: [03B-01]
tech-stack:
  added: [PyJWT assertion boundary, FastMCP transport adapter]
  patterns: [Gateway-issued signed Plan assertions, registry-only source lookup]
key-files:
  created:
    - services/mcps/transport.py
    - services/mcps/gateway_interceptor.py
    - services/mcps/tests/test_transport.py
    - services/mcps/tests/test_research_security.py
    - services/mcps/tests/test_map_security.py
    - scripts/provision-agentcore-gateway.py
  modified:
    - services/mcps/research_server.py
    - services/mcps/map_server.py
    - services/mcps/config.py
    - services/mcps/README.md
decisions:
  - Gateway tools/list is public for catalog synchronization; tools/call requires both the Gateway service token and a short-lived signed actor/Plan assertion.
  - Source details are served only from an expiring registry keyed by verified actor, Plan, and research run; arbitrary URLs are never fetched.
  - Temporary map projections carry provider identity, coordinates, locality, and attribution and do not write CRUD records.
metrics:
  duration: 0h45m
  completed: 2026-09-28
  commits: 1
  plan_head_before: 32e4c52
actuals:
  tokens: 12000
  tasks: 3
  commits: 1
status: complete
---

# Phase 3B Plan 2: Authenticated FastMCP targets Summary

Bounded Tavily research, registry-backed source inspection, and temporary
Google map projections now sit behind a Gateway authentication boundary.

## Delivered

- Added Gateway interceptor logic that explicitly receives Authorization,
  validates Cognito access-token claims and Plan ownership, removes spoofed
  scope arguments, and injects a short-lived signed assertion.
- Added target-side service-token and signed assertion verification plus an
  authenticated dispatch helper for FastMCP tools.
- Normalized Tavily results to at most five distinct candidates with stable
  run-scoped IDs, compact claims, caveats, and HTTPS evidence references.
- Added an expiring, metadata-only evidence registry for source badges.
- Hardened map projection output with bounded/deduplicated names, coordinate
  validation, city/country extraction, attribution, and no CRUD mutation.
- Added a redacted AgentCore MCP Gateway dry-run contract and private runtime
  environment documentation.

## Verification

- `uv run pytest -q services/mcps/tests` — 10 passed.
- `uv run ruff check services/mcps scripts/provision-agentcore-gateway.py` — passed.
- `uv run python -m compileall -q services/mcps scripts` — passed.
- `uv run python scripts/provision-agentcore-gateway.py --dry-run` — emitted a
  redacted MCP Gateway contract with two MCP_SERVER targets.
- `git diff --check` — passed.

## Known Stubs

- `scripts/provision-agentcore-gateway.py` keeps live AWS target reconciliation
  behind deployment-specific Cognito and OAuth resource configuration; the
  offline dry-run contract is executable and intentionally emits placeholders
  instead of inventing account-specific identifiers.

## Self-Check: PASSED

The implementation commit and all listed files exist. No provider secrets or
local `.env` files were read, printed, or committed.
