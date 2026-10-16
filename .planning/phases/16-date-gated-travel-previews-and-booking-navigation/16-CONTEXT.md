# Phase 16: Date-gated travel previews and booking navigation - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary
Connect the existing flight and accommodation search endpoints to the Planning Canvas agent, render three provider-backed A2UI option previews in chat, and provide explicit navigation to a dedicated results page. Require exact dates before searches. Implement a reusable agent skill guiding this flow. The separate booking LangGraph flow is deferred.
</domain>

<decisions>
## Implementation Decisions
- **D-01:** Only Planning Canvas chat gets these tools; initial trip chat remains unchanged.
- **D-02:** Reuse existing A2UI styling; user declined three alternative prototypes by agreeing with the recommendation. Still produce and inspect a preimplementation visual sketch and implementation screenshots.
- **D-03:** Show up to three observed options per search in chat; a View all flights/stays button opens the dedicated page with the matching results.
- **D-04:** New navigation opens a results-only page; booking functionality and a separate booking LangGraph flow are deferred. Preserve existing unrelated sandbox checkout behavior.
- **D-05:** Exact departure/return or check-in/check-out dates are required before provider searches. Ask a focused question for missing/ambiguous dates; never invent dates or year. Prefer explicit current canvas dates; dates supplied for a search do not silently mutate durable Plan data.
- **D-06:** Expose read-only search capabilities through the existing authenticated/private travel integration and a bounded agent skill, following the current activity-tool pattern.
- **D-07:** Full GSD flow is authorized: research, UI and AI contracts, checked execution plans, implementation, review and verification. Routine implementation and verification choices are delegated to the agent.

### Agent discretion
Bounded search limits, exact field validation, result ownership/lifetime, loading/empty/error/stale states, navigation details, test design, and internal module structure. Reuse existing contracts and UI patterns. Avoid arbitrary URLs and sensitive search/checkout payloads in model context, browser history, logs or checkpoints.
</decisions>

<canonical_refs>
## Canonical References
- `AGENTS.md` — traveler control, ownership, security and GSD workflow.
- `docs/skills/travella-testing/SKILL.md` — mandatory browser/API verification and evidence.
- `.agents/skills/travella-local/SKILL.md` — local stack and authentication.
- `services/agent/claude/canvas_editor.py` — existing bounded activity tools and SDK loop.
- `services/agent/prompts/canvas-editing-v1.md` — current planning stage behavior.
- `services/agent/editing_contracts.py` — typed request and public result boundaries.
- `services/agent/travel_contracts.py` — exact-date flight and hotel input/output contracts.
- `services/agent/travel_routes.py` and `services/agent/travel_client.py` — authorized travel endpoints/private connector access.
- `frontend/src/features/plans/components/PlanningCanvas.jsx` — existing canvas navigation.
- `frontend/src/features/plans/travel/TravelSearch.jsx` — provider results and existing sandbox checkout (new path must remain results-only).
</canonical_refs>

<code_context>
## Existing Code Insights
The Canvas editor has a run-local observed-place registry, an in-process SDK MCP server and allowlisted skills/tools. LangGraph owns orchestration. Existing travel search validates exact ISO dates, party details, airports and country fields. TravelSearch currently provides browsing and sandbox checkout, reached from canvas cards. Adapt these boundaries rather than giving the model generic travel/checkout access.
</code_context>

<specifics>
## Specific Ideas
Mirror activity discovery: ask for missing requirements, search, show compact provider-backed previews, then let the traveler explicitly navigate. Navigation must retain the relevant search context and be honest if results have expired or need a new search.
</specifics>

<deferred>
## Deferred Ideas
Separate booking LangGraph orchestration, actual booking/payment/supplier handoff, initial trip-chat tools, additional providers/modes, autonomous saving or dates/requirements mutation.
</deferred>
