---
phase: 03b-agentic-conversation
plan: '01'
type: execute
wave: 2
depends_on: ['03B-02']
files_modified: [services/agent/__init__.py, services/agent/app.py, services/agent/graph.py, services/agent/claude.py, services/agent/state.py, services/agent/memory.py, services/agent/tests/test_agent_api.py, services/agent/tests/test_agent_state.py]
autonomous: true
requirements: [DISC-01, DISC-02, DISC-06, DISC-07, DISC-08, DISC-09, TRUST-03]
estimate: {tokens: 39000, raw_tokens: 39000, tasks: 3, confidence: low}
must_haves:
  truths:
    - A verified traveler can submit one intent for an owned active Plan and receive one focused question or a complete shortlist of at most five candidates with temporary map locations.
    - A foreign, deleted, or invalid Plan cannot trigger model or MCP work.
    - The backend candidate-action contract covers explore, reject, extend, refresh, inspect source, and name destination without mutating CRUD Plan data.
    - The local/dev graph executes a stateless request path with a bounded process-local Plan/event receipt cache; versioned checkpoint reconciliation is tested through an in-memory contract adapter, with no restart/reconnect claim.
  artifacts:
    - {path: services/agent/app.py, provides: authenticated Plan-scoped entry point}
    - {path: services/agent/graph.py, provides: one inspectable LangGraph flow}
    - {path: services/agent/claude.py, provides: Claude SDK model and MCP Gateway adapter}
    - {path: services/agent/state.py, provides: versioned Plan-scoped checkpoint interface and in-memory test adapter}
    - {path: services/agent/memory.py, provides: disabled-by-default AgentCore Memory interface}
  key_links:
    - {from: services/agent/app.py, to: services/crud/api.py, via: token-derived Plan ownership read before graph invocation}
    - {from: services/agent/graph.py, to: services/agent/claude.py, via: research node invokes bounded Claude MCP toolset}
---

<objective>
An authenticated traveler can begin an intent-led or named-city Conversation and receive a complete first research response through the single Plan-scoped graph.
Purpose: Prove the Agent → Claude SDK → one MCP-protocol AgentCore Gateway with aggregated research and map MCP-server targets → normalized response path after Wave 1 target transport exists.
Output: Agent API, graph, Claude adapter, checkpoint and memory interfaces, and cross-boundary handler tests. This is a backend contract slice. The in-app source panel and browser shortlist are Phase 3/4 frontend work and require the Travella testing skill's prototype/evidence gates before implementation; this plan does not claim their completion.
</objective>

<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@services/crud/auth.py
@services/crud/api.py
@services/auth/jwt_verifier.py
@services/mcps/research_server.py
@services/mcps/map_server.py
@services/mcps/transport.py
@services/mcps/README.md
@docs/user-stories/agentic-plan-research/README.md
Official API contracts: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector and https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-using.html
</context>

<tasks>
<task type="tracer" tdd="true">
  <name>Run one authorized Plan intent through LangGraph and Claude MCP Gateway</name>
  <files>services/agent/__init__.py, services/agent/app.py, services/agent/graph.py, services/agent/claude.py, services/agent/tests/test_agent_api.py</files>
  <behavior>A valid Cognito access token and owned active Plan with a fresh event ID reaches the Gateway research and map targets and produces exactly one complete result; invalid token or foreign/deleted Plan returns a safe 401/404 before any Claude or MCP call.</behavior>
  <action>Build a separate FastAPI agent service using the existing Cognito verifier and required scope, then read Plan ownership through the CRUD service with the same verified Cognito access token before graph invocation. Define typed input for plan_id, event_id, and one traveler message; derive traveler identity from that token, never request JSON. Create one LangGraph StateGraph with named entry, focused-question, research, map-resolution, and projection nodes; keep Claude behind a replaceable adapter. The initial local/dev executable uses a stateless per-request graph invocation with no checkpoint restore or saved-progress claim; repeated event IDs are deduplicated in the request lifecycle test adapter. In the research node use the installed anthropic Python SDK Messages API MCP connector against the single HTTPS MCP Gateway URL produced by 03B-02, passing the server-held Cognito access token as authorization_token and allowlisting research_destination_candidates. After research, call resolve_candidate_locations through that same Gateway toolset; join map pins by stable candidate ID and emit only a complete response of up to five candidates. The Gateway REQUEST interceptor independently verifies that token and binds actor/Plan in a signed short-lived assertion; the FastMCP target validates its OAuth service token plus assertion before provider work. Start red with a cross-boundary test exercising the real FastAPI handler, LangGraph nodes, Gateway protocol simulator, and mounted FastMCP targets, including tools/list aggregation and tools/call. Honor intent-led and named-city starts and one-question-at-a-time behavior (DISC-01/02/06). Fail closed on malformed model/tool output.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_api.py</automated></verify>
  <done>One authenticated owned-Plan request traverses API, graph, Claude adapter, and MCP tool call to return one validated projection; ownership failures trigger no external work.</done>
