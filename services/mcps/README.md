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
work. Set `MCP_ASSERTION_SIGNING_SECRET` and `MCP_GATEWAY_SERVICE_TOKEN` in the
private runtime environment. The interceptor expects Cognito access tokens and
checks issuer, client, expiry, token use, scope, and CRUD Plan ownership.

The evidence registry is metadata-only and can be persisted across process
restarts with `MCP_EVIDENCE_REGISTRY_PATH`; it contains only expiring evidence
IDs, canonical HTTPS URLs, excerpts, and attribution. Raw Tavily responses,
provider keys, and source bundles are never returned or stored.

Create the redacted AgentCore Gateway contract without contacting AWS:

```bash
uv run python scripts/provision-agentcore-gateway.py --dry-run
```

Live provisioning requires configured AWS credentials and deployment-specific
Cognito authorizer values. The command reconciles a named MCP Gateway and its
two `MCP_SERVER` targets; it does not use HTTP Runtime target types. After
deployment, verify catalog and calls with your MCP client:

```text
tools/list  # returns both research and map tools
tools/call research_destination_candidates
tools/call resolve_candidate_locations
```

Use a real Cognito access token and Gateway-issued scoped assertion for the
smoke call. Never place provider keys or tokens in these commands, logs, or
browser configuration.
