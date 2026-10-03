# Phase 4 Specification: Full-Screen Plan Chat

## Outcome

A traveler can use a responsive, full-page conversation to research an active Plan. The page loads that Plan's saved conversation, streams assistant-visible text as it is produced, supports stopping a reply, and keeps agent context and internal progress out of the browser.

## Requirements

1. Opening the existing Plan conversation action navigates to a full-page chat route for that Plan; it no longer opens a conversation drawer.
2. The page loads and renders the saved messages returned by the current Plan conversation API in their stored order.
3. Submitting a message displays the user turn immediately and renders assistant text incrementally as the response is generated.
4. The composer is disabled while the assistant is generating. Enter sends; Shift+Enter adds a newline.
5. Stop cancels the active generation, keeps the partial assistant text visible, and marks the reply stopped. A connection failure keeps partial text visible, marks it interrupted, and offers Retry.
6. Allowed source references that accompany a reply render inline with that reply. The chat has no context drawer, research-progress panel, candidate panel, map, or Planning Canvas.
7. The browser stream contains assistant-visible text deltas, approved inline source references, and minimal terminal status only. It does not contain agent state/context, memory contents, tool calls/results, research activity/progress, internal reasoning, tokens, or raw provider payloads.
8. Requests remain authenticated and Plan-scoped. The Agent service uses existing server-side Plan context, and CRUD remains the owner of durable conversation messages.

## Boundaries

### Included

- Replace the current Copilot drawer interaction with a navigable full-page Plan chat.
- Responsive transcript, empty/loading/error states, accessible live updates, auto-scroll that respects user scroll position, and a multiline composer.
- Text-only streaming transport through the existing authenticated auth proxy and Plan-scoped Agent endpoint.
- Stop/cancel handling, ordered event parsing, message persistence with completion/interruption status, inline rendering for approved sources already supplied by the Agent response.
- Preserve the existing Agent, Plan context, message history, authentication, and authorization contracts.

### Excluded

- Adding Tavily or expanding destination research capability/provider coverage.
- Exposing context, memory, tools, activity, reasoning, or graph-state streaming in the UI.
- Enabling or changing long-term user memory behavior.
- Candidate cards, source drawers, Planning Canvas, map, booking, or destination/brief mutation controls.
- Redesigning agent prompts or the research graph beyond changes strictly required to emit assistant text deltas safely.

## Acceptance

- A traveler can open a Plan's full-page chat, see its saved messages, send a message, and watch assistant text appear before generation completes.
- Stop and connection failure preserve visible partial text with distinct statuses; a completed retry creates an ordered, separately identified response.
- The normal completion, cancellation, disconnect, provider error, and unauthorized/foreign-Plan paths do not leave the composer stuck or expose private state.
- Source links are rendered only from validated/allow-listed source data and remain inline.
- The chat works at desktop and narrow mobile widths without horizontal overflow; keyboard and screen-reader status behavior are usable.
- Existing Plan durability, user identity, and service trust boundaries remain intact.

## Clarity Check

| Dimension | Score | Rationale |
|---|---:|---|
| Goal clarity | 0.95 | The user selected a full-page GPT-like Plan conversation with dynamic assistant text. |
| Boundary clarity | 0.92 | User excluded context drawers and asked to defer visible context/progress; research expansion and memory changes are deferred. |
| Constraint clarity | 0.88 | Existing auth, Plan context, CRUD persistence, and text-only browser projection are fixed. |
| Acceptance clarity | 0.90 | Send, stream, stop, interruption, retry, history, sources, and responsive behavior are observable. |

Weighted ambiguity: 0.08. The specification is ready for implementation planning.
