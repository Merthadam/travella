# Travella MCP tools

These private FastMCP servers expose provider tools:

- `map_server.py` resolves candidate names, resolves destination bounds, searches Google Places inside a geographic rectangle, and retrieves compact place details. The canvas editor uses these tools through `services/agent/maps_client.py`.
- `research_server.py` is a retained legacy Tavily server. Current chat/research uses Claude Agent SDK native web tools and does not call it.
- Traveler memory is handled separately by `services/agent/memory.py`; see `docs/agent/llm-flow.md` for the current profile and memory behavior.

Copy `.env.example` to `.env` and fill in the provider keys. The keys are read only by these server processes and are never returned by a tool. Keep the Google server key separate from the browser key used by the frontend.

The default local stack runs the Agent and both MCP servers in Docker without
provisioning AgentCore. `bash scripts/start-local.sh` creates an ignored,
permission-restricted service-auth file, then starts the stack. The Agent uses the
official MCP client to call the local Streamable HTTP servers. Their service-token
and signed Plan-scope checks remain enabled. Provider keys are still needed for
Google Maps and are read only by the Maps MCP container. Tavily is not required by the current agent flow.

## Canvas editing Maps tools

- `resolve_destination_area(destination, plan_id)` returns a provider-supplied rectangle or an honest empty/ambiguous/unavailable status.
- `search_places(query, area, category, plan_id)` uses Places New `locationRestriction.rectangle`, checks coordinates again, and returns at most five suggestions.
- `get_place_details(place_id, plan_id)` returns a bounded place projection.

All require authenticated Plan scope. None writes a Plan. Results include only
name, address, coordinates, place identity, actual rating/count when available,
types and a Google Maps link. Place cards carry Google Maps attribution.
The editor forwards only observed IDs and reasons to the UI; temporary place
provenance uses the existing private `CANVAS_EVIDENCE_SIGNING_KEY` (at least 32
characters) and expires after an hour. Explicit Save plan persists selected pins
through CRUD. Enable Geocoding and Places API (New) for the server key.

For target development, run each server manually from the repository root:

```bash
uv run python -m services.mcps.research_server
uv run python -m services.mcps.map_server
```

The servers use Streamable HTTP. In a deployed AgentCore setup, every target call
must arrive through the Gateway with both an OAuth client-credentials service token and a short-lived
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
