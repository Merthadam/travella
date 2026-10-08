---
phase: 13-account-settings-and-travel-preferences
plan: "01"
subsystem: account
tags: [react, fastapi, sqlalchemy, tdd, navigation, idempotency]
requires:
  - phase: existing-auth-and-onboarding
    provides: Cookie gateway, independently verified CRUD identity, profile schema and SQL repository
provides:
  - Production Account route with acknowledged needs saves through Auth and CRUD to SQL
  - Selected-C settings layout, device theme, guarded draft/history lifecycle and preserved Plan instance
  - Captured account prototype removed from production entry and retained on its branch
affects: [13-02, 13-03, 13-04, 13-05]
tech-stack:
  added: []
  patterns: [independent account receipts, memory-only drafts, same-attempt reconciliation, hidden-inert Plan preservation]
key-files:
  created:
    - services/auth/tests/test_account_profile.py
    - frontend/src/features/account/AccountSettingsPage.jsx
    - frontend/src/features/account/AccountSettingsPage.test.jsx
    - frontend/src/features/account/account.css
  modified:
    - services/crud/profile_schemas.py
    - services/crud/profile.py
    - services/crud/api.py
    - services/crud/app.py
    - services/auth/api.py
    - services/auth/crud_client.py
    - frontend/src/AccountApp.jsx
    - frontend/src/PlansApp.jsx
key-decisions:
  - Account sections use private account receipts independent of onboarding events; onboarding is preserved exactly.
  - Keep PlansApp mounted in a hidden inert wrapper during Account navigation; history restores guarded positions.
  - Unknown ordinary saves replay the same attempt and read back current details before another write.
  - Preserve pre-existing test failures as explicit debt; final Chrome proof belongs to 13-05.
requirements-completed: [ACCOUNT-13-01, ACCOUNT-13-02, ACCOUNT-13-06]
requirement-scope-note: These IDs track this plan's contribution only; full section coverage and browser delivery remain later plans.
coverage:
  - id: needs-sql-tracer
    description: Token-owned section save/replay/clear preserves unrelated data and onboarding
    requirement: ACCOUNT-13-02
    verification:
      - kind: integration
        ref: services/auth/tests/test_account_profile.py
        status: pass
    human_judgment: false
  - id: account-route-and-guard
    description: Selected-C account route, theme, guarded navigation and retained Plan
    requirement: ACCOUNT-13-01
    verification:
      - kind: automated_ui
        ref: frontend/src/features/account/AccountSettingsPage.test.jsx
        status: pass
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-06-account-settings/verification.md
        status: unknown
    human_judgment: true
    rationale: Chrome desktop/mobile visual and full persistence journey remains the explicit 13-05 gate.
actuals:
  tokens: 34548
  tasks: 3
  commits: 5
plan_head_before: 49e6d5260ec0f53a0bd61f3c416afd65f6908365
duration: 411min elapsed between first task commit and summary preparation
completed: 2026-10-06
status: complete
---

# Phase 13 Plan 01: Authenticated Account needs and guarded navigation Summary

**A production Account needs editor saves through the cookie gateway to token-owned SQL with independent receipts, guarded history and preserved Plan state.**

## Accomplishments

- Added the strict PATCH section contract, transactional normalized digest/replay receipt retention, revision conflicts, safe public projection and real Auth-to-CRUD HTTP/SQL tests.
- Implemented selected C with responsive grouped navigation, scoped light/dark appearance, saved-only summaries, optional clearing, dirty confirmation and native unload protection. Unknown results preserve/replay the same UUID/revision/payload; revision conflicts require explicit latest-detail review. Expiry hides private state and ignores late responses.
- Account navigation no longer begins MFA enrollment. The Plan component remains mounted but hidden/inert; selected Plan and unsent composer are preserved. Direct entry and repeated Back/Forward are covered.
- Removed only the two authorized account prototype files, npm preview script and preview entry. Prototype source and all planning captures remain retained.

