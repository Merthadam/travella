# Phase 3B Context — Agentic research MCP boundary

Date: 2026-09-28

## Goal

Create the first executable agent boundary for a Plan: a LangGraph flow can ask one focused question, run bounded destination research, and return a complete candidate shortlist that the map can render. The browser and CRUD service remain the only authorities for durable Plan mutations.

## Locked decisions

- Tavily is the initial web-research provider.
- `TAVILY_API_KEY` is server-only. It must live in the private agent/MCP service environment and must never be sent to the browser, stored in Plan data, or written to logs.
- Use a local Travella-owned research MCP adapter rather than exposing Tavily directly to the browser or allowing unrestricted model calls. The adapter enforces request limits, source normalization, attribution, and safe error mapping.
- The first research MCP capability is a high-level destination-candidate tool that accepts a Plan-scoped theme/intent and returns normalized candidate evidence. It may internally call Tavily Search and Extract; raw Tavily payloads do not cross the browser boundary.
- A separate private map MCP capability resolves candidate locations for rendering and returns only an allow-listed map projection: stable provider place identifier when available, display label, country/city, latitude, longitude, and attribution metadata. It does not mutate CRUD state.
- The existing `VITE_GOOGLE_MAPS_API_KEY` remains browser-only for the interactive Google map. Server-side map calls require a separate restricted `GOOGLE_MAPS_SERVER_API_KEY`; do not reuse a browser key for private service calls.
- The map MCP returns temporary candidate pins. Saving a destination or Map Pin remains an explicit browser action through the CRUD API.
- Candidate results are complete shortlist projections, capped at five for the first pass. Partial candidate cards are not streamed as current results.
- Each material candidate claim or caveat carries compact source references. Source details are fetched on demand through the research capability.
- AgentCore Memory is now provisioned as infrastructure, but application reads/writes remain disabled until the LangGraph runtime is wired and traveler authorization is enforced. The first graph slice still treats memory as an interface boundary.

## Initial MCP server set

### `travella-research-mcp`

Private, authenticated service-owned MCP server.

Initial tools:

- `research_destination_candidates` — bounded Tavily-backed search and normalization for one Plan-scoped theme or intent.
- `get_candidate_sources` — on-demand source detail lookup for selected evidence references.

The tool response contains status, candidate identity, confidence, fit summary, caveats, evidence references, and a research run identifier. It excludes raw HTML, unrestricted URLs, provider credentials, internal prompts, and chain-of-thought.

### `travella-map-mcp`

Private map projection capability used by the graph/service boundary.

Initial tools:

- `resolve_candidate_locations` — resolve normalized candidate names into map-ready locations using a server-restricted Maps/Places integration.
- `get_candidate_map_projection` — return the allow-listed projection needed for temporary pins and map focus.

This server never creates or updates Plan records. It must preserve Google attribution requirements and avoid durable storage of provider display snapshots beyond the approved identity and Travella-owned metadata.

### `agent-memory` provider

Define an interface with no active provider in the first slice:

- `retrieve_relevant_memory(traveler_scope, topic)`
- `record_memory_candidate(traveler_scope, observation)`

The AgentCore implementation is traveler-scoped, advisory, bounded, and lower priority than current Plan brief values and current traveler instructions. The provisioned resource uses the `traveler/{actorId}` semantic namespace and a 30-day event expiry.

## Environment contract

```text
TAVILY_API_KEY=server-only
GOOGLE_MAPS_SERVER_API_KEY=server-only, optional until map MCP is enabled
AGENT_MEMORY_PROVIDER=agentcore
AGENTCORE_MEMORY_ID=<provisioned-memory-id>
AGENTCORE_MEMORY_ARN=<provisioned-memory-arn>
AGENTCORE_MEMORY_NAMESPACE_TEMPLATE=traveler/{actorId}
```

`VITE_GOOGLE_MAPS_API_KEY` remains in the frontend environment only. Secrets are supplied through deployment/runtime configuration and excluded from planning artifacts, browser projections, screenshots, and logs.

## First verification targets

- Tavily credentials are rejected when absent or invalid without exposing the key.
- Research requests are bounded, authenticated, Plan-scoped, and return at most five normalized candidates with evidence references.
- Raw Tavily responses never appear in MCP responses sent to the browser or in CRUD projections.
- Map resolution returns temporary map-ready locations and does not create a destination record.
- Repeated requests with the same event/request ID do not duplicate research work or candidate state.
- A browser can render a complete shortlist and explicit candidate actions without silently mutating the Plan.

## Open decisions for the executable plan

- Exact MCP transport and authentication between the agent service and the MCP servers.
- Whether map resolution uses Places Text Search, Geocoding, or both for candidate names.
- The Claude SDK adapter contract and LangGraph node/state boundaries.
- Checkpoint backing store and reconciliation details; AgentCore remains outside this first slice.
