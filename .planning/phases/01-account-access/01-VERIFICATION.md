---
phase: 01
slug: account-access
status: blocked
verified: 2026-09-27
---

# Phase 1 Verification — Account Access

## Local verification

- `bash scripts/check.sh`: passed — 52 Python tests, 9 React tests, lint/format checks, and frontend production build.
- Docker Compose startup: passed — `auth` healthy, frontend reachable on port 5173, `/health` returns `status: ok` and `auth_configured: false`.
- Chrome browser checks: passed — account screen, registration/recovery screens, safe unavailable-provider response, and no credential/private-content disclosure.
- Private boundary negative check: passed — unauthenticated `/private/probe` is rejected with a non-cacheable safe response.

## Blocking verification gaps

The phase cannot be marked complete until a configured Cognito test pool is available. The following require live provider behavior rather than the offline-safe local mode:

- registration email verification and unverified-account gating;
- configured invalid-credential behavior;
- TOTP challenge/enrollment and one-time recovery-code replacement;
- password reset delivery and active-session invalidation;
- authenticated private access, refresh, and sign-out;
- narrow-layout recovery-code disclosure review against a complete MFA journey.

No AWS credentials or Cognito pool configuration were supplied, so these checks remain blocked rather than inferred from local contract tests.
