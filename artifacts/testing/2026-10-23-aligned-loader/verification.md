# Existing-component loading prototype verification

Verified 2026-10-23 on the selected C route. Scope is a dev-only prototype. Actual frontend components receive in-memory sample state; production generation, API mutation contracts, and durable Plans are unchanged.

## Reused frontend

- CanvasConversation (header, fold control, chat history, starter prompts and composer).
- TripEssentials, TripThemes and ResearchFindings with preview fixtures.
- Shared design tokens, canvas page heading/button styles and mobile workspace tab styles.
- Existing B globe and full-width Research → Canvas step indicator retained.

## Executed checks

- `npm run build --prefix frontend`: passed; existing large-chunk advisory only.
- `uv run --with mcp python .planning/quick/261023-tgv-align-selected-loading-prototype-with-ex/verify-aligned.py`: passed through official Chrome DevTools MCP, authenticated with the supplied example account.
- Desktop 1440×1000: replay reveals Plan chat from 56px through approximately 273px to 400px; computed duration 1.1s. Collapse returns to 56px with panel inert; reopen restores access. The composer is disabled during generation.
- Research → Canvas updates the current step while retaining the same globe DOM node and cg-turn animation. No sample canvas cards appear before completion.
- Simulated error, retry, cancel and restart pass. Finish reveals three existing card components and enables the composer. Essentials editor opens/cancels; a starter prompt creates two local sample chat messages. No agent call is made.
- Reduced-motion preference gives globe animation none and grid transition 0s on desktop. Mobile 390×844 has no horizontal overflow and respects reduced motion. Existing mobile tabs switch between loading content and chat; composer remains disabled while generating.
- Light/dark desktop and mobile screenshots captured and visually inspected. Mobile prototype navigation moved into normal flow to avoid hiding the counter; desktop preserves the floating prototype switcher. Desktop cards scroll independently of the chat composer.
- Console: only existing Lit development warning; no errors. Inspected session/profile/plans requests returned HTTP 200. Credentials are read locally and excluded from evidence. No durable Plan writes.
- No unit tests added for throwaway prototype code. Actual agent events, real research and durable editing are outside this preview.

## Evidence

| State | Screenshot |
| --- | --- |
| Research + open sidebar | [Desktop](plan/research-desktop.png) |
| Canvas phase | [Desktop](plan/canvas-desktop.png) |
| Completed existing cards | [Desktop](plan/complete-desktop.png) |
| Dark loading | [Desktop](plan/research-desktop-dark.png) |
| Mobile loading | [Light](plan/research-mobile.png), [dark](plan/research-mobile-dark.png) |
| Mobile Plan chat | [Light](plan/chat-mobile.png), [dark](plan/chat-mobile-dark.png) |

[Sanitized browser results](browser-results.json). Before-state screenshots remain under `../2026-10-23-full-width-loader/plan/`.

Preview: http://localhost:5187/plans?prototype=canvas-globe-topbar&variant=C . Press Replay to see the sidebar opening, then Run demo to advance the two phases. Startup: `npm run prototype:globe --prefix frontend`.
