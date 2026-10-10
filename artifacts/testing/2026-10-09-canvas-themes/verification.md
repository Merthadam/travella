# Plan canvas appearance verification

Started 2026-10-09; completed 2026-10-10 (Europe/Budapest). Local URL: http://localhost:5474. Compose project: `travella-liteapi-fresh`.

## Scope and acceptance

Repair the existing selected canvas design (no new structural prototype decision). Light and dark modes must consistently theme cards, forms, chat, notices, dialogs and maps; switching must remain accessible within the canvas and travel search. Retain the choice across navigation/reload. Preserve Plan data and scrolling.

The original canvas used a fixed light design-system palette while chat Markdown followed the dark application palette. The result was near-white text on white panels. [Before screenshot](plan/before-dark-desktop.png).

## Implementation

- Connected canvas design tokens to the existing application appearance provider, with separate primary-action background/foreground tokens and themed accent colors.
- Replaced fixed light surfaces throughout cards, editors, chat, activity details, notices and confirmation dialogs.
- Added an accessible Light/Dark control that changes the same persisted preference as Account.
- Increased small chat/helper text; retained mobile input sizing and independently scrolling canvas/chat panels.
- Centered confirmation dialogs and constrained their height to the viewport.
- Recreated Google Maps when changing color scheme, preserving the explored center/zoom. Google supports colorScheme only on initialization: https://developers.google.com/maps/documentation/javascript/mapcolorscheme.

## Executed checks

| Check | Observed result |
| --- | --- |
| `npm --prefix frontend test -- src/features/appearance/AppearanceProvider.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx` | 11 passed |
| `npm --prefix frontend test -- src/features/plans/components/CanvasAppearance.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx` | 2 passed; preference retention and map viewport preservation covered |
| `npm --prefix frontend run build` | Passed; existing large-chunk advisory remains |
| `git diff --check` | Passed |
| Local startup skill | Read-only Cognito precheck, Docker rebuild, health and example-account sign-in/session/sign-out checks passed |
| Container source verification | SHA-256 matches for tokens, component styles, canvas/chat styles, PlanningCanvas, CanvasAppearance and CanvasDestinationMap |
| Chrome DevTools MCP, authenticated example account | Real browser interaction with both modes, desktop 1440×900 and mobile 390×844 |
| Theme persistence | Both light and dark retained after leaving the unsaved test canvas, reloading, and reopening it; selected control and localStorage matched |
| Editors | Opened Trip essentials, switched both themes while editing, inspected inputs and actions, then cancelled |
| Mobile | Switched Plan & map/Conversation; readable composer and selected tabs; document width 390 at viewport 390 (no horizontal overflow) |
| Dialogs | Opened leave confirmation in both modes and cancelled; final screenshots show centered modal and reachable actions |
| Search | Opened Stays and Flights from canvas; switched themes within search; scrolled stays to its empty state/footer |
| Empty/loading/error | Inspected empty preferences/map/stays; Chrome offline emulation produced readable errors in both modes; Slow 3G captured loading notice; restored network and retried successfully |
| Contrast | Sampled computed foreground/background contrast for 9 canvas/card/chat/control surfaces: minimum 4.66:1 light, 6.97:1 dark. [Measurements](implementation/contrast.json). This is a focused check, not a full accessibility audit. |
| Console/network | Lit development-mode warning. Four expected offline request failures during the induced-error test; canvas/context/capabilities subsequently returned 200. A later session 401 redirected to sign-in; reauthentication restored successful requests. No theme-related JS errors observed. |

No backend CRUD behavior changed. No Plan save, generation, activity addition or booking was performed. Broader application suites were not rerun for this CSS-focused repair. All final evidence was visually inspected for clipping, overlap and unreadable text.

## Screenshots

- [Desktop light](implementation/light-desktop.png) · [Desktop dark](implementation/dark-desktop.png) · [Dark map](implementation/dark-map.png)
- [Light editor](implementation/light-editor.png) · [Dark editor](implementation/dark-editor.png)
- [Mobile light](implementation/light-mobile.png) · [Mobile dark](implementation/dark-mobile.png)
- [Light chat](implementation/light-mobile-chat.png) · [Dark chat](implementation/dark-mobile-chat.png)
- [Light dialog](implementation/light-mobile-dialog.png) · [Dark dialog](implementation/dark-mobile-dialog.png)
- [Light stays](implementation/light-mobile-stays.png) · [Dark stays](implementation/dark-mobile-stays.png) · [Scrolled stays](implementation/dark-mobile-stays-bottom.png)
- [Light flights](implementation/light-mobile-flights.png) · [Dark flights](implementation/dark-mobile-flights.png)
- [Light offline](implementation/light-mobile-offline.png) · [Dark offline](implementation/dark-mobile-offline.png) · [Loading](implementation/light-mobile-loading.png)
