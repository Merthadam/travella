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

The servers use Streamable HTTP. They are currently intended to stay on a private network boundary; authentication and production deployment wiring are part of the LangGraph integration work that follows.
