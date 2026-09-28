---
phase: 03b-agentic-conversation
verified: 2026-09-28T21:34:33Z
status: gaps_found
score: 4/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/phases/03b-agentic-conversation/03B-01-PLAN.md
  - .planning/phases/03b-agentic-conversation/03B-01-SUMMARY.md
  - .planning/phases/03b-agentic-conversation/03B-02-PLAN.md
  - .planning/phases/03b-agentic-conversation/03B-02-SUMMARY.md
  - .planning/phases/03b-agentic-conversation/03B-CONTEXT.md
  - scripts/provision-agentcore-gateway.py
  - services/agent/app.py
  - services/agent/claude.py
  - services/agent/graph.py
  - services/agent/memory.py
  - services/agent/state.py
  - services/agent/tests/test_agent_api.py
  - services/agent/tests/test_agent_state.py
  - services/mcps/README.md
  - services/mcps/config.py
  - services/mcps/gateway_interceptor.py
  - services/mcps/map_server.py
  - services/mcps/research_server.py
  - services/mcps/tests/test_map_security.py
  - services/mcps/tests/test_mcp_tools.py
  - services/mcps/tests/test_research_security.py
  - services/mcps/tests/test_transport.py
  - services/mcps/transport.py
covered_digest: "v1:sha256:0468a8f698228532bbfe21f5ec235e651038cc7768f58fa2a4406ddbdf353076"
gaps:
  - truth: "A verified traveler can submit one intent for an owned active Plan and receive one focused question or a complete shortlist of at most five candidates with temporary map locations."
    status: failed
    reason: "The live graph calls the Gateway directly without invoking Claude; the Gateway interceptor expects a different tools/call shape, and no FastMCP HTTP authentication adapter is mounted. The asserted end-to-end path cannot execute."
    artifacts:
      - path: services/agent/claude.py
        issue: "research, resolve_map, and sources bypass the unused complete() Claude SDK method."
      - path: services/mcps/gateway_interceptor.py
        issue: "Reads plan_id from params rather than params.arguments, then injects the assertion outside arguments."
      - path: services/mcps/transport.py
        issue: "Dispatch helper is never installed on the FastMCP HTTP request path."
    missing:
      - "Wire and exercise the actual API to Claude/Gateway to authenticated FastMCP targets path with a real MCP tools/call envelope."
  - truth: "The backend candidate-action contract covers explore, reject, extend, refresh, inspect source, and name destination without mutating CRUD Plan data."
    status: failed
    reason: "Explore, reject, and name only echo input; no Plan-scoped suppression or candidate validation exists. Refresh/extend lack prior shortlist state; inspect accepts caller-supplied evidence IDs and a run ID taken from the message. No generation check withholds obsolete output."
    artifacts:
      - path: services/agent/app.py
        issue: "Action handlers are stateless echoes or trust caller-provided source selectors."
      - path: services/agent/graph.py
        issue: "Refresh and extend merely alter the query, and projection has no prior-complete-result or cancellation state."
    missing:
      - "Implement the six action semantics and generation-safe replacement/interrupt behavior with behavioral tests."
  - truth: "An authorized research call returns no more than five destination-level candidates with compact cited claims and caveats."
    status: failed
    reason: "Candidate identity is derived from each web page title. A page titled as a list or article becomes a candidate; claims and caveats have no per-claim source binding beyond one page reference."
    artifacts:
      - path: services/mcps/research_server.py
        issue: "_destination_name splits the page title; _candidate_projection labels its snippet as fit_summary and adds a generic caveat."
    missing:
      - "Normalize destination entities and evidence-backed material claims/caveats, rejecting non-destination pages."
  - truth: "The Gateway aggregates both MCP-server target catalogs; direct target calls without service credential and a signed traveler/Plan assertion are rejected before provider work."
    status: failed
    reason: "The provisioning script creates or finds only a Gateway and returns a textual target-reconciliation instruction. FastMCP servers run directly with no target-side HTTP authentication middleware. The interceptor is a framework-neutral helper and is not deployed or connected to the Gateway."
    artifacts:
      - path: scripts/provision-agentcore-gateway.py
        issue: "No create_gateway_target, update target, synchronization, authorizer, or interceptor resource calls."
      - path: services/mcps/research_server.py
        issue: "FastMCP run() has no installed authentication adapter."
      - path: services/mcps/map_server.py
        issue: "FastMCP run() has no installed authentication adapter."
    missing:
      - "Provision/reconcile both MCP_SERVER targets and auth resources, mount verified request dispatch, and test real protocol requests."
