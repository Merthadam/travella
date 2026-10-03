---
phase: 03b-agentic-conversation
plan: '06'
type: execute
wave: 3
depends_on: ['03B-03', '03B-04', '03B-05']
files_modified: [services/agent/claude.py, services/agent/graph.py, services/agent/app.py, services/agent/state.py, services/agent/tests/test_agent_api.py, services/agent/tests/test_agent_state.py]
autonomous: true
gap_closure: true
requirements: [DISC-01, DISC-02, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-03, TRUST-04]
estimate: {tokens: 32000, raw_tokens: 32000, tasks: 3, confidence: low}
must_haves:
  truths:
    - An owned Plan request actually invokes the Claude SDK MCP connector through the configured Gateway and yields one focused question or one complete map-ready shortlist.
    - Explore, reject, extend, refresh, inspect, and name actions operate on a validated Plan-scoped candidate set and never mutate durable CRUD Plan data.
    - Refresh keeps the previous complete shortlist visible until atomic replacement; a superseded generation cannot publish its result, and concurrent duplicate event IDs perform research once.
    - Source inspection uses only evidence IDs issued for the current candidate/run and obtains details through the authenticated research tool.
  artifacts:
    - {path: services/agent/claude.py, provides: used Claude SDK MCP connector and validated tool-result extraction}
    - {path: services/agent/state.py, provides: bounded in-process candidate/generation/receipt state}
    - {path: services/agent/tests/test_agent_api.py, provides: API through Claude and mounted MCP protocol coverage}
  key_links:
    - {from: services/agent/graph.py, to: services/agent/claude.py, via: used complete() SDK invocation rather than direct Gateway bypass}
    - {from: services/agent/app.py, to: services/agent/state.py, via: atomic Plan-scoped generation and receipt operations}
    - {from: services/agent/claude.py, to: services/mcps/research_server.py, via: AgentCore Gateway tools/call and mounted target from 03B-03/04}
---

<objective>
Complete the authenticated Plan agent path and candidate-action state machine.
Purpose: Close verification gaps 1 and 2 after the MCP protocol and evidence contracts work.
Output: Exercised Claude SDK connector, meaningful actions, generation-safe replacement, and cross-boundary tests.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-VERIFICATION.md
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-03-SUMMARY.md
@.planning/phases/03b-agentic-conversation/03B-05-SUMMARY.md
@services/agent/claude.py
@services/agent/graph.py
@services/agent/app.py
@services/agent/state.py
Official Claude MCP connector: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Run an owned Plan intent through Claude SDK and authenticated Gateway targets</name>
  <files>services/agent/claude.py, services/agent/graph.py, services/agent/tests/test_agent_api.py</files>
  <behavior>An authenticated /v1/agent/plans/{plan_id}/events request invokes AsyncAnthropic beta.messages.create with the configured MCP server and allowlisted tools, receives actual SDK MCP result blocks, validates research and map outputs, and emits exactly one question or complete shortlist; invalid Plan ownership triggers no model or target call.</behavior>
  <action>Make ClaudeGatewayAdapter.complete() part of the graph's active path for research, map resolution, and source inspection, using the SDK MCP connector with the one Gateway URL and server-held Cognito authorization token. Bound the prompt and allowed tool names, pass typed Plan-scoped intent, candidate names, and known evidence IDs, and parse actual Claude SDK MCP tool-use/result and terminal response blocks rather than assuming a dict from GatewayToolClient. A valid inspect action must call get_candidate_sources through this Claude MCP connector and authenticated Gateway path; invalid or foreign evidence IDs must be rejected before any call. Validate that research, map, and source outputs originated from allowlisted tools, match Plan/run scope, and satisfy compact schemas; fail closed on missing tool calls, malformed or partial output, tool errors, or token leakage. Keep one focused question for insufficient intent. Use an SDK transport stub that records the actual beta.messages.create call and forwards MCP JSON-RPC to the 03B-03 interceptor and mounted FastMCP targets; test the complete FastAPI handler path, including valid and invalid inspect. The direct GatewayToolClient may remain only for a local protocol smoke helper; production action paths must invoke Claude.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_api.py</automated></verify>
  <done>The tested API path demonstrably calls the Claude SDK and reaches both authenticated targets before emitting an allowlisted complete projection.</done>
