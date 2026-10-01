---
phase: 03b-agentic-conversation
plan: '10'
type: execute
wave: 3
depends_on: ['03B-07', '03B-08', '03B-09']
files_modified: [services/mcps/gateway_interceptor.py, services/mcps/tests/test_transport.py, services/agent/claude.py, services/agent/graph.py, services/agent/tests/test_agent_tools.py, services/mcps/README.md]
autonomous: true
gap_closure: true
requirements: [DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-04]
estimate: {tokens: 23000, raw_tokens: 23000, tasks: 2, confidence: low}
must_haves:
  truths:
    - The deployed Gateway interceptor checks Plan ownership through a real authenticated private CRUD call before any target tool runs.
    - One bounded Claude Messages MCP connector loop owns normalized research, map, and source calls; Claude interprets evidence into at most five cited assessments and assistant text.
    - A valid inspect action uses only current-run evidence IDs and invokes get_candidate_sources via the authenticated connector; invalid IDs never reach the target.
  artifacts:
    - {path: services/mcps/gateway_interceptor.py, provides: deployed ownership callback using private CRUD}
    - {path: services/agent/claude.py, provides: one bounded Anthropic MCP connector loop and SDK block validation}
    - {path: services/agent/tests/test_agent_tools.py, provides: actual SDK/MCP/Gateway/target protocol path tests}
  key_links:
    - {from: services/mcps/gateway_interceptor.py, to: services/crud/api.py, via: authenticated private Plan ownership read}
    - {from: services/agent/claude.py, to: services/mcps/research_server.py, via: AgentCore Gateway tools/call and OAuth-authenticated FastMCP}
---

<objective>
Complete the private ownership boundary and let Claude interpret normalized research through one tool loop.
Purpose: Resolve D-06/08 and the live ownership blocker without direct-provider fallback.
Output: Deployable interceptor callback, bounded SDK connector orchestration, and protocol tests. Backend only.</objective>
<execution_context>@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md</execution_context>
<context>@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-RESEARCH.md
@.planning/phases/03b-agentic-conversation/03B-09-SUMMARY.md
@services/mcps/gateway_interceptor.py
@services/agent/claude.py
@services/mcps/README.md</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Authorize one real Gateway tools/call against CRUD Plan ownership</name>
  <files>services/mcps/gateway_interceptor.py, services/mcps/tests/test_transport.py, services/mcps/README.md</files>
  <behavior>With a valid Cognito bearer token and owned active Plan, the Lambda REQUEST event checks CRUD and injects signed scope into params.arguments; foreign/deleted Plan, invalid token, private CRUD failure or mismatched Plan blocks before FastMCP provider work.</behavior>
  <action>Per D-08, replace the fail-closed placeholder ownership callback with a deployable private CRUD HTTP reader that validates Gateway/service identity, forwards or binds the verified traveler subject, checks active Plan ownership, and times out safely. Use the AgentCore versioned MCP envelope and passRequestHeaders setting already established in 03B-03/04. Reject malformed or nested-plan mismatch, never trust caller-supplied traveler_scope, and avoid logging bearer/assertion values. Test Lambda entry event through a real FastAPI CRUD handler and mounted FastMCP JSON-RPC route with valid and invalid Plan cases. Update README deployment requirements and live smoke to require successful tools/call, not merely tools/list.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_transport.py services/agent/tests/test_agent_tools.py</automated><fails_when>Ownership remains a stub, foreign/deleted Plan reaches Tavily/Google, or tests bypass the Lambda and mounted MCP protocol path.</fails_when></verify>
  <done>An owned Plan reaches an authenticated target through the deployed interceptor contract; all unauthorized calls stop before provider work.</done>
</task>
<task type="auto" tdd="true">
  <name>Unify Claude research and source inspection in one bounded MCP connector loop</name>
  <files>services/agent/claude.py, services/agent/graph.py, services/agent/tests/test_agent_tools.py</files>
  <behavior>Claude receives system prompt and current bounded context, calls allowlisted normalized research/map tools, then produces a cited assessment and assistant reply; inspect calls get_candidate_sources only for current-run known IDs; malformed, over-budget or instruction-bearing tool output fails safely.</behavior>
  <action>Per D-02/03/06, make Anthropic Python Messages SDK MCP connector the single owner of tool execution. Configure only the private AgentCore Gateway and allowlisted research/map/source tools with the verified token; remove competing direct GatewayToolClient execution from the production graph. Bound model turns, tool calls, token/time budget, result size, and one active Plan generation. Parse actual SDK mcp_tool_use/mcp_tool_result/text/stop blocks, validate tool identity and Plan/run metadata, treat normalized external evidence as data, and ask Claude to synthesize candidate fit/confidence/caveats with per-claim evidence IDs. Require a complete shortlist of at most five before publication; preserve latest complete result on failure. For inspect, validate candidate and evidence membership from 03B-09 state, use stored run ID, invoke get_candidate_sources through this same authenticated connector, and return compact detail only. Test valid inspect, unknown/foreign/expired IDs, spoofed run, source injection, missing tool result, map mismatch, and no direct unauthenticated helper path. AgentCore long-term-memory adapter remains disabled.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_tools.py services/agent/tests/test_agent_api.py</automated><fails_when>Production graph calls GatewayToolClient directly, Claude merely forwards fixed preselected calls, inspect bypasses authenticated MCP, or uncited material claims are published.</fails_when></verify>
  <done>One bounded SDK tool loop produces cited destination assessments and safe source inspection through the authenticated Gateway.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Gateway → CRUD | Ownership reader must authenticate service and traveler Plan scope. |
| MCP evidence → Claude → response | External content is untrusted and cannot direct tool or Plan mutations. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-10-01 | Elevation of privilege | Gateway interceptor | high | mitigate | Active Plan ownership read via authenticated CRUD before signed target assertion. |
| T-03B-10-02 | Tampering | source content | high | mitigate | Typed normalized evidence and cited-claim validation with one allowlisted tool loop. |
| T-03B-10-03 | Information disclosure | source inspection | high | mitigate | Known current-run IDs only; no arbitrary URL or raw provider response. |
</threat_model>
<verification>Run the SDK-to-Gateway-to-FastMCP protocol tests and document any live AWS/model/provider prerequisite separately.</verification>
<success_criteria>D-06/08 tool boundary is executable locally through actual adapters, with no production ownership callback stub and no competing tool loops.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-10-SUMMARY.md when done.</output>
