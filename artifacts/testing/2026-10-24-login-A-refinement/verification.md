# Login A refinement — 2026-10-24

Scope: user selected A for another design iteration. Refined the dev-only prototype; production authentication handlers and APIs are unchanged. Prototype capture branch: `prototype/login-A-refinement-20261024`.

## Design decisions

- Keep A's split story/form composition. Add navy, teal and mint night palette, system-preference default and accessible sun/moon toggle. Explicit theme choice is shareable in the URL; no account data enters URLs/storage.
- Remove the form eyebrow, submit arrow, decorative success badge and separate initial verification panel. Use inline field feedback and quiet status text.
- Keep Forgot password beside Password. Recovery is email → neutral inbox confirmation → existing code/new-password form → sign-in. Retain direct reset-code entry, retry and return paths.
- Show verification after registration and as a contextual action following sign-in failure or receiving a sign-up code during recovery. Preserve resend and email editing. Retain email in memory across steps; passwords/codes are cleared.
- Real backend inspection: `/auth/sign-in` returns a generic failure, not an unverified-account state; `/auth/forgot-password` can resend registration confirmation. The prototype respects these distinctions and does not imply account detection.

## Reference research

- [GitHub sign-in](https://github.com/login) places recovery next to Password.
- [GitHub password reset](https://github.com/password_reset) and [credential documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/updating-your-github-access-credentials) use an email-first recovery step followed by emailed instructions. This informed the hierarchy; Travella retains its existing reset-code mechanism.
- [Slack recovery documentation](https://slack.com/help/articles/201909068-Reset-your-password) describes email-code access before updating a password. It was comparison material, not a replacement for Travella authentication.

## Executed checks

Chrome DevTools CLI used the existing isolated login-redesign tab at localhost:5189; MCP shared-profile contention from the preceding task remains the reason for this DevTools CLI fallback.

- Desktop 1440×1000 and mobile 390×844: light/night screens, sign-in error, recovery, inbox confirmation, reset, verification/resend and registration visually inspected. No horizontal overflow. Longer forms scroll above the prototype controls.
- Simulated sign-in success/failure; accessible inline error linked with aria-describedby/aria-invalid and role=alert; contextual verification action.
- Recovery request loading disables the fieldset and sets aria-busy; neutral confirmation → code entry → password-updated sign-in state.
- Registration has all four fields; verification/resend, changing email and returning to sign-in passed. Email remains editable and survives step transitions without re-entry.
- MFA challenge → recovery code → replacement authenticator → recovery codes → simulated completion passed.
- Night mode URL choice survives reload; OS dark preference honored without an override. Shared B/C forms pass mobile overflow and simulated submission smoke checks.
- Console: no application errors on the final check; existing Lit development-mode warning only. Network: no `/auth/` or `/v1/` requests.
- `npm run build` (frontend): passed; existing >500 kB chunk advisory.
- `git diff --check`: passed.

Browser driver: `/tmp/travella-A-check.py`; final output `/tmp/travella-A-results.txt`. Early browser run loaded a stale development module; reload and rerun passed. Native input setters/events were used in the final harness so email retention exercises React state rather than only setting DOM values.

## Evidence

[Before](plan/before-desktop.png) · [Day desktop](plan/A-day-desktop.png) · [Night desktop](plan/A-night-desktop.png) · [Inline error](plan/A-night-error.png) · [Recovery](plan/A-night-recovery.png) · [Inbox confirmation](plan/A-night-inbox.png) · [Reset](plan/A-night-reset.png) · [Verification](plan/A-night-verification.png) · [Day mobile](plan/A-day-mobile.png) · [Night mobile error](plan/A-night-mobile-error.png) · [Mobile recovery](plan/A-night-mobile-recovery.png) · [Mobile reset](plan/A-night-mobile-reset.png) · [Mobile registration](plan/A-night-mobile-registration.png).

## Limits

This is a design prototype, not production implementation. All account actions are simulated and visibly labeled. No real password/MFA/account changes or authenticated journey tests were performed. No new unit tests for throwaway UI; production auth regression tests are deferred to implementation. No push, deploy or shared-stack restart.
