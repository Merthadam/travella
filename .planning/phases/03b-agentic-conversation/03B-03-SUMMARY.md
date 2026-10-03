---
phase: 03b-agentic-conversation
plan: '03'
subsystem: mcp-transport
tags: [fastmcp, mcp, agentcore-gateway, oauth, json-rpc, security]
requires: [03B-02]
provides: [authenticated-fastmcp-asgi, agentcore-mcp-interceptor-adapter, protocol-level-mcp-tests]
affects: [03B-04, 03B-06]
tech-stack:
  added: []
  patterns: [ASGI authentication wrapper, OAuth JWT target credentials, nested MCP tools/call transformation]
key-files:
  created: [services/mcps/tests/test_transport.py additions, .planning/phases/03b-agentic-conversation/03B-03-SUMMARY.md]
  modified: [services/mcps/transport.py, services/mcps/gateway_interceptor.py, services/mcps/research_server.py, services/mcps/map_server.py, services/mcps/tests/test_mcp_tools.py, services/mcps/tests/test_map_security.py, services/mcps/.env.example, services/mcps/README.md]
key-decisions:
  - Target servers validate OAuth client-credentials JWTs by issuer, signature/JWKS, audience, client identity, expiry, and required scope.
  - Gateway scope assertions are read from and written back to params.arguments in the AgentCore MCP interceptor envelope.
  - FastMCP target tools receive Plan identity through verified context; traveler_scope and assertion fields are stripped before invocation.
metrics:
  duration: 00:45
  completed: 2026-09-28
  commits: 1
  plan_head_before: 353d6fb14f82fc1f4330f02673507ddaad6e8758
actuals:
  tokens: 12160
  tasks: 2
  commits: 1
status: complete
---

# Phase 3B Plan 3: Authenticated FastMCP protocol path Summary

Real MCP JSON-RPC requests now cross the local AgentCore interceptor contract and reach mounted FastMCP target applications only after both service and traveler/Plan authorization succeed.

## Delivered

- Added AgentCore `interceptorInputVersion: 1.0` request adaptation and `interceptorOutputVersion: 1.0` transformed request/short-circuit response envelopes.
- Corrected Gateway interception to preserve JSON-RPC identity and tool name while reading `plan_id` from `params.arguments` and injecting verified scope data into those same arguments.
- Replaced the static shared target token check with OAuth JWT validation supporting direct signing keys or JWKS, issuer, audience, client identity, expiry, and required service scope.
- Added an authenticated ASGI wrapper around each FastMCP Streamable HTTP app. It validates JSON-RPC envelopes, establishes and cleans up `ContextVar` scope for awaited dispatch, strips auth-only arguments, and returns bounded protocol errors before provider calls.
- Made every published map and research tool Plan-scoped, including `get_candidate_map_projection`.
- Added protocol-level tests for AgentCore envelopes, mounted research calls, direct-call rejection, map catalog schemas, map calls, and target credential boundaries.

## Verification

- `uv run pytest -q services/mcps/tests` — passed: 16 tests.
- `uv run ruff check services/mcps scripts/provision-agentcore-gateway.py` — passed.
- `uv run python -m compileall -q services/mcps` — passed.
- `git diff --check` — passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated map security test for the Plan-scoped published contract**
- **Found during:** Task 2
- **Issue:** The existing unit test still passed the removed caller-controlled `traveler_scope` positional argument.
- **Fix:** The test now passes a mismatched Plan ID and proves the authenticated context rejects it.
- **Files modified:** `services/mcps/tests/test_map_security.py`

## Known Stubs

- `services/mcps/gateway_interceptor.py`: `lambda_handler` fails closed until the deployed AgentCore Lambda adapter supplies a real CRUD Plan ownership reader. This prevents an unconfigured deployment from authorizing arbitrary Plans; live resource wiring is the subject of 03B-04.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-boundary | services/mcps/transport.py | Adds a public ASGI request boundary that validates Gateway OAuth credentials and signed traveler/Plan assertions before FastMCP dispatch. |
| threat_flag: interceptor | services/mcps/gateway_interceptor.py | Adds AgentCore event adaptation and authorization-sensitive argument transformation. |

## Self-Check: PASSED

- Commit `7cea9c7` exists and contains the implementation and protocol tests.
- All files referenced by the plan are present and compile.
- The summary records the intentional fail-closed deployment stub and its follow-up plan.
