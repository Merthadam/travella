---
phase: 13-account-settings-and-travel-preferences
plan: "03"
subsystem: account-identity
tags: [cognito, fastapi, encrypted-sql, react, tdd]
requires:
  - phase: 13-02
    provides: Selected-C account page and guarded preference editors
provides:
  - Canonical account/name reads and acknowledged name mutation
  - Purpose/session/subject-bound fresh verification with existing TOTP
  - Fail-closed conditional email workflow and durable reconciliation
  - Canonical login/reset/session/recovery email indexes
affects: [13-04, 13-05]
tech-stack:
  added: []
  patterns: [encrypted operation journal, subject advisory guard, provider readback, transient verification proofs]
key-files:
  created:
    - services/auth/account.py
    - services/auth/tests/test_account.py
    - frontend/src/features/account/AccountIdentity.jsx
    - frontend/src/features/account/AccountIdentity.test.jsx
  modified:
    - services/auth/api.py
    - services/auth/cognito_adapter.py
    - services/auth/session_store.py
    - frontend/src/features/account/AccountSettingsPage.jsx
key-decisions:
  - Fail closed on absent unsafe or unreadable email capability; no cloud changes.
  - Commit encrypted intent before provider operations; repair exact canonical success without repeating writes.
  - Serialize canonical session creation and refresh with account reconciliation, acquiring subject guard before SQL transaction.
  - Keep sensitive verification within current session and never invoke public sign-in for step-up.
requirements-completed: [ACCOUNT-13-03, ACCOUNT-13-04, ACCOUNT-13-06]
requirement-scope-note: Implementation contribution only; security mutations and Chrome/full-phase delivery remain 13-04/05.
actuals:
  tokens: 24593
  tasks: 3
  commits: 8
plan_head_before: dd4c7cfc66d8fcf914da2c256e6ae52f46305800
duration: 13min observed from implementation timer initialization to summary preparation
completed: 2026-10-06
status: complete
---

# Phase 13 Plan 03: Canonical personal details and conditional email Summary

**Cognito-backed names and exact verified-email transitions now use encrypted operation journals, session-bound fresh verification and retryable canonical reconciliation.**

## Accomplishments

- Added explicit account projection, provider configuration probes with bounded management-client timeouts and short cache, real MFA/recovery read summaries, allow-listed name edits, expected-name conflict checks, event replay protection and canonical acknowledgement. Selected C renders canonical initials/name and a guarded editor; preferences remain usable when account operations are unavailable.
- Added five-minute, original-session-expiry-bounded password/TOTP proofs. Same-subject token validation, purpose/session binding, one-use consumption and temporary token revocation prevent cross-account authorization or session replacement.
- Safe provider fixtures exercise persisted pending email, resume/resend/verify, exact verified new address and local reconciliation. Unsafe/missing/denied pool configuration refuses before any provider write. Unknown results retain encrypted intent; no repeated identity mutation is implied by retry.
- Reconciled all subject session emails and recovery row/encrypted payload copies while preserving hashes and expiry. New sign-ins use canonical provider email, reset repairs pending indexes, and session creation/refresh serialize with account mutations. Real concurrent HTTP tests demonstrate one email writer and no stale email recreation during login.

## Task commits

1. 13-03-01: `c288124` RED; `deb5f3c` GREEN.
2. 13-03-02: `b432f8c` RED; `6fb4254` GREEN.
3. 13-03-03: `b3c79c1` RED; `6aef6ed` GREEN.
4. Concurrency hardening: `158070f` canonical session creation; `ac63be6` refresh serialization.

Eight commits measured from the persisted plan ledger before this metadata commit. Actual tokens are ceil(committed diff characters / 4): 98,370 / 4, not model usage. Shared STATE/ROADMAP/requirements updates remain assigned to the orchestrator.

## Verification

- Expanded six-file backend regression: **87 passed** in 4.14 seconds before final refresh locking.
- Final exact task-3 command after refresh locking: **70 passed** in 2.73 seconds.
- Three account frontend suites: **22 passed**, 1.98 seconds.
- Production frontend build: **passed**, 852ms; existing bundle-size warning remains.
- `git diff --check`: passed. New SDK read/name/email request shapes pass botocore Stubber validation.
- HTTP tests use actual FastAPI handlers and encrypted SQL with synthetic provider fixtures. Tests cover lifecycle/readback, invalid inputs, ownership/session/purpose boundaries, stale/replayed events, wrong subject/factor/readback, local failure after provider success, restart, expiry and concurrent requests. Provider fixtures do not establish live Cognito mutation success.
- Full evidence: [13-03-verification.md](../../../artifacts/testing/2026-10-06-account-settings/13-03-verification.md). Chrome acceptance and screenshots remain the explicit 13-05 gate. No full frontend-suite pass is claimed.

## TDD Gate Compliance

All three tasks have intentional assertion failures committed before GREEN and their persisted records return `RED_EVIDENCE_OK`. Validator TAP summaries are adapted from observed pytest assertions. An initial task-3 response-cookie fixture ambiguity was corrected before accepting RED evidence. Two final race corrections augment task-3 behavior and retain passing regression coverage.

## Deviations from Plan

- [Rule 2 - Required integration] Updated account-profile fixture outside the listed files to provide real canonical email attributes now required at sign-in. Preference component tests now distinguish the new account GET from PATCH writes. No assertions about write suppression were weakened.
- [Rule 1 - Bug] Canonical session creation and refresh could recreate an old local email during concurrent completion. Both now acquire the same subject guard; sign-in/MFA completion call sites finish initial challenge deletion before acquiring the guard, preserving lock order and one-use challenge semantics. Commits `158070f`, `ac63be6`.
- Existing API test clock occasionally landed just below a SQL microsecond-rounded expiry. Changed its fixture instant to integer seconds; the session expiry contract is unchanged.

## Known Stubs and Delivery Limits

- `frontend/src/features/account/AccountSettingsPage.jsx:150` and `services/auth/account.py:146`: security editors and mutation capabilities intentionally remain unavailable until 13-04. WINDOW entry 4 is narrowed to these remaining security controls. Name and conditional email editors are implemented.
- Current documented live email-before-update policy is unsafe. Live activation is blocked; no provider configuration or IAM changes were made. This plan did not re-probe the live deployment.
- WINDOWS entry 3 retains mandatory Chrome checks. No new production screenshots, local container rebuild or live shared-account mutation was performed here. PostgreSQL advisory-lock integration belongs to 13-05; this plan's concurrent HTTP tests use encrypted SQLite under its single-worker constraint.
- Signed-out recovery's existing live assurance debt remains unchanged. Prior unrelated frontend failures remain documented. No new dependencies, cloud resources or credential disclosures.

## Next plan integration

`app.state.account` provides AccountService context/user/output, record/receipt, owned_record/consume_proof and provider_failure helpers. Call consume_proof under store.account_guard; keep provider calls outside SQL rollback semantics and commit journal stages explicitly. Security capabilities and policy are intentionally conservative until 13-04 wires real operations. Existing cookie/CSRF/body/rate middleware stays in place.

## Self-Check: PASSED

All four new implementation/test files, three RED evidence records and verification file exist. All eight task/fix commits exist. Working changes outside this plan (root ROADMAP and runtime files) are preserved. Final metadata commit follows this self-check; orchestrator performs shared progress updates.
