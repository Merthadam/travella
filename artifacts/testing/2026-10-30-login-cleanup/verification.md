# Login cleanup verification — 30 October 2026

## Scope and result

Passed. Current login design and behavior preserved. Removed the unreferenced `FirstLoginOnboarding.jsx` compatibility re-export, legacy auth rules (`shell`, `checklist`, `secondary`, `field-error`, `recovery-codes`), six obsolete onboarding chat/review class families, and their unused dark-theme references. Repository searches found no live frontend consumers of those selectors or the compatibility export. The recovery-codes search hit in AccountSecurity was an API URL, not a CSS consumer; its current textarea and AccountAccess's `auth-recovery-codes` remain intact. Current registration, verification, password reset, MFA, onboarding, and account-security components remain used and unchanged.

User explicitly chose to preserve the current design and skip prototypes. Before screenshots are the unchanged visual target.

## Automated checks

- Baseline: `npm test -- src/AccountApp.test.jsx src/features/account/AccountSecurity.test.jsx` — 28 passed.
- Final: `NODE_OPTIONS=--no-experimental-webstorage npm test -- src/AccountApp.test.jsx src/features/account/AccountSecurity.test.jsx src/features/appearance/AppearanceProvider.test.jsx` — 31 passed. Covers rejected login, secret clearing, verification/resend, registration, MFA/recovery, password reset, busy controls, field errors, account security, onboarding, and appearance persistence.
- Initial final run without the Node option: 28 passed, 3 appearance tests failed before execution because Node's native localStorage shadowed jsdom storage. Disabling native experimental web storage fixed the test environment; no source/test workaround was added.
- `npm run build` — passed, 612 modules. Existing large-chunk advisory remains.
- `git diff --check` — passed.

## Chrome DevTools browser checks

The connected MCP browser profile was already in use. Ran the installed Chrome DevTools MCP server with `--isolated --headless` through a temporary local stdio client instead. This uses the same Chrome DevTools tools, not a substitute browser implementation.

Served this checkout directly with Vite at `http://localhost:5200`, forwarding API requests to the already-running local backend on port 8003. The temporary development proxy supplies that backend's configured local Origin; no production configuration changed. Existing Docker stacks were not rebuilt or stopped.

- Captured before/after login at 1440×1000 in light and dark themes, and the mobile layout at an actual 500×844 viewport (Chrome clamped the requested 390-pixel window).
- Toggled appearance; navigated to registration, back, forgot password, existing reset-code form, and back. Expected headings and form controls appeared.
- Signed in once using the supplied example account, loading its credentials directly from the local account file without printing them. POST sign-in 200; subsequent session/profile 200; My plans rendered with no horizontal overflow.
- Reloaded: session 200 and My plans returned after the loading state.
- Used Account menu → Sign out: POST sign-out 200; Welcome back and the login form returned.
- Network and console inspection: only expected signed-out session 401 and the existing Lit development-mode warning. No login/logout regression or unexpected failing request observed.
- No Plans or account settings were changed. Registration/reset/MFA submissions were exercised by existing regression tests, not against the live account.

## Visual evidence

All screenshot states were inspected; no clipping, overlap or unreadable controls. Pixel comparison: mobile image identical; desktop differences confined to the 42×42 theme button hover state, with the rest of the images identical.

| State | Before / visual target | After |
|---|---|---|
| Light desktop | [Before](plan/login-light-desktop.png) | [After](implementation/login-light-desktop.png) |
| Dark desktop | [Before](plan/login-dark-desktop.png) | [After](implementation/login-dark-desktop.png) |
| Light mobile layout | [Before](plan/login-light-mobile.png) | [After](implementation/login-light-mobile.png) |

No required check remains blocked. Existing shared Docker frontend remains unchanged; verification used this worktree's source in Vite.
