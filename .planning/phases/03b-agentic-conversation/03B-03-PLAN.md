---
phase: 03b-agentic-conversation
plan: '03'
type: execute
wave: 1
depends_on: []
files_modified: [services/mcps/transport.py, services/mcps/gateway_interceptor.py, services/mcps/research_server.py, services/mcps/map_server.py, services/mcps/tests/test_transport.py, services/mcps/tests/test_mcp_tools.py]
autonomous: true
gap_closure: true
requirements: [DISC-06, DISC-09, DISC-10, TRUST-04]
estimate: {tokens: 22000, raw_tokens: 22000, tasks: 2, confidence: low}
must_haves:
  truths:
    - A real MCP tools/call envelope crosses the Gateway REQUEST interceptor with Plan identity read from params.arguments and an assertion inserted into those same arguments.
    - Mounted research and map FastMCP HTTP apps reject direct tools/call without both a verified Gateway service credential and a matching signed actor/Plan assertion before provider work.
    - Authorized tools/list remains available for Gateway catalog synchronization, while authenticated tool calls retain ordinary FastMCP JSON-RPC responses.
  artifacts:
    - {path: services/mcps/gateway_interceptor.py, provides: AgentCore REQUEST event adapter and correctly nested tools/call transformation}
    - {path: services/mcps/transport.py, provides: target HTTP authentication dispatch}
    - {path: services/mcps/tests/test_transport.py, provides: actual JSON-RPC route and interceptor contract tests}
  key_links:
    - {from: services/mcps/gateway_interceptor.py, to: services/mcps/transport.py, via: signed assertion in params.arguments and Gateway outbound credential}
    - {from: services/mcps/transport.py, to: services/mcps/research_server.py, via: mounted Streamable HTTP request middleware}
---

<objective>
Make the existing Gateway assertion and target authentication code execute on real MCP protocol requests.
Purpose: Close the disconnected interceptor and FastMCP target path in verification gaps 1 and 4.
Output: Interceptor event adapter, authenticated target ASGI mounting, and protocol-level tests.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-VERIFICATION.md
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@services/mcps/transport.py
@services/mcps/gateway_interceptor.py
@services/mcps/research_server.py
@services/mcps/map_server.py
Official AgentCore MCP interceptor payload: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors-types.html
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Authenticate one real research tools/call from interceptor to FastMCP HTTP</name>
  <files>services/mcps/transport.py, services/mcps/gateway_interceptor.py, services/mcps/research_server.py, services/mcps/tests/test_transport.py</files>
  <behavior>A JSON-RPC tools/call with params.name and params.arguments.plan_id is transformed by the AgentCore MCP REQUEST event adapter, then POSTed to mounted research FastMCP; a JWT issued for the exact 03B-04 OAuth provider/client and required service scope reaches the tool, while a token from another issuer/client/audience or with missing scope stops before Tavily.</behavior>
  <action>Use the documented AgentCore interceptorInputVersion 1.0 mcp.gatewayRequest body and interceptorOutputVersion 1.0 mcp.transformedGatewayRequest/body shape. Read plan_id strictly from tools/call params.arguments and preserve params.name, JSON-RPC id, and all ordinary tool arguments. Remove caller-supplied traveler_scope and assertion fields from arguments, check Cognito identity and CRUD Plan ownership, and insert verified traveler_scope plus a short-lived signed assertion into params.arguments. Mount target-side authentication in the actual FastMCP Streamable HTTP ASGI request path: validate the configured Gateway outbound OAuth client-credentials token by issuer, signature, audience, expiry, and service identity, as well as the signed actor/Plan assertion, before dispatch; replace the current static shared-token check. Set authenticated_context for the awaited FastMCP call, then reset it for all success/error/cancellation paths. Remove auth-only arguments before tool invocation and reject malformed JSON-RPC envelopes, mismatched Plan, missing credentials, and direct target calls with bounded JSON-RPC errors. Keep tools/list available for catalog sync without traveler assertion, per the locked private MCP boundary; do not fetch a provider for a denied request. Use the installed MCP/Starlette interfaces rather than dispatch_authenticated_tool as the only call path.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_transport.py</automated></verify>
  <done>An httpx ASGI request to the mounted research /mcp route executes a real FastMCP tools/call after interceptor transformation; denied protocol requests never enter the tool.</done>
</task>
<task type="auto" tdd="true">
  <name>Apply the same authenticated transport to both target catalogs</name>
  <files>services/mcps/transport.py, services/mcps/map_server.py, services/mcps/tests/test_mcp_tools.py</files>
  <behavior>Research and map target tools/list expose their expected catalog over mounted Streamable HTTP; every listed tool has verifiable plan_id in params.arguments and valid tools/call reaches the selected target with isolated context; invalid token, assertion, target, or tool never invokes Google/Tavily.</behavior>
  <action>Mount the map FastMCP app through the shared transport adapter and ensure target-specific assertion audience and Plan scope are checked on each call. Use one explicit service-token contract shared with 03B-04: configured OAuth issuer and JWKS, target audience, allowed client_id, and required service scope; fail startup if any expected value is absent. Add plan_id to get_candidate_map_projection's published input contract and verify it against the signed assertion, or remove this tool from the catalog if it has no Plan-scoped use. Exercise initialize, tools/list, and tools/call with the SDK's actual JSON-RPC request/response format against both ASGI apps, calling every published tool and proving that missing or spoofed plan_id is denied. Test a concurrent valid and invalid call to prove ContextVar isolation and cleanup. Keep map locations temporary and provider keys server-only per the locked CONTEXT decisions.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_transport.py services/mcps/tests/test_mcp_tools.py</automated></verify>
  <done>Both mounted FastMCP targets have working catalogs and authenticated tool dispatch, and direct unauthenticated calls are denied.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Cognito caller → Gateway interceptor | Browser/model arguments are untrusted; identity and Plan ownership must be independently checked. |
| Gateway → private FastMCP target | Every tools/call needs service identity and signed actor/Plan scope. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-03-01 | Spoofing | tools/call arguments | high | mitigate | Replace untrusted scope fields inside params.arguments after token and CRUD checks. |
| T-03B-03-02 | Elevation of privilege | FastMCP dispatch | high | mitigate | Enforce service credential and assertion at the mounted HTTP boundary before provider invocation. |
| T-03B-03-03 | Information disclosure | Auth errors | medium | mitigate | Return bounded protocol errors without tokens or assertion values. |
</threat_model>
<verification>Run the two named protocol test files and inspect that assertions target mounted HTTP apps, not decorated tool functions alone.</verification>
<success_criteria>The complete local interceptor → authenticated FastMCP tools/call path is executable for both targets; the real AgentCore resource is planned in 03B-04.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-03-SUMMARY.md when done.</output>