## Task Commits

1. **13-01-01 needs tracer:** `1f414a1` RED; `d01314b` GREEN.
2. **13-01-02 navigation/theme/draft protection:** `a2cfdcb` RED; `69eabcc` GREEN.
3. **13-01-03 prototype cleanup:** `473641b`.

The five commits above were measured from the persisted plan ledger before the separate metadata commit. Token actuals use realized diff characters/4 at that same point, not model usage.

## Verification

- `uv run --locked pytest services/auth/tests/test_account_profile.py services/crud/tests/test_api.py -q`: **34 passed**; reran after the tracer commit before expansion.
- `npm --prefix frontend test -- src/features/account/AccountSettingsPage.test.jsx`: **11 passed**.
- Focused AccountApp route/bootstrap: **2 passed**; Plan suspension: **1 passed**.
- Full requested three-file frontend command: **21 passed, 12 pre-existing failures**. All failures reproduced at original commit `49e6d526` in an independent archived checkout. See deferred-items.md. No full-suite pass is claimed.
- `npm --prefix frontend run build`: **passed**, including after prototype cleanup; existing bundle-size warning remains.
- Prototype branch source checks and `git diff --check`: **passed**.
- Evidence: [verification record](../../../artifacts/testing/2026-10-06-account-settings/verification.md). Browser verification is **pending 13-05**; no production screenshots are claimed.

## TDD Gate Compliance

Both behavior tasks wrote and ran failing tests before production edits, committed RED, then implemented GREEN. Persisted RED records passed `check tdd-red-evidence`. Vitest TAP-flat results needed summary comments derived from actual result lines because the GSD validator parses Node-style TAP counts. No refactor-only commit was necessary.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] New section validation used the generic error code.** Added a route-specific `invalid_profile` mapping in services/crud/app.py, outside the original file list but required by the new interface. The HTTP invalid-input cases pass. Commit `d01314b`.
2. **[Rule 1 - Bug] SQLite normalized timestamps after the captured response.** Flush/refresh the new section write before recording its response so GET and replay match exactly. No additional transaction or changed onboarding behavior. Commit `d01314b`.

### Execution coordination

Sequential dispatch was pinned to the supplied root and feature/account-settings after the orchestrator's isolation negotiation. Root/branch assertions preceded edits and commits. Shared STATE/ROADMAP/requirements updates are owned by the orchestrator, per dispatch, to preserve existing debt. No untracked orchestrator .gsd/ or milestone lock files were modified.

## Known Stubs

`frontend/src/features/account/AccountSettingsPage.jsx:145`: identity/security rows deliberately display a load-unavailable state until 13-03/13-04. Home/citizenship/interests are read-only pending 13-02. These planned later slices have no fake successful operation and do not block this plan's needs tracer. Recorded in WINDOWS.md for resolution by the relevant plans.

## Deferred Issues

- Twelve pre-existing frontend failures: five AccountApp legacy onboarding fixtures/journeys; seven PlansApp mocks missing researchContext. The directly affected enrollment-shortcut test was replaced with the new route contract and passes. Full details in deferred-items.md and verification.md.
- Required Chrome save/reload, layout/theme, Plan-return and console/network evidence remains the explicit 13-05 gate. WINDOWS.md tracks it as open.
- No shared-account credential/email/MFA changes or cloud changes were performed.

## Next Plan Readiness

13-02 can extend AccountSectionMutation/save_section and the single active editor. Preserve receipt semantics and onboarding state. 13-03/13-04 replace unavailable identity/security rows. 13-05 must complete real Chrome evidence and retain the baseline regression debt honestly.

## Self-Check: PASSED

All four created source/test files, both RED records, verification record and this summary exist. All five listed task commits exist. Prototype deletions are intentional and branch source checks pass. Shared planning updates remain assigned to the root orchestrator.
