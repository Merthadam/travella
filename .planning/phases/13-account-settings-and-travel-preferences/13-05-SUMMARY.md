---
phase: 13-account-settings-and-travel-preferences
plan: "05"
subsystem: account-verification
tags: [postgresql, concurrency, chrome-devtools, evidence]
requires:
  - phase: 13-04
    provides: Complete account preference, identity and security implementation
provides:
  - Actual PostgreSQL HTTP concurrency and independent Auth-store recovery proof
  - Real authenticated selected-C browser journeys and seven inspected screenshots
  - Safe handling of unrelated legacy session ciphertext during account scans
affects: [phase-13-verification]
tech-stack:
  added: []
  patterns: [guarded disposable database, private revision-checked restoration, explicit simulated transport evidence]
key-files:
  created:
    - services/crud/tests/test_account_postgres.py
    - artifacts/testing/2026-10-06-account-settings/13-05-red.json
    - artifacts/testing/2026-10-06-account-settings/implementation/account-save-reload.png
  modified:
    - services/auth/session_store.py
    - services/auth/tests/test_session_store.py
    - services/crud/tests/conftest.py
    - artifacts/testing/2026-10-06-account-settings/verification.md
    - .planning/phases/13-account-settings-and-travel-preferences/13-VALIDATION.md
    - .planning/phases/13-account-settings-and-travel-preferences/deferred-items.md
    - .planning/WINDOWS.md
key-decisions:
  - Preserve unrelated unreadable legacy ciphertext while excluding it from current-key account scans.
  - Sensitive success remains isolated provider-fixture evidence; shared account security is read-only.
  - Broad baseline failures remain visible separately from passing account-specific delivery gates.
requirements-completed: [ACCOUNT-13-01, ACCOUNT-13-02, ACCOUNT-13-03, ACCOUNT-13-04, ACCOUNT-13-05, ACCOUNT-13-06]
actuals:
  tokens: 10983
  tasks: 2
  commits: 3
plan_head_before: 668325c31d3ce685dc84f09732c4d5421fb416d3
duration: 16min
completed: 2026-10-06
status: complete
---

# Phase 13 Plan 05: Account SQL and Chrome verification Summary

**PostgreSQL concurrency, real example-account save/reload/restoration, selected-Plan navigation and seven inspected screenshots now establish the account delivery gate.**

## Accomplishments

- Concurrent profile HTTP writes serialize the first absent-row save, enforce revisions, return identical replay receipts, isolate subjects and leave Plan snapshots unchanged.
- Two independent PostgreSQL-backed Auth stores concurrently rotate recovery codes with one disclosure/receipt, encrypted storage, old-code invalidation, one-use new codes and foreign-subject rejection.
- The rebuilt local app passed authentication and four source/container hash comparisons. Chrome exercised all nine settings, ordinary Save/Cancel/clear/reload, dirty guards, pending/error/conflict/unknown outcomes, Plan return/history, both themes, mobile selection, 320px overflow and native modal keyboard behavior.
- Temporary preferences were restored with current revision guards. All original fields/onboarding matched afterward. All five Plan/brief snapshots stayed exactly unchanged during preference saves; opening a Plan later uses its normal activity bookkeeping.
- Seven final screenshots were individually opened and visually inspected. Evidence contains synthetic preferences and a masked email only. The disposable test database was removed; application volumes and shared identity/security stayed intact.

## Task commits

1. `55b5f9a` — RED regression for mixed-key account reconciliation.
2. `eae334e` — Task 13-05-01 PostgreSQL concurrency, legacy-session fix and regression evidence.
3. `cfbaa3b` — Task 13-05-02 inspected Chrome evidence, validation and defect-register updates.

Three commits measured from the persisted ledger before this separate summary commit. Token actuals are ceil(realized committed diff characters/4), including textual binary-file notices; they are not harness tokens. Duration is the observed UTC span from 17:27:14 to summary preparation, rounded to minutes.

## Verification

