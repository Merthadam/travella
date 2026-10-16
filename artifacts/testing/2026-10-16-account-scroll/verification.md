# Account Settings scrolling — 2026-10-16

## Change and acceptance criteria

Account fills the viewport with a persistent header and one native vertical scroll container for its content. Every setting/editor action must remain reachable on desktop and narrow screens. Focus must not unexpectedly move the scroll position. Plans/Account navigation must continue in React without a document reload or loss of unsaved-change protection.

The optional prototype choice was offered; no answer arrived during investigation, so the existing design was retained. The visual plan is a browser-rendered CSS preview of the same layout with explicit scrolling.

## Findings and scope

- Internal navigation already uses history.pushState and eagerly imported React components. No page-loading architecture change was necessary.
- Before the change, Account used outer-document scrolling. That worked in standalone Chrome; the user's exact total scroll lock was not reproduced. Automatic heading focus did move the outer page (observed scrollY 296 after entering an editor).
- Added viewport sizing, a shrinking scrollable main area, and non-scrolling focus for setting/editor changes and modal focus restoration.
- No backend operation changed. Browser verification made only temporary unsaved edits and discarded them; no traveler profile or Plan was changed.

## Environment and checks

- Canonical app: http://localhost:5174, rebuilt from this checkout with `bash scripts/start-local-ready.sh` after the skill's Cognito precheck.
- Authenticated with the supplied example-account file, keeping credentials out of evidence. The local readiness sign-in/session/sign-out check passed.
- The default Chrome DevTools MCP profile was locked. Used the installed Chrome DevTools CLI/MCP with an isolated Chrome instance and explicit workspace roots, not a substitute browser tool.
- SHA-256 comparison of the running container's AccountSettingsPage.jsx and account.css against this checkout: MATCH.

| Browser check | Observed result |
| --- | --- |
| Desktop 1280×720, long Food & accessibility editor, End key | Main scrollTop 296, equal to maximum; document scrollY 0; Cancel and Save fully visible; header top 0 |
| Mobile emulation 390×680, same editor, End key | Main scrollTop 504, equal to maximum; document scrollY 0; actions fully visible; no horizontal overflow |
| Temporary unsaved edit → My plans → Keep editing, 500×680 | Draft retained; final rerun retained scrollTop 438 exactly |
| My plans → Discard changes | Temporary edit discarded; existing Plans DOM node retained; performance.timeOrigin unchanged |
| Browser Back and Forward | Account/Plans render correctly; same document; Account starts at the top |
| Revisit Account and change setting/editor | Content renders inside the scroll container; existing design retained |
| Console | No application errors in the final navigation run; existing Lit development-mode warning only |
| Network | One initial document request (304); no new document requests for internal navigation; inspected API/map requests returned 200 |
| Screenshots | Desktop light/dark and narrow dark inspected for clipping, overlap, and bottom-action visibility; account identity and preference text hidden only for evidence capture |

## Automated checks

- `NODE_OPTIONS=--no-experimental-webstorage npm test -- src/features/account/AccountSettingsPage.test.jsx src/PlansApp.test.jsx`: **27 passed**.
- Added a regression test that confirms setting/editor focus retains accessibility focus while requesting preventScroll.
- `npm run build`: **passed**; existing large-bundle warning remains.
- `git diff --check`: **passed**.
- Initial host test run was blocked by Node's experimental localStorage implementation; disabling that feature allows jsdom storage to work.
- Broader run including `src/AccountApp.test.jsx`: 34 passed, 5 failed. All five failures were reproduced against unchanged HEAD in a temporary checkout (7 passed, 5 failed in AccountApp alone). They concern MFA/recovery/refresh and first-login flows expecting the previous onboarding UI. These are pre-existing failures; the broader suite is not green.
- Browser wheel/touch hardware gestures were not separately automated; native keyboard scrolling, computed overflow geometry, and responsive layouts were exercised in Chrome.
- Window resizing initially clamped the narrow viewport to 500px. Final desktop/mobile captures use explicit DevTools viewport emulation, with innerWidth/innerHeight checked before capture.

## Evidence

- [Before desktop](plan/before-desktop.png)
- [Rendered layout preview](plan/scroll-layout-preview.png)
- [Desktop bottom, dark](implementation/desktop-bottom-dark.png)
- [Narrow bottom, dark](implementation/mobile-bottom-dark.png)
- [Desktop top, light](implementation/desktop-top-light.png)