</task>
<task type="auto" tdd="true">
  <name>Implement Plan-scoped candidate actions against the current shortlist</name>
  <files>services/agent/app.py, services/agent/state.py, services/agent/graph.py, services/agent/tests/test_agent_api.py</files>
  <behavior>Explore validates and focuses an existing candidate; reject suppresses its ID for this Plan; extend adds only distinct nonrejected candidates without reordering existing ones; refresh starts a replacement; inspect accepts only current-run known evidence IDs; name initiates research for the named place without saving destination.</behavior>
  <action>Replace action echoes with a bounded process-local Plan candidate state keyed by verified traveler and Plan, holding the latest complete shortlist, run ID, evidence-ID membership, rejection set/reasons, generation, and event receipts. Validate candidate_id against the current shortlist and evidence_ids against the candidate's issued references; never derive run_id from request.message. Reject stale, foreign, or unknown selectors with a safe 422/409 and no source fetch. Explore returns the selected candidate detail from known data; reject removes it from future Plan shortlists only; extend retains order and appends at most remaining slots; refresh uses the last query and keeps prior complete output visible; name researches the explicit destination as a temporary candidate, leaving CRUD destination unchanged. Preserve Plan-scoped idempotency and TTL/size bounds. These are local process semantics only; production durable checkpoint restoration and browser actions remain outside 03B per the verified deferral.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_api.py services/agent/tests/test_agent_state.py</automated></verify>
  <done>All six actions have observable validated behavior, current-run source inspection, and no CRUD mutation.</done>
</task>
<task type="auto" tdd="true">
  <name>Make refresh, interruption, and duplicate delivery generation-safe</name>
  <files>services/agent/app.py, services/agent/state.py, services/agent/graph.py, services/agent/tests/test_agent_api.py, services/agent/tests/test_agent_state.py</files>
  <behavior>A slow refresh leaves the prior complete shortlist available with updating status; a newer message increments generation and suppresses the old result; concurrent duplicate event IDs share one in-flight receipt and trigger one Claude/MCP run; failure retains prior result with a safe retry state.</behavior>
  <action>Use one atomic async critical section per traveler/Plan for generation increment and event receipt reservation, then release it during external work. Publish a result only when its generation remains current and the candidate/map output is complete; otherwise return interrupted without replacing the prior result. Represent pending, completed, and failed receipts so simultaneous duplicate HTTP requests return the same completed result or an explicit in_progress response without launching a second run. Test cancellation after research but before map completion, stale completion after a new message, refresh provider failure, empty new shortlist, concurrent duplicate events, and scoped state isolation. Do not claim cross-process resume: the current state contract remains local, while production checkpoint backing and CRUD revision reconciliation remain deferred.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_api.py services/agent/tests/test_agent_state.py</automated></verify>
  <done>No partial or obsolete shortlist becomes current, previous complete data survives failed refresh, and duplicate concurrent delivery performs external research once.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Agent request → Plan state | Caller action IDs and evidence selectors are untrusted. |
| Claude/tool output → traveler projection | Model and provider data require schema, run, and generation validation. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-06-01 | Tampering | candidate action | high | mitigate | Check candidate and evidence membership against current verified Plan state. |
| T-03B-06-02 | Information disclosure | source inspection | high | mitigate | Use stored run ID and allowlisted evidence IDs only, never caller URLs or message-derived run IDs. |
| T-03B-06-03 | Denial of service | duplicate event | medium | mitigate | Reserve in-flight receipt before model work and bound local state. |
| T-03B-06-04 | Tampering | obsolete generation | high | mitigate | Compare generation atomically before publishing complete shortlist. |
</threat_model>
<verification>Run focused agent API/state tests plus the existing MCP protocol tests. Confirm the tests assert Anthropic SDK invocation and mounted target requests, not only FakeAdapter outputs.</verification>
<success_criteria>The backend 03B path closes all four verified gaps. Browser UI and durable production checkpoints remain explicitly deferred and cannot be counted as completed Phase 3/4 product criteria.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-06-SUMMARY.md when done.</output>

## Source audit for this gap-closure set

| Source | Item | Plans | Status |
|---|---|---|---|
| GOAL | First executable backend agent boundary, focused question, complete map-ready shortlist | 03B-03, 03B-05, 03B-06 | Covered within 03B backend scope |
| REQ | DISC-01, DISC-02 focused intent/question backend path | 03B-06 | Covered within backend scope |
| REQ | DISC-06 bounded destination shortlist | 03B-05, 03B-06 | Covered within backend scope |
| REQ | DISC-07 candidate actions and Plan suppression | 03B-06 | Covered within backend scope |
| REQ | DISC-08 status, prior complete result, generation safety | 03B-06 | Covered within backend scope |
| REQ | DISC-09 cited claims/caveats and on-demand detail backend | 03B-05, 03B-06 | Covered within backend scope |
| REQ | DISC-10 compact projections without raw bundles | 03B-05, 03B-06 | Covered within backend scope |
| REQ | TRUST-03 checkpoint contract only | 03B-06 | Existing contract retained; durable production checkpoint explicitly deferred |
| REQ | TRUST-04 untrusted external evidence and private provider boundary | 03B-03, 03B-04, 03B-05, 03B-06 | Covered within backend scope |
| CONTEXT | Tavily-owned adapter, private map MCP, separate server key, temporary pins, source references, five-candidate cap, disabled memory reads/writes | 03B-03, 03B-05, 03B-06 | Covered |
| RESEARCH | No separate 03B RESEARCH.md exists | — | No item to audit |
| DEFERRED | Browser shortlist/source panel and durable production checkpoints | — | Explicitly outside these verified backend gaps |