</task>
<task type="auto" tdd="true">
  <name>Constrain event and projection contracts</name>
  <files>services/agent/graph.py, services/agent/app.py, services/agent/tests/test_agent_api.py</files>
  <behavior>Duplicate event IDs return the recorded result; explore/reject/extend/refresh/inspect/name actions are accepted as typed Plan-scoped events; refresh keeps the prior complete shortlist until atomic replacement; obsolete output is withheld.</behavior>
  <action>Make event IDs Plan-scoped and idempotent, with bounded message/action payloads, graph-run generation, explicit research states, and output schema. Use a bounded process-local receipt cache in the runnable local/dev service: a duplicate Plan/event ID returns the recorded projection or a safe in-progress response and never repeats Claude/MCP work during that process lifetime. Support candidate_action values explore, reject with Plan-scoped suppression reason, extend without reordering existing candidates, refresh, inspect cited source, and name a new destination. The inspect path calls get_candidate_sources through the authenticated Gateway using only known evidence IDs and returns a compact detail projection for a later in-app panel; it never fetches a browser URL. Refresh retains the previous complete shortlist with an updating status until replacement is complete, and temporary failure retains it with a safe error. A new traveler message supersedes an unfinished generation, so no obsolete shortlist emits. Expose only status, one question, source detail, or atomic shortlist_ready. Add cross-boundary tests covering research, map, source lookup, all actions, cancellation, duplicate event across separate HTTP requests, empty result, invalid output, and redaction (DISC-07/08/09). Durable cross-process idempotency remains deferred with checkpoint persistence.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_api.py</automated></verify>
  <done>A stale or duplicate run cannot emit a new shortlist or repeat research; the API response is limited to the declared projection.</done>
</task>
<task type="auto" tdd="true">
  <name>Reconcile Plan checkpoints and define traveler-scoped memory</name>
  <files>services/agent/state.py, services/agent/memory.py, services/agent/graph.py, services/agent/tests/test_agent_state.py</files>
  <behavior>The checkpoint interface and in-memory test adapter reject another traveler, Plan, schema version, or older CRUD revision; source evidence IDs survive a test reconnect and rehydrate via the source target; memory read/write remains inactive.</behavior>
  <action>Define a versioned Plan-scoped checkpoint interface for load/save, event receipt, takeover, deletion/restore, and purge, and an in-memory adapter for deterministic contract tests. The local/dev service remains explicitly stateless across HTTP requests and returns no saved-progress or reconnect marker. Reconcile simulated test resumes with a fresh CRUD snapshot before projection; preserve only compact candidates and evidence references, never raw provider content. Test that a retained compact evidence ID invokes get_candidate_sources for on-demand detail, while expired source metadata returns unavailable. Mark unfinished simulated runs interrupted without auto-research. Keep production startup fail-closed for checkpoint restore/save when no durable adapter is configured. Production backing, atomic CRUD/checkpoint reconciliation, and seven-day purge integration require a subsequent plan before release. Define retrieve_relevant_memory(traveler_scope, topic) and record_memory_candidate(traveler_scope, observation) behind an AgentCore adapter using traveler/{actorId}, 30-day event expiry, bounded advisory results, and authorization from verified Cognito identity. Keep application reads/writes disabled even when AGENT_MEMORY_PROVIDER=agentcore and an ID exists.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_state.py</automated></verify>
  <done>The stateless local/dev graph runs outside tests; checkpoint contract tests prove scope and revision rules with an in-memory adapter; production checkpoint startup rejects unavailable durable wiring; AgentCore Memory has inactive application calls.</done>
</task>
</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| browser → Agent | Untrusted intent, event ID, and Plan ID require Cognito verification and CRUD ownership. |
| Agent → Claude/Gateway | Model prompts and MCP calls carry only bounded scoped data. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-01 | Spoofing | Agent API | high | mitigate | Verify Cognito access token, derive subject server-side, then authorize active Plan through CRUD before model call. |
| T-03B-02 | Tampering | graph output | high | mitigate | Validate output schema, generation, event ID, and complete shortlist before projection. |
| T-03B-03 | Information disclosure | Claude/tool payload | high | mitigate | Allowlist response fields and assert no credentials, raw payloads, or internal reasoning in API output. |
</threat_model>

<verification>Run focused cross-boundary API tests with mounted research, source, and map tools plus checkpoint-interface tests. Do not mark the Phase 3/4 frontend requirements or durable recovery complete from these backend results.</verification>
<success_criteria>The authenticated backend graph and all three Gateway tool paths are executable and safely denied when identity or Plan ownership fails. Durable production checkpointing and browser projection remain explicit follow-on work.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-01-SUMMARY.md when done.</output>
