# Phase 1 Research: Account Access

**Date:** 2026-09-26
**Status:** Complete (inline fallback because the subagent runtime was unavailable)

## Planning question

What must be known to implement Travella's private account boundary without weakening
email verification, MFA, recovery privacy, session limits, or token-derived ownership?

## Locked product constraints

- Registration collects first name, last name, email, and password, then uses a dedicated verification step.
- Email verification gates all private Plans and Conversations.
- Authenticator-app MFA is optional at enrollment, but recovery-code sign-in must force authenticator replacement before private access.
- Recovery codes are shown once, may be copied/downloaded, are never emailed, and replacement invalidates the old set immediately.
- Recovery uses a neutral response for unknown, unverified, and eligible addresses; reset never creates a session.
- Access tokens are short-lived and silently refreshed only until 30 days from the last full sign-in.
- Failed refresh, expiry, or revocation clears private browser state and returns to sign-in; only a safe internal return destination may survive involuntary re-authentication.
- Deliberate sign-in, verification, and ordinary sign-out land at My plans.
- Every public service validates the managed token independently and derives ownership from token claims, never a browser-supplied traveler ID.

## Identity-provider flow findings

1. Cognito User Pools should remain the password and verification authority. The browser-facing Travella UI can call a server-side auth adapter or a supported Cognito client SDK, but Cognito operations must not be reimplemented in Travella.
2. Registration needs a `SignUp`/equivalent operation with first/last name attributes, email, and password, followed by `ConfirmSignUp`. The UI must treat an unconfirmed account as a verification state, not an authenticated session.
3. Resend verification must be idempotent from the user's perspective and must retain the same neutral privacy posture. Verification links/codes are secrets and must never enter logs, URLs owned by Travella, checkpoints, or browser persistence.
4. Password recovery needs a neutral request step followed by Cognito's reset challenge and confirmation. The UI must not distinguish unknown, unverified, throttled, or eligible addresses in its initial response. An unverified address follows the product's verification-message path.
5. Software-token MFA uses Cognito's associate/verify software-token flow. Enrollment is incomplete until the authenticator code is verified; Travella should persist only the provider's enrollment state and safe recovery-flow state, never the shared secret or entered code.
6. Cognito's normal MFA challenge and recovery-code path must be wrapped in Travella's state machine. A successful recovery-code challenge is not a terminal success: it enters `replace_authenticator_required` and blocks My plans until replacement setup and one-time recovery-code acknowledgement complete.

## Session and token findings

- Public services must validate signature against the Cognito JWKS, issuer, expiry, token use (`access`), client/audience constraints appropriate to the configured app client, and required scopes before authorization.
- The authoritative traveler key is the validated token subject (`sub`) mapped by the service. Request bodies and route parameters may identify a Plan/resource, but never the traveler owner.
- Refresh must be modeled as a bounded client session: store the full-sign-in timestamp separately from short-lived access-token expiry, stop refresh at 30 days, and clear tokens/private projections on refresh failure.
- Deliberate sign-out clears the browser's local auth state and stops refresh. If provider-side revocation/global sign-out is used, it must not be confused with the product's current-browser-only semantics.
- Password reset must trigger account-wide session invalidation through the chosen Cognito operation/adapter and force a new full sign-in. Add an integration test proving an old refresh path cannot reopen private data.
- Return destinations must be an internal route plus safe route parameters only. Re-authorize the destination after sign-in and fall back to My plans for deleted, foreign, malformed, or unavailable resources.

## UI/state-machine implications

Use explicit states rather than inferring progress from form fields:

`register` → `verify_email` → `mfa_offer` → `recovery_codes_review` (if enabled) → `signed_in`;
`sign_in` → `mfa_challenge` → `signed_in`;
`mfa_challenge` → `recovery_code_challenge` → `replace_authenticator_required` → `recovery_codes_review`;
`forgot_password_email` → `neutral_confirmation` → `reset_password` → `sign_in`.

Safe state may include names, email, step, internal return route, and non-secret error/display
metadata. Passwords, MFA codes, reset tokens, Cognito secrets, recovery codes, and raw provider
responses must be memory-only and re-entered after interruption.

## Service and testing implications

1. Create a shared token-validation contract and use it in every public service boundary; test issuer, signature, expiry, token use, client, scope, and subject extraction.
2. Add ownership tests for every private-resource handler: valid token + own resource succeeds; valid token + foreign resource is indistinguishable from unavailable; missing/invalid/expired token is rejected.
3. Add browser-flow tests for verification gating, generic sign-in error, neutral recovery response, recovery-code replacement, 30-day refresh cutoff, failed refresh redirect, deliberate sign-out landing, and safe internal return.
4. Add contract tests for idempotent resend/recovery requests and one-time recovery-code/replacement behavior.
5. Keep provider/client configuration behind environment-backed adapters. Do not commit pool IDs, client secrets, verification secrets, or test-user credentials.
6. Observability should emit redacted event names/request IDs only. Never log access/refresh tokens, passwords, MFA/recovery codes, reset links, full email addresses, or private resource payloads.

## Risks and open decisions for implementation

- Final frontend/backend framework and repository layout are not selected yet.
- The exact Cognito app-client flow (hosted UI versus SDK/API adapter), token storage mechanism, and refresh transport need an implementation decision before coding.
- The 30-day bound is a Travella policy layered over provider refresh-token validity; tests must assert the product bound independently.
- Exact account-wide session invalidation API and provider propagation timing need a live Cognito integration test.
- MFA recovery when both authenticator and recovery codes are lost remains explicitly out of scope.

## Sources

- `docs/user-stories/login/README.md`
- `.planning/phases/01-account-access/01-CONTEXT.md`
- `.planning/research/STACK.md`
- `.planning/research/PITFALLS.md`
- `docs/planning/mvp-phase-1-service-contracts.md`
- AWS Cognito access-token documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- AWS Cognito MFA documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- AWS Cognito security documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html

## Validation Architecture

- Unit: pure auth-state transitions, safe-return sanitization, refresh-age calculation, and token-claim validation decisions.
- Contract: Cognito adapter request/response mapping and public-service authorization middleware.
- Integration: real or local Cognito test pool covering confirmation, TOTP, reset, refresh cutoff, and session invalidation.
- Browser E2E: registration, verification gate, sign-in/MFA, recovery, sign-out, failed refresh, and safe return.
- Security: negative tests for enumeration, token leakage, browser-supplied owner IDs, open redirects, and recovery-code reuse.

## RESEARCH COMPLETE