---

# Phase 03B: Agentic Conversation Verification Report

**Phase goal:** Create the first executable Plan agent boundary: one focused question, bounded destination research, and a complete map-ready shortlist, with browser and CRUD authority preserved.
**Status:** gaps_found. The backend contract slice is incomplete. This is not a verdict that the broader Phase 3 or Phase 4 roadmap goals are complete.
**Re-verification:** No prior Phase 03B verification report existed.

## Goal Achievement

| # | Must-have from plans | Verdict | Code evidence |
|---|---|---|---|
| 1 | Authorized intent yields question or complete shortlist with temporary locations | **FAILED — BLOCKER** | `app.py:124-153` reaches `graph.py`, but `claude.py:107-114` bypasses `complete()`; the Gateway/target chain is broken below. |
| 2 | Foreign, deleted, or invalid Plan cannot trigger model/MCP work | **VERIFIED** | `app.py:103-127` validates identity and calls token-authorized CRUD `GET /v1/plans/{id}` before graph invocation; CRUD `api.py:85-92` scopes get to `me.subject`. Focused invalid-token test passes. |
| 3 | All candidate actions are meaningful and do not mutate CRUD | **FAILED — BLOCKER** | `app.py:135-145` echoes three actions and trusts inspect selectors; `graph.py:54-57` only changes text for two others. No CRUD mutation occurs, but the action behaviors are missing. |
| 4 | Local request is stateless with bounded process receipt cache; checkpoint contract is tested, without reconnect claim | **VERIFIED** | `app.py:87-88,129-153` and `state.py:141-162` use a bounded local cache. The two-request duplicate test passes. `state.py:73-139` is a test-only in-memory checkpoint adapter; the app never restores it. |
| 5 | Research produces at most five real destination candidates with cited claims and caveats | **FAILED — BLOCKER** | `research_server.py:61-86,133-146` caps output but turns a page title into a destination and treats a snippet as fit; test only covers a page titled “Kyoto.” |
| 6 | Selected source badge returns scoped normalized detail without arbitrary URL fetch | **VERIFIED** | `research_server.py:149-168` selects from a registry by actor, Plan, run, ID, and expiry and never fetches a caller URL. Focused source tests pass. Agent inspect still lacks a known-ID check, recorded in gap 3. |
| 7 | Map tools return temporary provider locations without a CRUD record | **VERIFIED** | `map_server.py:15-93` calls Geocoding and projects place ID, locality, coordinates, and attribution; there is no CRUD import/write. Focused map tests pass. |
| 8 | Gateway aggregates both secured FastMCP targets | **FAILED — BLOCKER** | `provision-agentcore-gateway.py:33-45` never creates targets; `research_server.py:171-172` and `map_server.py:96-97` start bare FastMCP apps; `dispatch_authenticated_tool` has no caller outside tests/helpers. |

**Score:** 4/8. The passing tests prove local units and fake-adapter API behavior, not the claimed complete AgentCore path.

## Required Artifacts and Links

