# Reuse map

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
