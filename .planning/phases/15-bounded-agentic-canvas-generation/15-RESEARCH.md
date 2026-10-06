# Research and source audit

Inspected 2026-10-06. No runtime or paid calls performed.

## Current code

| Source | Evidence and implication |
|---|---|
| services/agent/graph/builder.py | canvas_generation exists with explicit generate_themes action; extend this graph. |
| services/agent/claude/themes_worker.py | One tool-free structured call, exact source quotation validation, stable ids; semantic review not yet implemented. |
| services/agent/claude/research_worker.py | Existing isolated SDK runtime, low effort, native web observer, cancellation cleanup and structured helper. structured() currently permits up to three SDK turns. Reuse isolation, not the research answer-generation path. |
| services/agent/service.py | Ownership, event reservations, cancellation and context leases exist. Initial draft action bypasses chat append/context commits. Current stream sends one final draft; incremental component publication still needed. |
| services/agent/checkpoint.py; app.py | Checkpoint helpers exist but app constructs graph without a durable checkpointer. Do not claim resumable draft state exists. Saved canvas recovery must use CRUD. |
| services/agent/turn.py | MAX_HISTORY=12, MAX_TEXT=2000. Raising only HTTP limit is insufficient; generation needs its own explicit context bound. |
| services/crud/repository.py:conversation_messages; agent_context | Authorized history is stored with sequence; read endpoints default 12 and cap 50. Add generation-only pagination/cutoff support, not a global conversation behavior change. |
| services/trip_context.py | Exact fields finalDestination, dateStart, dateEnd, dateNote, flexibleDates, travelers, budget, noFixedBudget, flights, accommodation. No booking status or theme fields. Need must not become bookingStatus. |
| frontend/src/design-system/a2ui/catalog.jsx | Seven fixed types and paths, 64 KiB cap, preview surface id, complete payload validation. Parameterize surface identity and reuse pure renderers without importing fixture app. |
| frontend/src/features/plans/components/PlanConversation.jsx; frontend/src/plansApi.js | Existing authenticated chat entry/API. Add focused canvas hook/view rather than growing conversation into a canvas monolith. |
| frontend/src/lib/googleMaps.js; features/onboarding/components/HomeLocationMap.jsx | Existing loader and maps/marker imports available. Reuse their loading lifecycle; destination viewport differs from nearby-airport bounds. |
| frontend/src/features/plans/components/PlanWorkspace.jsx | Legacy destination workspace; not the newly approved canvas. Do not revive its old layout as authority. |

## External primary sources

- [Claude Agent SDK structured outputs](https://code.claude.com/docs/en/agent-sdk/structured-outputs): SDK output_format supports JSON schema and result validation. SDK schema retries are distinct from a semantic self-review loop; account for both in budgets.
- [Claude Agent SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents): native delegation uses Agent definitions/tool calls. Current implementation instead launches dedicated SDK workers directly from LangGraph; that is the accepted scheduling boundary, not a claim of native nested subagents.
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents): explicit workflow routing supports bounded evaluation/optimization. Use a counter and conditional edge with no back edge after the one allowed revision.
- [Google Maps Map reference](https://developers.google.com/maps/documentation/javascript/reference/map): fitBounds accepts the destination viewport. Apply after the map has a rendered size and only on destination change/recenter, not every component update.

## Failure modes to cover

Earlier preference missed by short history; deleted brief facts resurrected from transcript; inferred interests mistaken for explicit wishes; unsupported claims surviving a successful JSON parse; duplicate reviewer loops; native SDK retries multiplying spend; copied links with no read evidence; stale generation replacing edits; plan A data appearing in plan B; saved and unsaved state conflated; need=needed incorrectly becoming booked; map recentering on every render; draft preview labels leaking into production components.
