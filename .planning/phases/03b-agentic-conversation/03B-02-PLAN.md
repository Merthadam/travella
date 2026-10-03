---
phase: 03b-agentic-conversation
plan: '02'
type: execute
wave: 1
depends_on: []
files_modified: [services/mcps/research_server.py, services/mcps/map_server.py, services/mcps/config.py, services/mcps/transport.py, services/mcps/gateway_interceptor.py, services/mcps/tests/test_mcp_tools.py, services/mcps/tests/test_research_security.py, services/mcps/tests/test_map_security.py, services/mcps/tests/test_transport.py, services/mcps/README.md, scripts/provision-agentcore-gateway.py]
autonomous: true
requirements: [DISC-06, DISC-09, DISC-10, TRUST-04]
estimate: {tokens: 37000, raw_tokens: 37000, tasks: 3, confidence: low}
must_haves:
  truths:
    - An authorized research call returns no more than five destination-level candidates with compact cited claims and caveats.
    - A selected source badge retrieves normalized source details on demand without arbitrary URL fetches.
    - Map tools return temporary pins with place identity, coordinates, locality, and attribution while creating no CRUD record.
    - The Gateway aggregates both MCP-server target catalogs; direct target calls without service credential and a signed traveler/Plan assertion are rejected before provider work.
  artifacts:
    - {path: services/mcps/research_server.py, provides: bounded Tavily Search/Extract normalization and source lookup}
    - {path: services/mcps/tests/test_research_security.py, provides: scope and payload-security tests}
    - {path: services/mcps/map_server.py, provides: private Google map projection tools}
    - {path: services/mcps/transport.py, provides: target authentication and scope dependency}
    - {path: services/mcps/gateway_interceptor.py, provides: verified actor/Plan assertion injection}
    - {path: scripts/provision-agentcore-gateway.py, provides: idempotent Gateway and two MCP-server target configuration}
  key_links:
    - {from: services/agent/claude.py, to: services/mcps/research_server.py, via: Gateway MCP research target after Plan 02 completes}
---

<objective>
Turn the existing private research FastMCP tool into a bounded, authenticated, source-backed destination capability.
Purpose: Candidate evidence must be traceable and safe to show without raw Tavily responses or provider secrets.
Output: Completed research, source, and map tools, authenticated target transport, executable Gateway resource configuration, and tests. This is Wave 1; the Agent graph in 03B-01 is Wave 2.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@services/mcps/research_server.py
@services/mcps/config.py
@services/mcps/tests/test_mcp_tools.py
@docs/user-stories/agentic-plan-research/README.md
Official Gateway contracts: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html and https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-inbound-auth.html
</context>
<tasks>
<task type="auto" tdd="true">
  <name>Return normalized destination evidence from bounded Tavily research</name>
  <files>services/mcps/research_server.py, services/mcps/transport.py, services/mcps/gateway_interceptor.py, services/mcps/tests/test_mcp_tools.py, services/mcps/tests/test_transport.py</files>
  <behavior>Absent or invalid TAVILY_API_KEY fails safely; at most five distinct city/destination candidates carry stable IDs, fit/confidence, caveats and evidence IDs; raw provider fields are absent.</behavior>
  <action>Implement an AgentCore Gateway REQUEST interceptor that receives the inbound Authorization header only through explicit passRequestHeaders, independently validates the Cognito JWT issuer/signature/client/token use/expiry/scope, checks active Plan ownership via CRUD, then replaces caller-supplied traveler_scope with the verified subject and injects a short-lived signed actor/Plan assertion into tools/call arguments. It must allow tools/list for Gateway catalog synchronization without a traveler assertion, while denying unauthorized tools/call. The FastMCP transport validates the outbound OAuth client-credentials service token and signed assertion audience/expiry/Plan/subject before dispatch; it rejects direct requests lacking either, and ignores any unsigned traveler_scope. Never log the token or assertion. Replace title-as-candidate transformation with bounded Tavily Search/Extract destination normalization: max five, stable Plan/run IDs, material claims/caveats with evidence references, limits, and safe errors. Test spoofed args, expired assertions, invalid service credential, direct calls, and source injection.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_mcp_tools.py services/mcps/tests/test_transport.py</automated></verify>
  <done>Research accepts one scoped intent and returns a complete compact shortlist with attribution; invalid credential and unsafe input tests pass.</done>
