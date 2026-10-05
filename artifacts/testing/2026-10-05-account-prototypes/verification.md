# Account-page prototypes — design verification

Date: 2026-10-05. Branch: `prototype/account-settings`. Scope: three throwaway interactive design alternatives with light/dark mode. User selected C on 2026-10-05; no production account functionality delivered.

## Run and compare

`npm --prefix frontend run prototype:account`

- [A — The essentials](http://127.0.0.1:5176/?preview=account&variant=A&theme=light): sidebar sections and summary rows, with focused modal editors. Most familiar navigation.
- [B — Your travel studio](http://127.0.0.1:5176/?preview=account&variant=B&theme=light): onboarding-inspired profile panel and expandable sections. Strongest continuity with onboarding, more vertical content.
- [C — The control room](http://127.0.0.1:5176/?preview=account&variant=C&theme=light): master/detail navigation and inline editing. Most direct access to individual settings; mobile uses a grouped selector.

Use the bottom bar or left/right arrow keys to change designs; use Light/Dark in the header to change theme. Variant/theme are URL state. `{ }` exposes the fictional saved sample. Reload resets edits. No real account is accessed.

## Executed checks

- `npm --prefix frontend ci --no-audit --no-fund`: installed local dependencies after Vite was initially unavailable.
- `npm --prefix frontend run build`: passed. Existing large-chunk advisory remains. The development-only prototype import and switcher are excluded from production JavaScript.
- Chrome DevTools MCP: default connection was blocked by another active browser profile. An isolated instance of the same installed Chrome DevTools MCP was launched with `--isolated --headless --no-usage-statistics` and driven through its stdio tool protocol. No other browser was terminated. Screenshot image responses were saved to this directory because the isolated MCP had no workspace roots for direct file writes.
- A: opened interests, cleared and cancelled (original interests retained), then cleared and saved (Not provided displayed). Dark-mode editor exercised.
- B: edited food needs and saved; edited name and observed the profile card update; previewed email verification and simulated confirmation. Opened and saved simulated MFA, password and recovery-code flows.
- C: edited home inline; switching settings presented an unsaved-edit warning; Keep editing retained the draft; Cancel preserved the saved home. Mobile selector and custom-interest Add/Save worked.
- Keyboard: ArrowRight switched B to C. ArrowLeft inside a custom-interest field left the variant unchanged. Escape closed the modal editor.
- Theme: light and dark controls worked for all three directions, on desktop and mobile. Reload preserved URL theme/variant and reset fictional profile edits.
- Responsive: 1440×1050 desktop and actual 390×844 mobile viewport emulation. All variants/themes reported document width and scroll width of 390px on mobile, with no page overflow. A mobile editor measured left 17px/right 373px in a 390px viewport.
- Visual inspection: reviewed all desktop/theme and mobile/theme captures plus focused editors. Corrected dialog centering and replaced cramped mobile C navigation with a selector. Reduced mobile B's introductory panel so settings appear earlier. The required floating design switcher overlays the viewport; all content remains reachable by scrolling, with bottom padding.
- Console/network: no JavaScript errors or failed requests observed. Development-only Vite/React notices and Lit dev-mode warning came from the existing application imports. Browser form-name issues were corrected; all nine editors were reopened and inspected afterward. No `/auth` or `/v1` requests occurred.
- `git diff --check`: passed.

Machine-readable browser observations: [interaction checks](devtools-checks.json), [additional account checks](devtools-extra-checks.json), [final console](devtools-final-console.json).

## Screenshots

| Design | Desktop light | Desktop dark | Mobile light | Mobile dark |
|---|---|---|---|---|
| A | [Light](plan/a-light.png) | [Dark](plan/a-dark.png) | [Light](plan/a-light-mobile.png) | [Dark](plan/a-dark-mobile.png) |
| B | [Light](plan/b-light.png) | [Dark](plan/b-dark.png) | [Light](plan/b-light-mobile.png) | [Dark](plan/b-dark-mobile.png) |
| C | [Light](plan/c-light.png) | [Dark](plan/c-dark.png) | [Light](plan/c-light-mobile.png) | [Dark](plan/c-dark-mobile.png) |

Editor details: [A dark interest editor](plan/a-dark-interest-editor.png), [B mobile interest editor](plan/b-light-mobile-editor.png), [C dark home editor](plan/c-dark-home-editor.png).

## Boundaries

All data is fictional and all edits are in memory. Location maps, search, email verification, password changes, authenticator setup and recovery codes are explicitly simulated. No backend CRUD changed, no live authentication was exercised, and no account data was persisted. Authenticated example-account testing and durable-data checks apply to the future selected implementation. No automated tests were added for throwaway code. Design C is selected. Production integration remains pending.
