# Reuse map

## Current shared-workspace patterns —2026-10-27

| New/changed seam | Reuse | Required adaptation / owner |
| --- | --- | --- |
| useTravelWorkspace/travelWorkspaceSchema | TravelSearch request epoch, current schemas | One controller; draft/applied separation, synchronous revision fence, strict final effect method;18-06 |
| WorkspaceContext/Update and digest binding | AgentRequest/Response, TopicRun input_digest, signed completion | Strict optional context, registry authorization, matching begin/complete digest;18-07 |
| Private input/output collector | request_context ContextVars and graph/builder post-invocation projection | Finally-reset private input and final result, never parent state/checkpoints;18-07 |
| update_workspace_view | SpecialistTravelTools registration plus host dispatch | Typed bounded local operations; same manual vocabulary;18-08 |
| CarrierMark and fields | LiteAPI normalize_flights, Segment, FlightSegment, CanvasTravel strict schema | Actual marketing/operating metadata, observed safe images and fallback;18-09 |
| TravelComparison/reviewExactTravelOption | Existing reference and deterministic intent review plus challenge/commit | Main factual comparison; review independent of chat.send/history/model;18-10 |
| Tab recovery/session cleanup | canvasViewState, AccountApp clear path | Bounded references, opaque owner-session scope; fix direct401 sign-in bypass;18-11 |

No new dependency, service, database table or migration is expected. Current final contracts live inWORKSPACE-SPEC/RESEARCH and follow-up plans; historical rows below remain records of original implementation, not new schema tasks.

## Historical reuse map — original18-01–18-05

| Planned artifact | Closest existing pattern | Required adaptation |
| --- | --- | --- |
| `services/crud/topic_conversations.py`, `topic_schemas.py` | `research_context.py` begin/complete/cancel and `repository.py` history | Topic binding, atomic writes and replay mismatch checks; no shared context changes from specialist answer. |
| Topic/history migration | `migrations/versions/0007_conversation_context.py`, `0011_research_draft_offers.py` | Additive schema; backfill Trip; preserve one parent conversation and lifecycle cascade. |
| `services/agent/travel_context.py` | `CrudContextReader`, `canvas.py` validated saved components | Deterministic bounded brief plus version vector; no browser-authored shared facts. |
| `services/agent/claude/travel_specialist.py` | `claude/canvas_editor.py` and `canvas_travel_tools.py` | Dedicated topic instructions, host-enforced allowlist, structured comparison references; exclude place mutation tools. |
| Specialist graph node | `graph/nodes/canvas_editing.py`, `graph/builder.py` | One explicit route in the existing graph; ephemeral inventory remains outside graph checkpoints. |
| `useTravelConversation.js`, `TravelConversation.jsx`, `TravelWorkspace.jsx` | `useCanvasConversation.js`, `CanvasConversation.jsx`, `TravelSearch.jsx` | Topic-keyed state/history and cancellation; reuse result cards and manual form. |
| `services/crud/travel_choices.py` and review UI | `canvas.py` challenge/commit and existing confirmation UI | Research-choice semantics with safe allowlisted evidence; never repurpose mockBooking. |
| Choice/message proxy routes | `services/auth/crud_client.py`, `agent_client.py` | Explicit allowlists, session/CSRF, token propagation, query forwarding and bounded safe projections. |

Representative seams inspected: `api.conversationMessages(selected)` in useCanvasConversation; `flow.add_node("canvas_editing", CanvasEditingNode(adapter))` in graph/builder; `context_reader.context_run(...action="complete"...)` in service; `UniqueConstraint("conversation_id", "event_id", ...)` in models. These require coordinated adaptation, not copied parallel infrastructure.
