---
phase: 13-account-settings-and-travel-preferences
plan: "04"
subsystem: account-security
tags: [cognito, fastapi, encrypted-sql, react, tdd]
requires:
  - phase: 13-03
    provides: Canonical account projection and session-bound fresh verification
provides:
  - Journaled password changes without persisted credentials or automatic repeats
  - Guarded authenticator setup replacement disable and activation readback
  - Atomic recovery hash rotation with one-time plaintext disclosure
  - Selected-C security editors with secret expiry and disclosure exit guards
affects: [13-05]
tech-stack:
  added: []
  patterns: [single-use purpose-bound proof, committed operation journal, provider-stage reconciliation, one-time secret disclosure]
key-files:
  created:
    - frontend/src/features/account/AccountSecurity.jsx
    - frontend/src/features/account/AccountSecurity.test.jsx
    - services/auth/tests/test_account_security.py
    - artifacts/testing/2026-10-06-account-settings/13-04-verification.md
  modified:
    - services/auth/account.py
    - services/auth/api.py
    - services/auth/app.py
    - services/auth/cognito_adapter.py
    - services/auth/tests/test_api.py
    - services/auth/tests/test_cognito_adapter.py
    - services/auth/tests/test_session_store.py
    - frontend/src/features/account/AccountSettingsPage.jsx
key-decisions:
  - Sensitive receipts survive until original session expiry and contain no password-derived digest.
  - Provider verification, preference acknowledgement and canonical readback are distinct stages.
  - Unknown operations retain honest outcomes; subsequent enrollment requires a separate explicit fresh proof.
  - Recovery plaintext appears only in the response after atomic hash and receipt commit.
  - SDK uses a single total attempt to prevent hidden transport replay.
requirements-completed: [ACCOUNT-13-04, ACCOUNT-13-06]
requirement-scope-note: Implementation and automated verification contribution; mandatory Chrome delivery remains 13-05.
actuals:
  tokens: 23702
  tasks: 3
  commits: 11
plan_head_before: 185c877a3ec51025b4ff4a739b789fa9c1b861b9
duration: 145min observed UTC span from recorded implementation start to summary preparation
completed: 2026-10-06
status: complete
---

# Phase 13 Plan 04: Verified security settings Summary

**Password changes, staged authenticator management and atomic recovery-code rotation now use fresh session-bound verification, durable safe receipts and transient selected-C editors.**

## Accomplishments

- Password change verifies current credentials and any active factor within the signed-in session. Current/new/confirmation fields clear after terminal outcomes, cancellation, expiry and teardown. The provider receives only access/previous/proposed values; current-password and policy failures remain safe and do not sign out a valid session. Event replay and operation-status never repeat an ambiguous mutation.
- Authenticator setup accepts access-token SecretCode responses without requiring a provider Session. Replacement warns before fresh verification; activation follows successful code verification, explicit preference write and canonical GetUser readback. Disable respects required-MFA policy. Partial outcomes reconcile acknowledged readback without provider replay; unacknowledged outcomes stay unknown. Legacy signed-in enrollment URLs now require identical guarded contracts.
- Recovery rotation generates ten 128-bit codes, atomically consumes proof/replaces hashes/commits receipt, then discloses plaintext once. Concurrent replay discloses one set only. Old codes stop working, new codes consume once, unrelated subjects remain untouched and legacy code acceptance survives restart. UI supports canonical counts, real setup navigation, replacement warning, clipboard acknowledgement/failure and page-wide one-time-code exit confirmation.
- No secret values enter ordinary drafts, browser storage, URLs, logs or account/status projections. Existing SessionStore helpers provide the required atomicity without new production store APIs or schema changes.

## Task commits

1. 13-04-01: `788b395` RED; `da9bdc9` GREEN.
2. 13-04-02: `1f68090` RED; `7a18942` GREEN.
3. 13-04-03: `e116d83` RED; `bb3cd33` GREEN.
4. Assurance/readback hardening: `08d9725`.
5. Explicit recovery from uncertain enrollment: `6e1dbd5`.
6. Validation focus and lost-code/expiry regression: `8cb725f`.
7. Verification evidence: `fd545a9`.
8. Completed-stub ledger update: `ab4bfb1`.

