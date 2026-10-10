# Selected A refinement — verification, 2026-10-10

GSD sketch 005 continuation. User selected A, approved conversational adding, and requested a simple, especially user-friendly design. This deliverable refines the interactive design prototype; it does not change production app code.

Preview: http://127.0.0.1:5187/005-places-list-map/?variant=A
Run: `python3 -m http.server 5187 --bind 127.0.0.1 --directory .planning/sketches`

## Browser checks executed

Chrome DevTools MCP 1.10.1, isolated Chrome session (the existing shared profile remains untouched). Actual browser clicks, keyboard events, DOM interactions/assertions, screenshots, console, and network inspection. Desktop 1440 × 1050 and emulated phone 390 × 844, DPR 1, touch enabled.

Passed:
- A has quiet Find places entry, no manual Add place header button, no empty category filters. Plain List/Map controls, small conventional pins, concise notes instead of duplicated descriptions. Original B/C references still render.
- Expand saved place; edit and save note; request removal without removing; explicitly confirm; Undo restores original item.
- Open conversation; request parks; loading feedback then two named/addressed results. Six saved places remain six after searching and previewing.
- Preview Parco Sempione on map: separate outlined marker, named tooltip, explicit preview-only label. Adding explicitly changes six to seven, selects the saved place, and replaces the result action with Added status. Repeated add does not duplicate.
- Unknown request returns a clear no-match sample response. Request for already-saved Sforzesco Castle renders Added status.
- Draft message survives closing/reopening the conversation. Escape closes conversation. Phone keyboard focus wraps within the conversation; initial harness focus assertion ran before scheduled autofocus, corrected harness timing and reran successfully.
- Phone search for coffee returns three sample matches; preview closes the conversation so the map is usable; the preview details provide Add to plan and Back to results. Explicit addition changes six to seven.
- First-place flow with zero actual saved places: preview renders a map without adding anything; explicit Add creates the first place.
- Saved-place filtering/search, view toggles, marker selection, Show all places, preserving map zoom when closing details.
- Map failure fallback retains the list; loading/empty states work; empty categories hidden in the empty demo. Changing demo states clears stale toasts/previews.
- Exactly 390px page width, no horizontal document overflow. Category strip intentionally scrolls. Light/dark and screenshots visually inspected for legibility, overlapping pins, and clipped actions.
- Reload retains chosen variant and resets sample data to six. Conversation and writes are explicitly simulated.

Console: no errors or warnings. Network: local assets and completed OSM tile requests returned 200/304. Rapid map replacement canceled obsolete tile requests (ERR_ABORTED); verified the settled map separately: 15 tiles, zero unloaded/broken, six pins. No backend mutation or live agent requests.

## Evidence

- [Before A](plan/before-a.png)
- [Desktop list and inline note](plan/desktop-list.png)
- [Desktop conversation with unsaved preview](plan/desktop-preview.png)
- [Desktop after explicit addition](plan/desktop-added.png)
- [Phone list](plan/phone-list.png)
- [Phone conversation](plan/phone-conversation.png)
- [Phone unsaved preview](plan/phone-preview.png)
- [Phone empty state](plan/phone-empty.png)
- [Dark map](plan/desktop-dark.png)

## Limits

This is the selected design prototype, with sample conversations, sample catalog, and memory-only edits. No live agent, authenticated Plan mutation, real provider search, production build, or backend persistence verification is claimed. Example-account authentication is not applicable to the isolated prototype. Production integration requires its own authenticated browser and CRUD gates. Comparison controls are hidden by default for A; enable Prototype tools → Compare alternatives to inspect B/C.
