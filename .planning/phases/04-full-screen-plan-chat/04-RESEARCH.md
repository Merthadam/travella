# Phase 4 Research: Streaming the Plan Conversation

## Current implementation findings

- `frontend/src/PlansApp.jsx` currently holds the selected Plan workspace and renders a `ConversationDrawer`; clicking Copilot opens that drawer.
- `frontend/src/features/plans/components/PlanDrawers.jsx` loads saved messages, submits a single POST, waits for its completed JSON result, and then appends user and assistant messages. It currently renders candidate cards and a generic thinking indicator.
- `frontend/src/plansApi.js` calls the same-origin authenticated API helper. The auth service's `/v1/agent/plans/{plan_id}/events` route forwards a complete POST response through `AgentClient.turn()` and JSON-encodes the result.
- `services/agent/app.py` currently exposes a Plan-scoped route returning one completed `AgentResponse`.
- `services/agent/claude/messages.py` uses `AsyncAnthropicBedrock` or `AsyncOpenAI` and requests structured output. The current `complete()` path waits for the entire provider response, then extracts `assistant_text`.
- `AgentTurnService` reads the Plan and its server-side context, runs the graph, then persists user and assistant messages through `CrudContextReader`. It already passes message `status` to the CRUD endpoint's data model indirectly through the repository default; the repository supports `complete` status and message identity is unique per Conversation/event.
- CRUD message rows already have a status field, sequence ordering, and idempotent event ID constraint. The list route supports bounded history sizes up to 50.
- Agent reservations and receipts already handle duplicate event IDs and a Plan-scoped generation number. Preserve these semantics when adding cancellation and streaming.
- `anthropic>=0.68,<1` is installed as the declared dependency range. The deployed lockfile/runtime determines the concrete API surface, so implementation must verify the resolved SDK's async streaming support rather than infer it from the range.
- The frontend has React 19/Vite and uses the shared authenticated `request` helper. A fetch-based streaming reader is compatible with POST bodies and session cookies; native browser `EventSource` does not provide that POST interface.

## Protocol guidance

AG-UI defines incremental text as `TextMessageStart`, one or more `TextMessageContent` deltas, then `TextMessageEnd`. It defines state and activity events separately. This phase should use only text message events and the minimum terminal/cancel signal the browser needs; the separate state/activity categories remain private. See [AG-UI Events](https://docs.ag-ui.com/concepts/events).

Anthropic's current official docs describe message streaming with distinct content-block deltas, including text and tool-input JSON; thinking/progress events are separate types. The Agent adapter must forward only the validated assistant-visible text path and never blindly forward every upstream SDK event. See [Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) and the [Python SDK docs](https://platform.claude.com/docs/en/api/sdks/python).

## Design constraints and risks

1. The model currently returns a structured decision object (`decision`, `assistant_text`, `question`). Streaming provider text directly would leak JSON framing or partial structured fields. The implementation must provide a safe extraction/normalization layer so only assistant prose is sent to the browser.
2. Tool-using research may take place before the final answer. This phase streams the user-facing reply text when the Agent has validated it; it does not expose tool status or research progress. If no user-visible text is ready, a minimal loading state is acceptable.
3. Cancellation must propagate from the browser reader through auth proxy and Agent task to the model stream. If any hop cannot cancel immediately, discard late events and suppress completion persistence for a cancelled generation.
4. Stop/disconnect persistence must use CRUD-owned message status and the authenticated Agent-to-CRUD boundary; never let the browser write an assistant message directly.
5. Reconnect is not resume-in-place in this first version. The frontend marks the partial response interrupted and offers a fresh retry using a new event ID.
6. Source data is not currently a first-class field on persisted conversation rows. Inline source rendering should consume only a validated, allow-listed projection already available from the Agent; if none exists for a response, render no source links and keep source-data contract expansion minimal.

## Research conclusion

This is a cross-stack vertical slice. The critical seam is safe extraction of the assistant's prose from the structured Agent result while preserving the existing graph, event deduplication, Plan context, and CRUD authorization boundaries. Use a text-only event stream through the current auth proxy. Do not expose AG-UI state, activity, tools, or reasoning events.
