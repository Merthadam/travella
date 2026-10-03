# Local agent and MCP verification

## Outcome

The local stack starts without AgentCore Gateway or AgentCore Memory. The agent
health endpoint reported `tool_transport=local`, `gateway_configured=false`,
`local_mcp_configured=true`, and the configured OpenAI model `gpt-6-luna`.
PostgreSQL, the combined app container, and both internal MCP containers were
running; the app container reached Docker's healthy state.

The local app, agent orchestration, PostgreSQL, and MCP servers run in Docker.
OpenAI, Tavily, Google Maps Geocoding, and the existing Cognito user pool remain
external server-side services. Long-term agent memory is currently disabled.

## Checks run

| Check | Result |
|---|---|
| `docker-compose -f compose.yaml config --quiet` | Passed |
| `docker-compose -f compose.local-single.yaml config --quiet` | Passed |
| `uv run --locked ruff check services/agent/local_mcp.py services/agent/claude/adapter.py services/agent/claude/__init__.py services/agent/app.py services/agent/tests/test_local_mcp.py services/mcps/transport.py services/mcps/research_server.py services/mcps/map_server.py scripts/ensure-local-mcp-auth.py` | Passed |
| `uv run --locked ruff format --check` on the changed Python files | Passed |
| `uv run --locked pytest -q services/agent/tests services/mcps/tests` | Passed: 56 tests |
| `bash scripts/start-local.sh -d` | Started local stack; app reported healthy |
| `curl -fsS http://localhost:8103/health` | Passed; local transport, OpenAI `gpt-6-luna`, no Gateway configured |
| `curl -fsS http://localhost:8003/health` | Passed; `{"status":"ok","auth_configured":true}` |
| `curl -fsS http://localhost:5174/` | Passed |

The MCP integration test uses the official Streamable HTTP client against a real
FastMCP ASGI target wrapped by the authentication middleware. It verifies the
service JWT, Plan assertion, traveler scope, and a tool result. Existing transport
tests cover denial paths. No live Tavily or Google provider call was made.

The generated `services/mcps/.env.local-auth` file is Git-ignored and mode `0600`;
its values were not printed or included in this record. The provider `.env` file
was not opened.

## Broader check limitation

`bash scripts/check.sh` stopped at the repository-wide Ruff stage before running
its later checks. It reports existing style errors in the unrelated,
already-modified `services/crud/repository.py` (import order, semicolon-separated
statements, and one-line conditionals). That file was not changed for this task.

An initial extra in-container MCP catalog probe caused Docker to mark the combined
app container OOM-killed while Colima had 2 GiB and several other project stacks
were active. Runtime commands were changed to `uv run --no-sync` so containers do
not install development dependencies on startup. The stack was then restarted and
the app remained healthy; the memory-heavy extra probe was not repeated. Full
live-provider research and a Cognito-authenticated agent turn remain unverified.
