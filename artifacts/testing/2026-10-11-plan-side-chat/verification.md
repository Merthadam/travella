# Plan side chat verification — 2026-10-11

## Scope and result

The Plan canvas chat stays open by default on desktop. Collapse folds it into a persistent right-edge Chat rail. Reopening preserves unsent text and moves keyboard focus predictably. Mobile keeps the Plan & map / Conversation navigation. Refined the header, message typography, empty state, and composer; removed the nested dark textarea background and manual resize grip.

## Checks executed

- `npm test --prefix frontend -- --run src/features/plans/components/PlanningCanvas.test.jsx`: **13 passed**. Includes send/reply with mocked agent transport, editor/travel navigation preservation, and collapse/reopen draft/focus without save or send.
- `npm run build --prefix frontend`: **passed**. Existing >500 kB bundle warning remains.
- `git diff --check`: **passed**.
- Local Compose rebuild: app and PostgreSQL **healthy**, all connector containers running. Final SHA-256 comparisons match the checkout for PlanningCanvas.jsx, CanvasConversation.jsx and canvas-conversation.css.
- Chrome DevTools MCP used through a dedicated local MCP client because the configured shared Chrome profile was occupied. Example account authenticated successfully before the final rebuild; its existing session remained valid afterward (`GET /auth/session` 200).
- Desktop 1440 × 1000: open by default, fold rail 56 px, Enter to reopen, focus transferred to Expand/Collapse controls, exact unsent draft preserved, transparent textarea background, assistant body 14 px, no horizontal overflow, composer bottom at viewport bottom.
- Mobile emulation 390 × 844 with touch: Conversation / Plan & map navigation, collapse/reopen, focus returns to Conversation when collapsed, draft preserved, textarea 16 px, page width 390 px and composer bottom 844 px. Light and dark screenshots inspected.
- Empty history: useful introductory copy and starters, disabled Send with blank input.
- Controlled browser-only delayed/rejected conversation fetch: loading and history error states disable composer; error does not show misleading empty-state prompts. Restored the real fetch function, clicked Retry, received live HTTP 200 and recovered the empty conversation with enabled composer. These two states are explicitly simulated, with no server/model mutation.
- Console: no application errors; existing Lit development-mode warning only. Live auth, canvas, context, history and capability fetches returned HTTP 200.
- Existing populated conversation used read-only for desktop evidence. A separate empty plan was created for mobile/loading/error checks and cleaned up afterward through the application's normal soft-delete contract. No plan contents were saved or model requests sent.

## Limits

The first rebuild's sign-in → session → sign-out smoke check passed. The final rebuild's fresh sign-in check returned **HTTP 401**. Per travella-local instructions, the password was not retried or changed. Browser verification continued using the already authenticated example-account session, which still returned HTTP 200. Fresh sign-in readiness remains unresolved, although the UI checks above passed.

No live model generation was requested; send/reply behavior was exercised in the existing component tests with mocked transport. Mobile checks cover responsive/touch emulation, not a physical on-screen keyboard.

## Evidence

All screenshots were visually inspected for overlap, clipping, contrast and incorrect states.

- [Before desktop](plan/before-desktop.png)
- [Design sketch](plan/layout-sketch.png) and [interactive sketch](plan/layout-sketch.html) — simulated content/actions
- [Desktop open, dark](implementation/dark-open.png)
- [Desktop folded, dark](implementation/dark-folded.png)
- [Desktop empty, light](implementation/light-empty.png)
- [Mobile draft, dark](implementation/mobile-dark.png)
- [Mobile empty, light](implementation/mobile-light.png)
- [Mobile loading, simulated](implementation/mobile-loading-simulated.png)
- [Mobile error, simulated](implementation/mobile-error-simulated.png)