</task>
<task type="auto" tdd="true">
  <name>Resolve only cited sources for the current research run</name>
  <files>services/mcps/research_server.py, services/mcps/tests/test_research_security.py, services/mcps/README.md, scripts/provision-agentcore-gateway.py</files>
  <behavior>An evidence ID from the current authorized Plan/run returns a sanitized source detail; unknown, foreign, expired, or arbitrary URL input reveals nothing and performs no fetch.</behavior>
  <action>Implement get_candidate_sources against a bounded expiring evidence registry keyed by verified traveler, Plan, and research run. Return compact title, canonical HTTPS URL, retrieved time, sanitized excerpt, and attribution for requested IDs; use Tavily Extract only against registry-held source URLs if extra detail is needed. Persist only evidence IDs plus canonical source metadata for rehydration after process restart within retention; expired evidence returns an honest unavailable result. Never place full source bundles in graph checkpoints or CRUD records. Test tenant isolation, restart/reconnect rehydration, source expiry, redirects, oversized payloads, Tavily failure, prompt-injection text, and redaction. Add an idempotent boto3 command that creates/reconciles one MCP-protocol AgentCore Gateway with two MCP-server target types pointed at the FastMCP Streamable HTTP endpoints, not HTTP Runtime target types. Configure Cognito JWT inbound authorization, OAuth client-credentials outbound authorization for target service identity, and the REQUEST interceptor from Task 01 for traveler/Plan binding. Use DEFAULT listing and synchronize targets after tool changes. Dry-run must emit a redacted resource contract for offline verification. Document endpoint hosting, credentials, resource IDs, and a real MCP tools/list plus tools/call smoke command in README. Provisioning AWS resources remains contingent on configured account credentials; offline dry-run and local Gateway-protocol simulator are executable now.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_research_security.py services/mcps/tests/test_mcp_tools.py</automated></verify>
  <done>A cited badge can retrieve safe detail on demand, while unrelated or expired IDs cannot disclose a source.</done>
</task>
<task type="auto" tdd="true">
  <name>Return temporary Google locations behind authenticated Gateway targets</name>
  <files>services/mcps/map_server.py, services/mcps/config.py, services/mcps/tests/test_map_security.py, services/mcps/tests/test_mcp_tools.py</files>
  <behavior>At most five candidate names resolve to bounded temporary pins with provider place ID, label, country/city, latitude/longitude, and attribution; a foreign Plan or invalid Gateway principal cannot call tools; no Plan record is created.</behavior>
  <action>Complete resolve_candidate_locations and get_candidate_map_projection using the separate GOOGLE_MAPS_SERVER_API_KEY, with typed input, name deduplication, Geocoding, bounded timeout/retry/response size, status and coordinate validation, country/city extraction, and Google attribution. Allow only stable place identity and Travella metadata to survive beyond response; never persist display snapshots. Route both tools through authenticated transport from Task 01 and check the signed actor/Plan assertion before provider access. Keep VITE_GOOGLE_MAPS_API_KEY in frontend only. In a local MCP-protocol simulator, assert aggregated tools/list exposes both research and map tools and authenticated tools/call reaches both targets; direct calls, wrong subject/Plan, and stale assertions fail. Test provider failure without invented pins.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_map_security.py services/mcps/tests/test_transport.py services/mcps/tests/test_mcp_tools.py</automated></verify>
  <done>Both map tools provide safe transient locations through the private target and cannot write durable Plan state or accept spoofed scope.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Gateway → FastMCP | OAuth service token authenticates the Gateway; signed short-lived actor/Plan assertion binds the traveler. Tool arguments remain untrusted. |
| Tavily → FastMCP | Web content and provider JSON are untrusted evidence. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-04 | Spoofing | scope arguments | high | mitigate | Bind tool scope to verified Gateway principal and authorized active Plan. |
| T-03B-05 | Tampering | source content | high | mitigate | Parse bounded typed facts and neutralize instructions in external text. |
| T-03B-06 | Information disclosure | source lookup | high | mitigate | Registry-only evidence IDs, Plan isolation, expiry, and sanitized details. |
| T-03B-07 | Elevation of privilege | MCP target | high | mitigate | Cognito JWT inbound, independently validated interceptor assertion, OAuth client-credentials outbound, and target-side signature/Plan check; direct calls denied. |
| T-03B-08 | Information disclosure | map provider | medium | mitigate | Server-restricted key, bounded allow-listed projection, attribution, and no display-snapshot persistence. |
</threat_model>
<verification>Run all focused MCP suites and inspect their assertions for bounded output, security failures, source lookup, and temporary map results.</verification>
<success_criteria>Research, source, and map MCP tools satisfy the Phase 03B context contract without provider payload leakage or CRUD mutation.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-02-SUMMARY.md when done.</output>