| Artifact/link | Exists and substantive | Wired verdict |
|---|---|---|
| Agent API → CRUD ownership | Yes | **Wired** through forwarded verified token, with CRUD token-derived ownership. |
| Agent graph → Claude SDK → Gateway | Files exist | **Not wired**: `ClaudeGatewayAdapter.complete()` is unused; graph uses direct `GatewayToolClient`. |
| Gateway `tools/call` → interceptor | Helper exists | **Not wired**: `GatewayToolClient.call_tool()` sends `{name, arguments}`, while interceptor reads `params.plan_id`. Its unit test invents `{params: {plan_id}}`. |
| Interceptor → target authentication → FastMCP tool | Helpers exist | **Not wired**: no HTTP middleware or adapter establishes `authenticated_context`; direct FastMCP execution reaches `require_tool_context()` without one. |
| Provisioned Gateway → two targets | Dry-run contract exists | **Not wired**: live script creates only Gateway shell; target names in JSON are not resource creation. |
| Research → Tavily, map → Google | Yes | **Data flowing in isolated authenticated-context tests** through mocked HTTP responses. Live service path is blocked above. |
| Source badge → registry | Yes | **Data flowing** from saved metadata; local JSON registry is process-host specific and not a durable shared evidence service. |

## Behavioral Checks and Test Quality

`uv run pytest -q services/agent/tests services/mcps/tests` passed: **17 passed**. `uv run python scripts/provision-agentcore-gateway.py --dry-run` emitted a two-target redacted contract. Neither check provisions or calls a real Gateway. No live AWS, Claude, Tavily, or Google service was exercised.

The API tests use `FakeAdapter` and a fake Plan reader (`test_agent_api.py:12-39`). Transport tests call `authenticate_tool_call` directly and pass a nonstandard `tools/call` params shape (`test_transport.py:16-49`). MCP tool tests set `authenticated_context` manually (`test_mcp_tools.py:69-70,102-103`). These are active, noncircular tests, but their assertions do not establish the cross-boundary requirement. No focused test exercises concurrent duplicate events, cancellation, refresh preservation, obsolete generations, the real FastMCP HTTP route, or Claude invocation. The process receipt cache only records after graph completion, so concurrent same-event requests can both perform research.

No unreferenced `TBD`, `FIXME`, or `XXX` debt marker was found in the changed implementation files. The live provisioning TODO is represented as executable stub behavior in `provision-agentcore-gateway.py:45`, regardless of its comment wording.

## Requirements and Deferred Boundaries

| Requirements claimed in 03B plans | Verdict |
|---|---|
| DISC-01/02 | Partial backend question path; no traveler Conversation UI or interrupt/redirect behavior. |
| DISC-06/07/08/09 | Partial tool contracts; entity normalization, complete action semantics, cancellation, and browser shortlist are absent. |
| DISC-10, TRUST-04 | Partial provider isolation; live Gateway security and external-content interpretation remain unproven. |
| TRUST-03 | Checkpoint interface only. Production durable recovery/reconciliation is not implemented. |

The plans explicitly defer the Phase 3/4 frontend and durable checkpoint. That deferral is honest: there is no browser shortlist, in-app source panel, production checkpointer, or CRUD/checkpoint atomic reconciliation here. `memory.py` keeps application memory reads and writes disabled as planned. These deferred product capabilities must not be counted as achieved roadmap success criteria. The 03B blockers above are **within** the narrower backend slice and cannot be deferred by that language.

### Decision Coverage

The GSD decision-coverage query returned `skipped: true` because the CONTEXT file has no machine-trackable `<decisions>` block; its locked decisions were reviewed manually against the code.

## Human Verification

No human-only test can resolve the deterministic blockers. After wiring is repaired, exercise a real authenticated Gateway and both private targets in a configured AWS environment. The project’s Travella browser evidence gate applies when the deferred frontend is implemented; no frontend change was made in this phase.

## Gaps Summary

The phase has useful local primitives, but the executable Agent → Claude → AgentCore Gateway → secured FastMCP path does not exist. The Gateway resource script is a dry-run shell, the interceptor and target auth are disconnected from protocol requests, and the agent’s action/research semantics fall short of the Plan 03B contract. Close these blockers before treating Phase 03B as complete or using it to satisfy Phase 3/4 product criteria.

_Verified: 2026-09-28T21:34:33Z_
_Verifier: gsd-verifier_
