---
phase: 01
slug: account-access
status: in_progress
started: 2026-09-27
source: 01-VALIDATION.md, 01-EXECUTION-CHECKPOINT.md
---

# Phase 01 — Account Access UAT

Conversational acceptance checks for the implemented Python auth service and React frontend.
Each check is confirmed by the user in sequence. Automated test evidence remains in
`01-VALIDATION.md`; this artifact records manual and live behavior only.

## Tests

### UAT-01 — Local account screen loads
- **Status:** passed
- **Evidence:** User confirmed the local account screen appears as expected.
- **Steps:** Open `http://localhost:5173`.
- **Expected:** Travella displays the “Welcome back” sign-in screen with email, password, and a primary Sign in action.

### UAT-02 — Honest unconfigured-provider behavior
- **Status:** passed
- **Evidence:** Chrome test submitted valid-shaped test credentials and displayed “Account access is not configured yet.” without exposing credentials or private content.
- **Steps:** Submit sign-in while local Cognito configuration is intentionally absent.
- **Expected:** The UI shows a safe unavailable message; no token, password, or provider credential is displayed or echoed.

### UAT-03 — Registration and verification gate
- **Status:** blocked
- **Evidence:** Chrome confirmed the registration stepper and fields render. Completing provider-backed registration/verification requires Cognito configuration.
- **Steps:** Walk registration and confirmation with a test account (or inspect the flow if provider configuration is unavailable).
- **Expected:** Registration leads to confirmation; an unverified account cannot reach a private authenticated screen.

### UAT-04 — Invalid sign-in does not disclose account state
- **Status:** pending
- **Steps:** Submit an invalid email/password combination against a configured test provider.
- **Expected:** A generic error is shown, password input is cleared, and no private plan content appears.

### UAT-05 — MFA challenge and enrollment
- **Status:** pending
- **Steps:** Sign in with an MFA-enabled account; then complete enrollment with a TOTP authenticator.
- **Expected:** Sign-in pauses at the MFA challenge; enrollment requires a valid six-digit code and displays recovery codes only once.

### UAT-06 — Recovery code requires authenticator replacement
- **Status:** pending
- **Steps:** Choose recovery-code sign-in, submit a valid one-time code, then enroll and verify a replacement authenticator.
- **Expected:** Recovery never grants normal private access before replacement verification; reused codes fail.

### UAT-07 — Password reset and session invalidation
- **Status:** pending
- **Steps:** Request a reset, complete it with a valid code/new password, and try an existing session.
- **Expected:** The request is neutral; reset returns to sign-in and existing sessions are invalidated.

### UAT-08 — Private boundary and sign-out
- **Status:** pending
- **Steps:** Request `/private/probe` before and after authentication, then sign out and retry.
- **Expected:** Unauthenticated access is rejected; authenticated access returns only the token-derived traveler result; sign-out removes access.

### UAT-09 — Responsive and recovery-code disclosure review
- **Status:** pending
- **Steps:** Walk account, recovery, and MFA screens at desktop and narrow viewport widths; navigate back/reload after displaying recovery codes.
- **Expected:** Each step has one clear primary action and visible errors; recovery codes are not redisplayed after acknowledgement/navigation.

### UAT-10 — Live Cognito verification
- **Status:** pending
- **Steps:** Repeat the applicable flows against deployed Cognito configuration.
- **Expected:** Cognito issuer/signature/audience/token-use/expiry checks and real MFA/recovery semantics behave as documented.
- **Note:** Blocked until AWS/Cognito configuration is supplied.

## Summary

- Total: 10
- Passed: 2
- Issues: 0
- Blocked: 1
- Last updated: 2026-09-27
