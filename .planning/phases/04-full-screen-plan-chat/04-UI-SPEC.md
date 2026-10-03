# Phase 4 UI Specification: Full-Screen Plan Chat

## Design direction

Use the accepted **Clean Chat** prototype: a quiet full-page conversation, centered readable transcript, generous whitespace, unobtrusive Plan identity, and a fixed bottom composer. The conversation should feel like a focused GPT chat, not a dashboard. Keep the existing Travella typography/color tokens where practical; simplify the current dark workspace styling for this focused screen without changing the rest of the workspace.

Prototype evidence: [Clean Chat screenshot](../../../artifacts/testing/2026-10-03-country-researcher/plan/variant-a-clean-chat.png). Other explored variants remain available for comparison: [Research Replies](../../../artifacts/testing/2026-10-03-country-researcher/plan/variant-b-research-replies.png) and [Research Thread](../../../artifacts/testing/2026-10-03-country-researcher/plan/variant-c-research-thread.png).

## Layout contract

- Full viewport-height app shell with a compact header: Travella/Plan label, back navigation to the Plan workspace, and the Plan title.
- One centered transcript column, readable line length, vertically scrollable, and no side drawer or context rail.
- User messages are clearly distinct from assistant messages, with source references inline beneath the relevant assistant reply.
- Empty state invites a first travel question in plain language; it contains no sample claims presented as live research.
- Composer is pinned to the bottom of the chat shell, grows for multiline input, and has an explicit send button.
- At widths below 640px, use the full width with safe horizontal gutters; keep the composer and Stop button reachable above the mobile keyboard and avoid horizontal overflow.

## Interaction contract

- Loading history: show a quiet status in the transcript area; do not fabricate prior messages.
- Sending: append the user's message immediately, create an assistant message bubble, and append received text chunks in order.
- While streaming: show Stop, disable message entry/send, and keep the latest content visible unless the traveler has scrolled upward.
- Stop: finalize visible text with a `Stopped` status label and enable the composer.
- Transport interruption: retain visible text with an `Interrupted` label and a Retry action; never style it as a completed answer.
- Complete: remove generation status and retain the finalized assistant message.
- Retry: send the original user message as a new event; do not overwrite earlier partial output.
- Inline sources: render validated source names/links in the assistant message. No source panel/drawer.
- Keyboard: Enter sends when valid; Shift+Enter inserts a newline. Buttons expose clear accessible labels and keyboard focus states.
- Accessibility: transcript uses a polite live region without re-announcing the entire growing transcript on every chunk; generation/cancel/error status is announced separately.

## Content and state contract

- The browser receives only the stream's approved assistant prose delta and allow-listed source metadata needed for inline links, plus a terminal completion/interruption/error outcome.
- Do not render candidate cards, internal steps, tool calls/results, research progress, context/memory values, or reasoning.
- Clamp messages to existing API limits; display safe service errors without provider internals.
- Preserve message order by event/message ID; ignore duplicate/out-of-order chunks and late chunks from cancelled or superseded requests.

## Responsive visual references

The three prototype screenshots were captured at desktop and their interactions were checked at a 390px viewport. The selected baseline is the clean chat variant; project-level verification still needs to capture the production page at desktop and mobile.

## Manual UI contract review

| Dimension | Verdict | Notes |
|---|---|---|
| Goal fit | PASS | Pure chat surface and direct Plan conversation. |
| Layout clarity | PASS | Transcript plus composer; no auxiliary panels. |
| Streaming states | PASS | Loading, active, stopped, interrupted, and complete states are specified. |
| Content hierarchy | PASS | Assistant prose first; citations remain inline. |
| Responsive behavior | PASS | Mobile gutters and keyboard-safe composer are required. |
| Accessibility | PASS | Keyboard controls, focus state, and separated polite status announcements are specified. |
| Scope control | PASS | Agent internals and broader research features are deferred. |
