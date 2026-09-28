# Travella MCP tools

These private FastMCP servers expose the first Phase 3B capability boundary:

- `research_server.py` calls Tavily and returns at most five compact destination candidates with source references.
- `map_server.py` resolves candidate names through Google Geocoding and returns temporary map projections.
- `memory.py` holds the AgentCore Memory namespace boundary until the authenticated LangGraph runtime owns reads and writes.

Copy `.env.example` to `.env` and fill in the provider keys. The keys are read only by these server processes and are never returned by a tool. Keep the Google server key separate from the browser key used by the frontend.

Run each server locally from the repository root:

```bash
uv run python -m services.mcps.research_server
uv run python -m services.mcps.map_server
```

The servers use Streamable HTTP. Every target call must arrive through the
Gateway with both an OAuth client-credentials service token and a short-lived
signed actor/Plan assertion. `tools/list` is allowed for catalog
synchronization; direct `tools/call` requests are rejected before provider
work. Set `MCP_ASSERTION_SIGNING_SECRET`, `MCP_GATEWAY_OAUTH_ISSUER`,
`MCP_GATEWAY_OAUTH_AUDIENCE`, `MCP_GATEWAY_OAUTH_CLIENT_ID`, and either the
private JWKS URL or signing key in the target runtime. The target validates the
Gateway OAuth client-credentials token by issuer, signature, audience, expiry,
client identity, and scope. The interceptor expects Cognito access tokens and
checks issuer, client, expiry, token use, scope, and CRUD Plan ownership.

The evidence registry is metadata-only and can be persisted across process
restarts with `MCP_EVIDENCE_REGISTRY_PATH`; it contains only expiring evidence
IDs, canonical HTTPS URLs, excerpts, and attribution. Raw Tavily responses,
provider keys, and source bundles are never returned or stored.

Create the redacted AgentCore Gateway contract without contacting AWS. Dry-run
still validates every nonsecret identifier and endpoint, but never imports the
AWS SDK or calls a control-plane API:

```bash
uv run python scripts/provision-agentcore-gateway.py --dry-run
```

Live provisioning requires AWS credentials plus these deployment values:

```text
AGENTCORE_GATEWAY_ROLE_ARN
AGENTCORE_INTERCEPTOR_LAMBDA_ARN
AGENTCORE_OAUTH_PROVIDER_ARN
COGNITO_ISSUER COGNITO_DISCOVERY_URL COGNITO_CLIENT_ID COGNITO_AUDIENCE
AGENTCORE_OAUTH_ISSUER AGENTCORE_OAUTH_AUDIENCE AGENTCORE_OAUTH_CLIENT_ID
MCP_GATEWAY_OAUTH_ISSUER MCP_GATEWAY_OAUTH_AUDIENCE MCP_GATEWAY_OAUTH_CLIENT_ID
MCP_GATEWAY_OAUTH_SCOPE
RESEARCH_MCP_ENDPOINT MAP_MCP_ENDPOINT
AGENTCORE_GATEWAY_URL AGENTCORE_GATEWAY_ACCESS_TOKEN
```

The four `MCP_GATEWAY_OAUTH_*` verifier values must match the corresponding
outbound OAuth values. The provider ARN references an already-created
AgentCore OAuth credential provider; the client secret is never passed as a
CLI argument or printed. The Lambda ARN must point at a deployed REQUEST
interceptor using `services.mcps.gateway_interceptor.lambda_handler`, with its
CRUD ownership reader configured in the deployment. Both target URLs must be
private HTTPS Streamable HTTP endpoints and must validate the service token
contract from Phase 3B-03.

Provisioning reconciles one named MCP Gateway and both `MCP_SERVER` targets. A
second run updates endpoint or OAuth reference drift and creates only missing
targets. It performs `synchronize_gateway_targets`, describes the Gateway and
each target again, then performs an authenticated `initialize` and `tools/list`
against the configured Gateway URL before reporting success. Missing AWS
prerequisites, unsupported control-plane responses, non-ready resources, or an
incomplete catalog return a nonzero exit without a success-looking result.

After deployment, the live smoke should verify catalog and calls with an MCP
client:

```text
tools/list  # returns both research and map tools
tools/call research_destination_candidates
tools/call resolve_candidate_locations
```

Use a real Cognito access token for the Gateway and a valid Plan-scoped request
for each `tools/call`; direct calls to either FastMCP target must return an
authentication error. Confirm both tool names in `tools/list`, call research,
then call map using only temporary candidate locations. Never place provider
keys or tokens in these commands, logs, or browser configuration.