- New isolated PostgreSQL account tests: **2 passed**. Final targeted PostgreSQL + SessionStore regression after the live-login fix: **6 passed**.
- Full prescribed Python selection: **203 passed, 2 failed, 1 error**. Failures are unchanged Plan-delete confirmation and stale migration-head expectations; migration-test environment interaction trips the subsequent database guard. Standalone constraints also has a pre-existing DataError-versus-IntegrityError expectation. Details remain in deferred-items.md.
- Full frontend suite: **48 passed, 17 failed**, with seven old missing-researchContext mock errors. This includes the previously known 12 route/Plan failures and five additional unchanged PlanConversation/TripBrief tests. No full-suite pass is claimed.
- Production frontend build: **passed**, existing bundle warning retained.
- Read-only Cognito precheck, rebuilt local sign-in/session/sign-out check, and all four source hashes: **passed**.
- Required real Chrome gate and exact seven-artifact check: **passed**. Final console inspection found no errors; only the existing Lit development-mode warning. Relevant fetch/XHR requests were successful. Pending/422/409 and response loss were explicitly simulated, with a real committed preference save reconciled by identical-event replay.

See [the complete verification record](../../../artifacts/testing/2026-10-06-account-settings/verification.md), [desktop](../../../artifacts/testing/2026-10-06-account-settings/implementation/account-desktop-light.png), [mobile](../../../artifacts/testing/2026-10-06-account-settings/implementation/account-mobile-dark.png), [save/reload](../../../artifacts/testing/2026-10-06-account-settings/implementation/account-save-reload.png), and [preserved planning evidence](../../../artifacts/testing/2026-10-05-account-prototypes/verification.md).

## TDD Gate Compliance

The new concurrency tests verify already implemented behavior and passed on first valid execution; no artificial RED was manufactured. Real startup exposed a new regression. Its targeted assertion failed, `13-05-red.json` received `RED_EVIDENCE_OK`, the failing test was committed, and the narrow fix passed both automated tests and live startup.

## Deviations from Plan

1. **[Rule 3 — Blocking test isolation]** The existing PostgreSQL cleanup fixture omitted `research_contexts`, causing the next migration to fail with DuplicateTable. Added that table to the existing guarded cleanup list. No application database was touched. Commit `eae334e`.
2. **[Rule 1 — Live login regression]** New account reconciliation decrypted all session rows, so unrelated legacy ciphertext encrypted under another key produced HTTP 500 during real login. Account scans now catch InvalidToken for unrelated rows and preserve their exact ciphertext. Valid current-key sessions still reconcile; recovery-row behavior and keys are unchanged. Files: SessionStore and its regression test. Commits `55b5f9a`, `eae334e`.
3. **[Verification environment]** The default Chrome profile was already occupied. Used the same installed Chrome DevTools MCP server's isolated profile, without killing the user's browser. A temporary host-to-container TCP bridge let existing locked host pytest tooling access the dedicated database; no package install was needed.

## Limits and deferred issues

No production stubs or skipped account tests remain. WINDOWS entry 3's browser gate is fixed; entries 5/6 retain broad baseline test debt. `wave_0_complete` is true; `nyquist_compliant` stays conservatively false while those full-suite failures remain.

Live email changes remain correctly unavailable under the existing unsafe pool policy. Successful identity/password/factor/recovery mutations were tested with isolated provider fixtures and real HTTP/encrypted SQL, never the shared example account. Earlier signed-out recovery remains unchanged and unverified. No cloud/IAM changes, key changes, dependency installation, new endpoint or unplanned trust boundary was introduced.

Shared STATE.md, ROADMAP.md and requirements updates remain assigned to the parent orchestrator by dispatch ownership. This executor updated the plan validation, evidence, summary and relevant WINDOWS entries only.

## Self-Check: PASSED

The PostgreSQL test, RED record, verification record and all seven screenshot files exist. Every screenshot was opened and inspected after final capture. All three listed commits exist; `git diff --check` passed and no tracked-file deletion occurred. The worktree remains on `agent-account-verification` at the intended root. Only the parent-owned `.gsd/` and milestone lock remain outside this plan's commits.
