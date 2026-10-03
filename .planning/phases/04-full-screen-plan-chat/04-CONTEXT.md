# Phase 4 Context: Full-Screen Plan Chat

## User intent

Make the current Plan conversation the first page of the research flow. The interface should feel like a simple GPT chat and let the traveler ask, learn, and continue naturally. The first milestone is the interaction surface and its minimal streaming path, not a broader agent/research redesign.

## Locked decisions

- The existing Copilot/conversation drawer is replaced by a full-page conversation route from the active Plan.
- Opening the chat loads the existing saved messages for that Plan.
- The Agent already has Plan context; it continues to read that context server-side. The frontend does not receive a context projection.
- Assistant text appears incrementally as it is generated; do not wait for the completed JSON response before showing the answer.
- Only assistant-visible text and an allow-listed inline source reference projection may be streamed. Do not stream internal reasoning, raw graph state, tools, research progress, or memory contents.
- Show Stop during generation and disable the composer until generation completes or is stopped.
- Text already received remains visible after Stop and the assistant message is marked stopped.
- If a connection drops, preserve received text, mark the assistant reply interrupted, and offer Retry.
- Source references, when available from the validated Agent result, display inline under the relevant assistant reply.
- Enter sends; Shift+Enter inserts a newline.
- Keep the page simple: no context drawer, candidate panel, map, or Planning Canvas.
- Use the accepted Clean Chat prototype direction as the visual baseline. The preview's sample content and state updates are simulated and are not production behavior.

## Existing project boundaries to preserve

- Public auth service authenticates the browser session and forwards the managed-identity token to the Agent service.
- Agent independently validates identity and plan ownership, and obtains the active Plan's context from CRUD.
- CRUD remains the sole owner of durable Plan conversation messages; the Agent can append only through its authenticated CRUD client.
- Message event IDs remain idempotent. A stream must not allow duplicate requests to create duplicate turns.
- Browser projection is an explicit allow-list, not a serialization of graph or provider state.

## Resolved implementation assumptions

- The current Plan action that opens Copilot becomes a link/navigation to a Plan chat URL; normal Plan workspace navigation remains available through a back control.
- Use the existing conversation history API with its supported bounded history size; do not add pagination as part of this UI slice.
- Stopped and interrupted partial assistant text is persisted using the existing message status field, if the Agent run has emitted text. Empty partial replies do not create assistant messages.
- Retry resubmits the traveler's original message with a new event ID, while the interrupted/stopped assistant message stays in history and is not overwritten.
- The stream transport may use the existing AG-UI text event vocabulary or a minimal equivalent only if the project's current server integration cannot support AG-UI directly; emitted browser events must remain allow-listed text/start/end/error/cancel events.
- This phase does not enable long-term memory or add new research providers. Existing context behavior is preserved.

## Deferred ideas

- Stream activity/progress, show what the agent remembers, editable context controls, source drawer, richer research output, Tavily expansion, and persistent cross-Plan memory.
- Candidate comparison controls, destination confirmation, Planning Canvas, and booking surfaces.
