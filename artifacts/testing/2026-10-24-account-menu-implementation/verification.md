# Avatar account menu B — verification

Date: 2026-10-24. User explicitly selected B and then requested implementation.
Preview: http://localhost:5188/plans (real application, no prototype parameter).

## Implementation

Shared avatar menu replaces separate Account and Sign out actions in Plans/Conversation/Canvas headers. Account settings uses the same menu, current-page indication and guarded logout. Existing handlers continue to own navigation, session requests and unsaved-change protection. Arrow keys, Home/End, typeahead, Escape, Tab, outside dismissal and focus restoration are supported. Busy/hidden views disable the trigger. Current theme tokens style the card.

The selected prototype source remains captured on `prototype/account-menu-20261024`; account prototype source, route wiring and task-runner script were removed from this implementation. No backend changes.

Browser inspection revealed the floating research brief could cover the open menu and remain visible while Plans was suspended behind Account. The open header now sits above that layer; the brief portal becomes hidden/inert while Account is visible, preserving editor state and restoring position on return. Regression assertions cover suspension and restoration.

## Automated verification

- `npm test --prefix frontend -- --maxWorkers=1 src/components/AccountMenu.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/plans/components/ResearchBriefOverlay.test.jsx`: **36 passed** after final changes.
- `npm test --prefix frontend -- --maxWorkers=1 src/AccountApp.test.jsx`: **7 passed, 5 failed**. Ran the unmodified test/source from baseline commit `31f6775` in an isolated temporary copy: identical five failures. They occur in stale onboarding/session fixtures before reaching the new menu: MFA challenge, recovery-code replacement, expired access refresh, first-login details, first-login skip. These pre-existing failures remain unresolved; the broader suite is not green.
- `npm run build --prefix frontend`: passed after final changes. Existing large-chunk warning remains.
- `git diff --check`: passed.

## Chrome DevTools verification

Used installed Chrome DevTools CLI because the MCP connector's shared browser profile was already in use. Dedicated task tab; existing unrelated tabs left intact. Actual frontend served from this checkout on 5188, proxying the existing backend on 5174 with its expected origin. Local launch: from frontend, `./node_modules/.bin/vite --config /tmp/travella-account-implementation.config.mjs --configLoader runner` (temporary config, no credentials).

- Signed in through UI as the configured example account; private password file read without printing credentials.
- Opened menu, exercised ArrowDown and Escape; active action moved to Sign out, Escape closed and restored avatar focus. Component tests additionally cover Home/End, Tab, outside pointer, busy transition and exact callbacks.
- Created a verification-owned Plan; typed an unsent message. Opened Account from the menu and returned via My plans: mounted Plan and unsent message survived.
- Edited food preferences without saving, chose Sign out: discard dialog appeared. Keep editing retained the draft. Discard permitted logout.
- Injected one browser-only 503 response for sign-out to exercise failure UI. During the request the avatar was disabled; afterward the visible error and enabled trigger allowed retry. Restored native fetch before retry.
- Retried real Sign out: POST `/auth/sign-out` returned 200, signed-out UI appeared, private Plans content unmounted. Signed in again with the example account; reload restored authenticated content.
- Actual Light/Dark controls exercised; dark preference restored afterward.
- Desktop 1440×900 and touch viewport 390×844 checked. Card remained within viewport with no horizontal overflow. After layering correction, hit testing confirmed the card is above the brief; Account hides/inerts the brief; returning restores it.
- Inspected all final screenshots: legible text, correctly placed controls, no clipping or badge covering the menu. Account screenshot is header-only to exclude personal details.
- Final console: existing Lit development warning only, no errors. Final session and Plans requests returned 200. Expected injected logout failure was removed before final check.
- Two verification-owned Plans were created and soft-deleted through the actual confirmation UI. Both disappeared from active Plans; no existing Plans were deleted. Test IDs: `89ba1795-d516-441f-b6da-6242cc41cc25`, `1930ae32-550a-47e9-ba26-7dd9e029901e`. No model requests or saved preference changes.

Some automation attempts reached controls before session/Plan loading finished or used a mismatched button selector. Those attempts were corrected and rerun after readiness checks; final screenshots replaced the initial mobile overlap evidence. No outstanding browser failures.

## Evidence

- Selected design: [desktop](plan/selected-B-desktop.png), [mobile](plan/selected-B-mobile.png).
- Implementation: [Plans dark](implementation/01-desktop-dark.png), [Conversation desktop](implementation/02-conversation-desktop.png), [light](implementation/03-desktop-light.png), [mobile](implementation/04-conversation-mobile.png), [Account mobile header](implementation/05-account-mobile-header.png).

Production source is implemented and verified locally; no push, merge, deployment, or rebuild of the shared Docker stack. The five baseline AccountApp failures are the remaining test limitation.
