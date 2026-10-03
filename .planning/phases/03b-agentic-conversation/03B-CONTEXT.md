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

The agent runtime uses server-only `AWS_BEARER_TOKEN_BEDROCK` when configured, or the AWS credential chain, with `BEDROCK_REGION` and `BEDROCK_MODEL_ID` for the model endpoint/profile. Local Compose passes these only to the `agent` service. Never expose the Bedrock token through a `VITE_` variable.

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

## Conversational redesign — 2026-09-29

This amendment governs the next corrective plans (03B-07 onward). Plans 01–06 and their summaries remain historical records. The user asked to retain LangGraph, remove unnecessary workflow fragmentation, introduce real system prompts and conversational context, and plan this through GSD before implementation. The original stateless first-slice deferral is superseded for this corrective work. The phase remains unverified; the old verification report predates several implemented fixes and is evidence to re-check, not a current code inventory.

<decisions>
### Agreed direction

- **D-01:** Retain one LangGraph workflow per authenticated traveler/Plan. Use a small number of meaningful execution stages; status initialization, fixed questions, map lookup, and response formatting do not each require a graph node. Start from two stages, conversation and research, and justify any added node with a distinct branching/retry/resume need.
- **D-02:** Add discoverable, versioned system prompts under `services/agent/prompts/`, sent through the SDK's system field. Ground them in `docs/user-stories/agentic-plan-research/README.md` and `docs/planning/mvp-phase-1-service-contracts.md`. Preserve useful assistant replies; never treat an exact-tool-call user message as the conversational policy.
- **D-03:** Give Claude bounded conversation history, the latest CRUD planning context, and compact research state. Ask at most one useful question; accept early answers, skips and redirects; start low-risk research before all preferences are collected. Replace message-length routing.
- **D-04:** Add actual persistent LangGraph checkpoint integration and restore/reconciliation. CRUD owns conversation records and durable Plan/Brief data; agent checkpoint storage owns resumable working state. Scope every read/write by verified traveler and Plan. Keep credentials, raw MCP blocks and raw web payloads out of checkpoints and browser projections.
- **D-05:** Preserve current/manual traveler brief values over tentative inference. Deleted entries remain inactive and must not affect ranking. A checkpoint must not overwrite a newer CRUD revision. Separate conversational progress from confirmed requirements, destinations and saved pins.
- **D-06:** Use the existing private research/map FastMCP servers through AgentCore Gateway. Claude must interpret normalized evidence and produce cited candidate assessments, rather than merely forwarding pre-selected tool calls. One bounded layer owns tool execution; do not add competing SDK and graph tool loops. No silent direct-provider fallback.
- **D-07:** Persist complete shortlists, stable candidate identity, rejection reasons, event receipts and run ordering sufficiently to resume safely. New input supersedes obsolete work; failed refresh preserves the last complete shortlist; duplicate events must not duplicate publication or Plan changes. A restart must not silently restart unfinished provider research.
- **D-08:** Complete backend verification through real FastAPI handlers, an isolated migrated database, the real SDK request construction and authenticated MCP protocol path. Distinguish deterministic tests from live model/provider checks; skipped live checks are not completion. Fix the known Gateway ownership callback blocker before claiming the live path works.
- **D-09:** Keep the agent microservice organized by responsibility: FastAPI composition and HTTP contracts, application turn orchestration, LangGraph assembly, one file per meaningful graph node, isolated Claude SDK/MCP adapters, and separate state/persistence modules. Avoid growing root-level catch-all modules.

### Planning decisions locked — 2026-10-01

The user selected LangGraph to manage the workflow, PostgreSQL checkpoints, AgentCore for long-term traveler memory, and the Anthropic Python Messages SDK. A Bedrock Runtime Converse request for Claude Sonnet 4.5 through `global.anthropic.claude-sonnet-4-5-20250929-v1:0` returned once, but subsequent identical CLI and SDK calls returned AWS 404 `Model use case details have not been submitted`. Treat live model access as unresolved until that one-time form is completed and a repeat invocation succeeds. Keep the selected Anthropic SDK using its Bedrock client (`AsyncAnthropicBedrock`) and the Bedrock API key or AWS credential chain; there is no direct Anthropic API fallback. LangGraph remains the application workflow and MCP client, sending the request's verified Cognito bearer token to the AgentCore Gateway so the existing traveler/Plan ownership boundary remains intact. Bedrock's server-side AgentCore connector uses the Responses API and IAM-authenticated gateways, so it does not replace this OAuth-bound client path. The existing selection of a Claude-based assistant is unchanged; only the Bedrock transport is revised based on the account behavior.

AgentCore Gateway is not currently provisioned in the account's Stockholm, Frankfurt, or Ireland regions as of this check. Model invocation is available; live MCP tool calls still require a configured gateway URL and deployed targets.

### Discretion

Exact prompt file names, typed turn contracts, checkpoint adapter implementation, compatible package versions, bounded call budgets and plan decomposition may be chosen from research. Prefer existing installed dependencies and narrow additive contracts. Keep one coherent source of conversational working state; retire process-local production state once durable state is wired.
</decisions>

### Scope and deferred work

- This is backend agent planning: prompts, conversation/context contracts, checkpoint persistence, a minimal LangGraph, MCP integration and behavior verification. There is no frontend design or implementation in this corrective slice; the Travella prototype offer applies when that work is planned.
- AgentCore long-term memory remains a bounded, disabled adapter until its own activation/retention feature. Do not silently enable it as part of checkpoint work.
- Requirement/workspace confirmation, bookings, supplier search, new A2UI components and public AWS deployment are deferred. Preserve direct manual Plan/destination CRUD behavior.
- Add only the CRUD conversation/context persistence needed for the documented agent journey, with HTTP persistence/ownership/lifecycle tests. Agent checkpoints are not authoritative Plan records.
- Original roadmap requirements retain their product-level status until frontend and live verification gates pass. No completion claim for Phase 02.1's skipped PostgreSQL checks or existing Phase 3B gaps is implied.
