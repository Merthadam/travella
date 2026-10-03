---
phase: 03b-agentic-conversation
plan: '04'
type: execute
wave: 2
depends_on: ['03B-03']
files_modified: [scripts/provision-agentcore-gateway.py, services/mcps/gateway_interceptor.py, services/mcps/README.md, services/mcps/tests/test_gateway_provisioning.py]
autonomous: true
gap_closure: true
requirements: [DISC-06, DISC-10, TRUST-04]
estimate: {tokens: 21000, raw_tokens: 21000, tasks: 2, confidence: low}
must_haves:
  truths:
    - Provisioning creates or reconciles one MCP Gateway, its inbound Cognito authorizer and REQUEST interceptor, and both MCP_SERVER targets with valid outbound service authentication.
    - Repeated provisioning converges to the desired target endpoints and auth configuration; a missing AWS prerequisite or unsupported API shape exits unsuccessfully with a clear sanitized error.
    - A deployed Gateway catalog can be synchronized and checked for both target tools without claiming success from a textual resource contract.
  artifacts:
    - {path: scripts/provision-agentcore-gateway.py, provides: live idempotent Gateway and two-target reconciliation}
    - {path: services/mcps/tests/test_gateway_provisioning.py, provides: control-plane request and error tests}
    - {path: services/mcps/README.md, provides: deployment and live smoke instructions}
  key_links:
    - {from: scripts/provision-agentcore-gateway.py, to: services/mcps/gateway_interceptor.py, via: configured REQUEST Lambda resource and passRequestHeaders true}
---

<objective>
Provision an actual AgentCore MCP Gateway with two authenticated FastMCP targets.
Purpose: Close verification gap 4's deployment shell and make the live route testable.
Output: Idempotent boto3 provisioning, failure tests, and a live smoke procedure.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-VERIFICATION.md
@scripts/provision-agentcore-gateway.py
@services/mcps/README.md
Official target configuration: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-api-target-config.html
Official interceptor configuration: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors-configuration.html
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Create the Gateway and one research MCP_SERVER target with configured authorization</name>
  <files>scripts/provision-agentcore-gateway.py, services/mcps/gateway_interceptor.py, services/mcps/tests/test_gateway_provisioning.py</files>
  <behavior>With explicit nonsecret resource identifiers, boto3 creates a Gateway configured for Cognito inbound auth, a REQUEST interceptor with passRequestHeaders true, and one research MCP_SERVER target with OAuth client-credentials outbound auth; missing values fail before AWS mutation.</behavior>
  <action>Replace the existing success-looking textual instruction with real AgentCore control-plane calls using the installed boto3 operation models. Validate required Cognito issuer/client configuration, Gateway role, interceptor Lambda ARN, OAuth credential-provider reference, HTTPS research target endpoint, and the 03B-03 target verifier's OAuth issuer/JWKS, audience, allowed client_id, and required service scope before mutation; never invent resource IDs. Configure the Lambda entry point around the 03B-03 interceptor event contract and the documented MCP interceptor output. Reconcile existing Gateway authorizer/interceptor drift with update_gateway or fail clearly if the installed API cannot express the required security contract. Create a research target using targetConfiguration.mcp and credentialProviderConfigurations with OAuth client credentials matching the target verifier contract. Test the exact boto3 request shapes using botocore Stubber or an equivalent SDK model-validating client, including a mismatch between outbound credential configuration and target verifier expectations, missing config, partial AWS failure, and sanitized stderr. Do not emit a successful provision result until resource describe confirms settings.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_gateway_provisioning.py</automated></verify>
  <done>One actual research target is created or confirmed with required auth and interceptor; invalid or incomplete control-plane responses fail the command.</done>
</task>
<task type="auto" tdd="true">
  <name>Reconcile map target and verify both target catalogs</name>
  <files>scripts/provision-agentcore-gateway.py, services/mcps/README.md, services/mcps/tests/test_gateway_provisioning.py</files>
  <behavior>A second run updates changed research/map endpoints or auth references, creates only missing targets, synchronizes both catalogs, and returns their IDs/status; unsupported synchronization or unresolved catalog fails honestly.</behavior>
  <action>List and compare targets by stable names; create or update both research and map MCP_SERVER targets to the configured HTTPS Streamable HTTP endpoints and outbound OAuth credential provider. Trigger AgentCore target synchronization with the documented operation and verify target status plus expected tools in tools/list when a live Gateway URL/token is configured. Keep --dry-run redacted and side-effect free. Document exact required env vars/resource prerequisites, private target reachability, the real provision command, and a live authenticated initialize/tools/list/tools/call smoke that checks each target and rejects an unauthenticated direct call. AWS credentials, deployed target URLs, OAuth provider, and Lambda ARN are environment prerequisites for live execution; offline tests must still prove request construction and failures.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_gateway_provisioning.py</automated></verify>
  <done>Provisioning converges both target resources and either confirms usable catalog entries or exits nonzero with a clear reason.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Provisioner → AWS control plane | Configuration controls public Gateway authorization and private target credentials. |
| Gateway → target | Target endpoints must use service authentication and remain private. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-04-01 | Spoofing | Gateway authorization | high | mitigate | Verify configured Cognito authorizer and REQUEST interceptor in describe response. |
| T-03B-04-02 | Elevation of privilege | MCP_SERVER target | high | mitigate | Require OAuth credential provider on both targets; reject missing configuration. |
| T-03B-04-03 | Information disclosure | Provision output | medium | mitigate | Print identifiers/status only; redact secrets, tokens, and credential-provider contents. |
</threat_model>
<verification>Run provisioning contract tests and --dry-run. Run the documented live smoke only when the required AWS resources and credentials are configured; record an unmet prerequisite explicitly.</verification>
<success_criteria>The script performs real create/update/sync operations for both targets or reports a failing prerequisite/API error without claiming provisioning succeeded.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-04-SUMMARY.md when done.</output>
