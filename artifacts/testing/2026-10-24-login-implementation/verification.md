# Production account access redesign — 2026-10-24

Implemented the explicitly approved full-screen A design in source commit `63bec5d`. The production account-access view uses the existing authentication state machine and AppearanceProvider. No preview controls, simulated behavior, query gate or prototype CSS remains in the implementation branch or production build. The design source remains on `prototype/login-A-fullscreen-20261024` at `04b5411`.

## Behavior preserved and presentation changed

- Existing registration, email verification/resend, sign-in/session refresh/sign-out, password recovery/reset, MFA challenge/enrollment/recovery and recovery-code endpoints and payloads remain in AccountContent.
- Password/code DOM values clear on submission and the presentation remounts between states. Email remains in memory across steps; verification provides an explicit email editor. Field errors can reveal a retained email for correction without hiding it again while typing.
- Full-screen split layout, simplified decorative globe, native light/night toggle using the global theme preference, mobile layout, and plain inline errors/statuses.
- Recovery keeps the server's neutral message. Verification is offered after registration or from failed sign-in/recovery context. Existing authentication gating and onboarding remain intact.
- Auth test fixtures using obsolete onboarding contracts were updated to the current versioned profile and step API; onboarding implementation did not change.

## Automated verification

Final command, from `frontend/`:

```sh
NODE_OPTIONS=--no-experimental-webstorage npm test -- src/AccountApp.test.jsx src/features/appearance/AppearanceProvider.test.jsx src/features/account/AccountSettingsPage.test.jsx src/components/AccountMenu.test.jsx src/PlansApp.test.jsx
```

**52/52 passed across five files.** Coverage includes private-content gating, secret clearing, exact registration/reset payloads, contextual verification/resend/email editing, pending submission/navigation, accessible field errors, MFA/recovery, refresh, onboarding continuation, global appearance, account settings, account menu and Plans integration.

A test initially inspected a button's own `disabled` property although it inherited disabled state from its fieldset; corrected to test effective `:disabled`. One run under Node 24 encountered its experimental global Web Storage conflict before the appearance/account tests could run. The final command disables Node's experimental storage so JSDOM supplies browser storage; all tests passed. No production storage workaround was introduced.

`npm run build`: passed (existing large-chunk advisory). `git diff --check`: passed. Search of `frontend/dist` found no account prototype markers.

## Chrome DevTools verification

Used the existing task-owned frontend on **http://localhost:5188/**, with `/auth` and `/v1` forwarded to the running local backend on 5174. No shared backend restart or deployment. Chrome DevTools CLI used because the MCP shared-profile conflict from the preceding work prevented that entry point.

Real example-account journey, credentials read privately from the configured local file:

1. Sign in through the production form → My plans rendered, password field removed, no prototype controls.
2. Reload → authenticated Plans remained; selected dark theme remained.
3. Account menu → Sign out → private Plans removed and new sign-in screen shown.

Saved only the authenticated heading as evidence to avoid unrelated Plan content. The temporary private login script was deleted immediately after use. No credentials/tokens were included in logs, screenshots or tracked files.

Production browser presentation and flows:

- Desktop 1440×1000: day/night, full-height panels, inline error, registration, verification, recovery inbox and reset screens.
- Mobile 390×844: day/night sign-in, registration, recovery and direct reset; no horizontal overflow or clipped controls. All saved UI screenshots visually inspected.
- Theme toggle and reload: retained via existing global appearance setting.
- Browser-stubbed sensitive mutations: sign-in rejection/loading, registration → verification, resend, email editing, successful verification, recovery → neutral confirmation → reset → sign-in, and MFA recovery → replacement → recovery codes. These drove the production components and handlers; requests were intercepted before reaching the backend.
- Pending requests disable form and navigation; passwords clear immediately. Error is announced and linked to the affected field. Leaving MFA screens removes setup key and codes.
- The browser harness initially matched the Back button's text without its decorative arrow; corrected the harness and reran successfully.
- Console/network: expected signed-out `/auth/session` 401 and existing Lit development warning only. No unexpected failed requests or runtime errors. Stubbed mutations were removed by reloading afterward.

Browser drivers: `/tmp/travella-real-login-check.py` and `/tmp/travella-auth-production-check.py`; sanitized presentation results in `/tmp/travella-auth-production-results.txt`.

## Evidence

Approved [night design](plan/approved-night.png), [day design](plan/approved-day.png), and [previous production screen](plan/before.png).

Implemented [night desktop](implementation/login-night-desktop.png), [day desktop](implementation/login-day-desktop.png), [day error](implementation/login-day-error.png), [registration](implementation/registration-day-desktop.png), [verification](implementation/verification-day-desktop.png), [recovery](implementation/recovery-day-desktop.png), [inbox](implementation/recovery-inbox.png), [reset](implementation/reset-day-desktop.png), [authenticated heading](implementation/authenticated-heading.png).

Mobile [night sign-in](implementation/login-night-mobile.png), [day sign-in](implementation/login-day-mobile.png), [registration](implementation/registration-night-mobile.png), [recovery](implementation/recovery-night-mobile.png), [reset](implementation/reset-night-mobile.png).

## Limits

Real registration/password reset/email verification/MFA mutations were deliberately not performed on the example account; those branches were checked through production handlers with browser and unit-test stubs. The focused suite passed; the entire repository suite was not run. No push, merge or shared-stack deployment.
