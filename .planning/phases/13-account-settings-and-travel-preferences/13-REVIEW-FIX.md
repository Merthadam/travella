---
phase: 13-account-settings-and-travel-preferences
fixed_at: 2026-10-06T18:59:52Z
review_path: .planning/phases/13-account-settings-and-travel-preferences/13-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
verification: passed
verified_source_head: c2dfb88
evidence_commit: 0faa2f3
---

# Phase 13: Code Review Fix Report

Twelve code/UI findings resolved in thirteen source commits: E3 and E4 share the identity interaction commit, with two follow-up corrections discovered in Chrome. Original reviews remain historical. Source fixes are on `agent-account-review-fixes` at `c2dfb88`.

| Finding | Applied fix | Commit | Status |
|---|---|---|---|
| CR-01 | Shared subject-validated MFA normalization; omitted list is off, malformed list unavailable; issuance and consumption agree | a9336cc | fixed: requires human verification |
| UI-E1 | Native action-specific security confirmations, safe initial focus and fresh verification | dbd14f1 | fixed |
| UI-E2 | Separate loading/error/read states and selected-setting Retry | 728bee2 | fixed |
| UI-E3 / E4 | Latest names beside retained draft; editor/error/invalid-field focus; typing retains focus after correction | a07a4b5, 3cf6d06 | fixed |
| UI-C1 | Verified email status and unchanged-address reassurance | 3f36f07 | fixed |
| UI-C2 | Individual name labels/empty states and password context | ccc7f13 | fixed |
| UI-E5 | Mobile navigation disabled during identity submissions | 62f4b31 | fixed |
| UI-CO1 | Accent focus ring for focused headings and alerts | 02432ff | fixed |
| UI-T1 | Account strong/b text normalized to 600 | ebfda61 | fixed |
| UI-V1 | Local decorative outline SVGs, neutral missing-identity icon; override global block SVG layout | 79e03a7, c2dfb88 | fixed |
| UI-V2 | Decorative error indicators preserve alert semantics | 6192f75 | fixed |

## Verification

Source changes and automated checks ran in isolated worktree `.codex/worktrees/rf-13-account`. Python AST checks and targeted Auth HTTP/encrypted SQLite tests: **57 passed**. Three changed account UI suites: **29 passed**. Production build passed, retaining existing bundle-size warning. Node 26 requires `NODE_OPTIONS=--no-experimental-webstorage` for jsdom storage; an initial run without it failed in existing test setup, then passed with that runtime flag.

After the focus correction, all seven identity tests passed again in isolated worktree `.codex/worktrees/rf-13-focus`. Final build passed in the canonical checkout. The canonical Docker rebuild passed example-account authentication; all six representative source hashes matched the running container.

Authenticated Chrome changed-path checks passed: live MFA Off/setup affordance; loading and selected-setting Retry with labeled simulated transport; complete typing after blank-name feedback; retained draft/latest-name comparison and pending mobile disabling with fixture writes; all three security confirmations, safe focus, Tab and Escape restoration; exact 390px/320px overflow checks and both themes; live email verification/unavailable copy. Thirteen refreshed screenshots were captured and visually inspected. Console has no errors, only the existing Lit warning; final account/session reads returned 200. No live identity, credential, factor or recovery mutation was performed.

Detailed commands, environment caveats, browser recovery and screenshot links: [verification record](../../../artifacts/testing/2026-10-06-account-settings/verification.md#review-fixes--2026-10-06). The CR-01 human-verification status is the fixer's required marker for a logic change; HTTP regression and live read-only verification have been completed.

## Scope and files

Backend: `services/auth/account.py`, `services/auth/tests/test_account_security.py`.
Frontend: AccountIdentity, AccountSecurity, AccountSettingsPage and their tests, `account.css`, plus new `AccountIcon.jsx` required by V1/V2.

No skipped findings. No shared STATE/ROADMAP/requirements edits. Broader baseline suite debt remains documented separately. Temporary review-fix worktrees were fast-forwarded into the supplied checkout and removed; their branches and recovery sentinels were cleaned. This report is intentionally left uncommitted for the orchestrator.
