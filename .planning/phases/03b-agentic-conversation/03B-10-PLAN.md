---
phase: 03b-agentic-conversation
plan: '10'
type: execute
wave: 3
depends_on: ['03B-07', '03B-08', '03B-09']
files_modified: [services/mcps/gateway_interceptor.py, services/mcps/tests/test_transport.py, services/agent/claude/adapter.py, services/agent/claude/messages.py, services/agent/claude/gateway.py, services/agent/graph/nodes/research.py, services/agent/turn.py, services/agent/app.py, services/agent/tests/test_agent_turn.py, services/agent/tests/test_agent_api.py, services/mcps/README.md, compose.yaml]
autonomous: true
gap_closure: true
requirements: [DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-04]
estimate: {tokens: 23000, raw_tokens: 23000, tasks: 2, confidence: low}
must_haves:
  truths:
    - The deployed Gateway interceptor checks Plan ownership through a real authenticated private CRUD call before any target tool runs.
    - Claude model calls use the Anthropic Messages SDK through Bedrock Runtime with the verified cross-Region inference profile; no direct Anthropic API fallback is used.
    - LangGraph owns the bounded research/map/source sequence and calls AgentCore Gateway with the verified Cognito bearer token; Bedrock does not use Anthropic-hosted MCP connector fields.
    - A valid inspect action uses only current-run evidence IDs and invokes get_candidate_sources through the authenticated Gateway client; invalid IDs never reach the target.
  artifacts:
    - {path: services/mcps/gateway_interceptor.py, provides: deployed ownership callback using private CRUD}
    - {path: services/agent/claude/messages.py, provides: bounded Anthropic Messages SDK client configured for Bedrock}
    - {path: services/agent/tests/test_agent_turn.py, provides: actual SDK request construction and parsing tests}
    - {path: services/agent/tests/test_agent_api.py, provides: agent HTTP and authenticated Gateway adapter tests}
  key_links:
    - {from: services/mcps/gateway_interceptor.py, to: services/crud/api.py, via: authenticated private Plan ownership read}
    - {from: services/agent/claude/messages.py, to: bedrock-runtime, via: AsyncAnthropicBedrock with Bedrock API key or AWS credential chain}
    - {from: services/agent/claude/adapter.py, to: services/agent/claude/gateway.py, via: Cognito-authenticated AgentCore Gateway tools/call}
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
@services/agent/claude/adapter.py
@services/agent/claude/messages.py
@services/mcps/README.md</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Authorize one real Gateway tools/call against CRUD Plan ownership</name>
  <files>services/mcps/gateway_interceptor.py, services/mcps/tests/test_transport.py, services/mcps/README.md</files>
  <behavior>With a valid Cognito bearer token and owned active Plan, the Lambda REQUEST event checks CRUD and injects signed scope into params.arguments; foreign/deleted Plan, invalid token, private CRUD failure or mismatched Plan blocks before FastMCP provider work.</behavior>
  <action>Per D-08, replace the fail-closed placeholder ownership callback with a deployable private CRUD HTTP reader that validates Gateway/service identity, forwards or binds the verified traveler subject, checks active Plan ownership, and times out safely. Use the AgentCore versioned MCP envelope and passRequestHeaders setting already established in 03B-03/04. Reject malformed or nested-plan mismatch, never trust caller-supplied traveler_scope, and avoid logging bearer/assertion values. Test Lambda entry event through a real FastAPI CRUD handler and mounted FastMCP JSON-RPC route with valid and invalid Plan cases. Update README deployment requirements and live smoke to require successful tools/call, not merely tools/list.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_transport.py services/agent/tests/test_agent_api.py</automated><fails_when>Ownership remains a stub, foreign/deleted Plan reaches Tavily/Google, or tests bypass the Lambda and mounted MCP protocol path.</fails_when></verify>
  <done>An owned Plan reaches an authenticated target through the deployed interceptor contract; all unauthorized calls stop before provider work.</done>
</task>
<task type="auto" tdd="true">
  <name>Use Anthropic Messages over Bedrock and the LangGraph-owned MCP client path</name>
  <files>services/agent/claude/adapter.py, services/agent/claude/messages.py, services/agent/graph/nodes/research.py, services/agent/turn.py, services/agent/app.py, services/agent/tests/test_agent_turn.py, services/agent/tests/test_agent_api.py, compose.yaml</files>
  <behavior>Claude receives the versioned system prompt and bounded context through the Anthropic Messages SDK's Bedrock client; research/map/source calls go through the allowlisted Gateway client with the request's verified Cognito bearer token; inspect is limited to current-run known evidence IDs.</behavior>
  <action>Use `AsyncAnthropicBedrock` with the global inference profile observed in the initial successful call, explicit max_tokens, the configured Bedrock region, and `AWS_BEARER_TOKEN_BEDROCK` or the AWS credential chain. The same request later returned `Model use case details have not been submitted`, so record live model access as blocked until the one-time Anthropic form is completed and a repeat succeeds. Do not use `mcp_servers` or `mcp_toolset`: those remote connector fields are not available on the Bedrock Anthropic endpoint. Keep Gateway execution in the LangGraph adapter, forwarding only the verified Cognito bearer token and Plan-scoped arguments; no model-generated traveler or Plan identity is trusted. Bound graph calls and payload sizes, use the versioned prompt, parse the model's JSON conversation decision without keyword routing, and keep inspect restricted to known current-run evidence IDs. Bedrock's server-side Responses API connector is not selected because the current Gateway relies on OAuth traveler binding, while Bedrock's server-side connector requires IAM authentication. Add the agent service to local Compose with server-only Bedrock token/region/model variables and no frontend exposure. Add adapter tests for SDK request construction/response parsing and the MCP request's auth and scope arguments; run the existing agent/MCP protocol tests. Keep the live Gateway prerequisite explicit until a Gateway and target are provisioned. AgentCore long-term-memory adapter remains disabled.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py services/mcps/tests/test_transport.py</automated></verify>
  <fails_when>Agent model requests still use Anthropic API credentials, the graph bypasses the authenticated Gateway client, caller-supplied identity reaches a target unbound, or invalid evidence IDs reach get_candidate_sources.</fails_when>
  <done>The agent model path uses Bedrock through the selected Anthropic SDK and the local workflow routes MCP operations through the authenticated Gateway client with bounded, testable contracts.</done>
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
<verification>Run Bedrock adapter and authenticated MCP protocol tests, retry the live Bedrock invocation after the account form is submitted, and document that live tools remain blocked until the AWS Gateway and targets exist.</verification>
<success_criteria>D-06/08 uses the Bedrock provider and one LangGraph-owned OAuth MCP path; no Anthropic API fallback or competing tool loop exists. Live model access is not verified while AWS returns the account-use-case 404.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-10-SUMMARY.md when done.</output>
