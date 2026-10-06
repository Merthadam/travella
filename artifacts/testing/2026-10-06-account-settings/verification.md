# Account settings verification

## Plan 13-01 — production needs tracer and navigation

Implementation tasks are committed. Browser delivery remains **unverified** until the explicit 13-05 Chrome DevTools gate. No shared-account credential/security changes or AWS mutations were made.

### Executed checks

| Command/check | Observed result |
| --- | --- |
| `uv run --locked pytest services/auth/tests/test_account_profile.py services/crud/tests/test_api.py -q` | **34 passed**, including the post-commit tracer rerun. Real Auth and CRUD handlers, actual SQLite transactions; only transport/provider fixtures are substituted. |
| `npm --prefix frontend test -- src/features/account/AccountSettingsPage.test.jsx` | **11 passed**: actual `/account` bootstrap/save, exact body, acknowledgment, retained drafts, dirty Cancel/mobile/desktop/My plans, repeated Back and Forward, themes/denied storage, conflict review, exact unknown-result replay, transient session failure and late response after expiry. |
| `npm --prefix frontend test -- src/AccountApp.test.jsx -t 'Account opens\|direct account'` | **2 passed**, 10 unrelated tests filtered. Confirms authenticated bootstrap, no enrollment mutation, hidden/inert mounted Plans view, and return to the same instance. |
| `npm --prefix frontend test -- src/PlansApp.test.jsx -t 'account suspension'` | **1 passed**, 9 unrelated tests filtered. Selected Plan and unsent composer survive account suspension; no extra Plan reload. |
| `npm --prefix frontend test -- src/AccountApp.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx` (also run with JSON reporter for the final counts) | **21 passed, 12 failed**. All 12 failures predate this change: five legacy AccountApp onboarding tests and seven incomplete PlansApp API fixtures. See deferred-items.md; this is not a full-suite pass. |
| Pre-change baseline `git archive 49e6d526` into an independent `/tmp` directory, same installed dependencies, archived shared catalogs; run AccountApp and PlansApp tests | Original AccountApp: 5 passed / 6 failed. Original PlansApp: 2 passed / 7 failed. The directly changed enrollment-shortcut test was replaced and now passes; the other 12 failures remain unchanged. No repository checkout or working files were reverted. |
| `npm --prefix frontend run build` | **Passed** after all three tasks, including prototype removal. Existing >500kB bundle warning remains. |
| `git cat-file -e prototype/account-settings:frontend/src/prototypes/AccountSettingsPrototype.jsx` and corresponding stylesheet | **Passed**. Source remains on the prototype branch; selected C captures remain present. |
| `git diff --check 49e6d526..HEAD` | **Passed**. |

### HTTP and stored outcomes

- Update: PATCH `/v1/traveler-profile/sections` through authenticated cookie gateway saved trimmed `food_needs` and `accessibility_needs`; revision incremented once; GET matched the acknowledged response. A fresh SQL session confirmed the token-owned row and one private receipt.
- Replay: identical normalized request returned its saved response; changed replay returned `request_reused`; stale revision returned `revision_conflict`; neither changed the stored revision.
- Clear: both explicit empty strings persisted and were confirmed by GET. Unrelated home/citizenships, onboarding progress/completion and the existing Plan snapshot stayed equal.
- Create/read ownership: a valid isolated second identity created only its own profile with onboarding incomplete. The original identity still read `exists: false`; direct SQL confirmed no original-user row. Absent/invalid tokens and cross-origin writes were rejected.
- Invalid: supplied subject, boolean revision, unsupported section, unknown value field and >1000-character needs returned 422 `invalid_profile`, with no created profile.
- Test databases and identities are isolated pytest fixtures and are removed with their temporary directories. No account-delete operation was introduced.

### TDD evidence

Task 1 initially returned 404 for the missing section endpoint (7 HTTP tests failed as intended) and rendered My plans at `/account` (2 UI tests failed). Task 2 initially failed the dirty/theme/reconciliation/history behavior assertions. Both RED records passed `gsd-tools.cjs check tdd-red-evidence` before implementation. The GSD validator accepts Node TAP summaries only, so the records explicitly derive summary counts from Vitest's actual TAP-flat result lines; this is a format adapter, not a fabricated test run.

### Retained design and remaining evidence

Selected C before-state: [desktop light](../2026-10-05-account-prototypes/plan/c-light.png), [desktop dark](../2026-10-05-account-prototypes/plan/c-dark.png), [mobile light](../2026-10-05-account-prototypes/plan/c-light-mobile.png), [mobile dark](../2026-10-05-account-prototypes/plan/c-dark-mobile.png).

Production Chrome screenshots, local rebuilt-container source hashes, example-account save/reload/readback/restoration, selected Plan return, keyboard, console/network and desktop/mobile/theme inspection have **not run in 13-01**. They are assigned to 13-05 and remain an open delivery gate. Identity/security rows and remaining preference editors are intentionally completed by 13-02 through 13-04, not simulated here.