Eleven commits measured from the persisted plan ledger before this separate summary metadata commit. Token actuals use ceil(committed diff characters/4), not harness usage. Shared STATE/ROADMAP/requirements updates remain assigned to the parent orchestrator, per dispatch ownership.

## Verification

- Final entire auth suite: **139 passed** (`uv run --locked pytest services/auth/tests -q`, 5.13 seconds).
- Final four account component suites: **30 passed**, including eight security journeys (2.01 seconds).
- Final production frontend build: **passed** (832ms); existing bundle-size warning retained.
- Each planned per-task automated command ran and passed; detailed intermediate counts and commands are in [13-04-verification.md](../../../artifacts/testing/2026-10-06-account-settings/13-04-verification.md).
- Real FastAPI handlers and encrypted SQLite established proof ownership/expiry/consumption, receipts, count readback, replay, transaction rollback, concurrent duplicate requests, changed-session rejection and no plaintext persistence. Botocore Stubber checked exact managed-identity request shapes. Provider operations were isolated fixtures; no live credential/factor mutation is claimed.
- `git diff --check` passed. Changed production files contain no TODO/placeholder implementations. Intentionally removed legacy route bodies are replaced by guarded aliases, not lost functionality.

## TDD Gate Compliance

All three tasks have committed intentional RED assertions before GREEN implementation. Each persisted RED record returned `RED_EVIDENCE_OK`; observed pytest identities/counts were explicitly adapted for the runtime's TAP-only classifier. Initial RED asserted 404 instead of intended HTTP behavior. UI's initial Password tests failed because the real editor was absent. Additional assurance and reload regressions failed for the targeted behavior before correction. No tests were skipped.

## Deviations from Plan

1. **[Rule 2 - Critical no-retry boundary]** `services/auth/app.py` configured `max_attempts: 1`, permitting one SDK retry beyond the first request. Changed to `total_max_attempts: 1` so new sensitive operations cannot silently replay. This necessary file was outside the plan list. Official Boto3 semantics are linked in the evidence. Commit `bb3cd33`.
2. **[Rule 1 - Factor assurance]** A proof minted while MFA was off could otherwise authorize an operation after it turned on. Consumption now checks current factor state and requires recorded factor verification when active. The regression first returned 200 instead of expected 403, then passed. Commit `08d9725`.
3. **[Rule 1 - Durable reconciliation]** Reload previously lacked the browser event identifier needed to repair acknowledged activation. Canonical account reads now reconcile that recorded stage without another provider mutation. Unknown enrollment can be superseded only by an explicit separately verified operation after its active window; its historic receipt stays unknown. Commits `08d9725`, `6e1dbd5`.
4. **[Rule 2 - Accessible validation]** Password mismatch focuses and describes the invalid confirmation field. Lost-disclosure and auth-expiry component coverage added. Commit `8cb725f`.
5. WINDOWS row 4's rendered table was stale relative to authoritative JSON from a prior plan. Regenerated the table using the runtime renderer, then `windows fixed 4` succeeded. Other entries remain untouched. Commit `ab4bfb1`.

## Delivery limits and next plan

No implementation stubs remain; WINDOWS entry 4 is fixed. **Mandatory production Chrome checks/screenshots are still unverified and remain open in WINDOWS entry 3 for plan 13-05.** Selected-C before-state captures remain linked in the verification record. This summary marks the three implementation tasks complete, not full frontend delivery.

Email initiation remains safely unavailable under the existing pool configuration. The earlier signed-out recovery path remains unchanged and not live validated. The pre-existing broad frontend failures remain in the existing deferred-items record; no full frontend-suite pass is claimed. No new cloud/IAM resources, provider settings, dependencies, tables or shared-account security mutations occurred. No unplanned security surface beyond the documented account boundaries was introduced.

## Self-Check: PASSED

New component, tests, three RED evidence records and detailed verification file exist. All eleven listed commits exist. The worktree branch remains the parent-created `agent-account-security`, based on `185c877`. Source/test/evidence changes are committed; only parent-owned ignored/runtime state is left outside this plan's commits. Parent will fast-forward the feature branch before plan 13-05 and owns the shared planning progress updates.
