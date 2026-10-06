---
phase: "13"
slug: account-settings-and-travel-preferences
status: planned
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-06"
---
# Phase 13 — Validation Strategy

## Test Infrastructure
Existing pytest/FastAPI TestClient/SQLAlchemy fixtures and frontend Vitest/jsdom. No new framework. Quick baseline: `uv run pytest services/auth/tests/test_api.py services/auth/tests/test_cognito_adapter.py services/auth/tests/test_session_store.py services/crud/tests/test_api.py -q` (59 passed / 1 stale revision assertion failed). Frontend: `npm --prefix frontend test`; build: `npm --prefix frontend run build`. Agent tests require explicit paths because default pytest discovery excludes them.

## Sampling Rate
Run focused changed-handler/component tests after each task. Run auth/CRUD and affected frontend regressions after each implementation wave. Final phase runs all affected suites plus relevant agent profile-context coverage. Keep feedback targeted; no repeat runs without changes or unresolved failures.

## Per-Task Verification Map
Five sequential waves are specified in 13-01 through 13-05. All new test files below are created by their named task before its verify command runs. No executed pass is implied by this map.

| Task | Requirements | Executable automated check | Status |
|---|---|---|---|
| 13-01-01 | 01, 02, 06 | `uv run --locked pytest services/auth/tests/test_account_profile.py services/crud/tests/test_api.py -q`; `npm --prefix frontend test -- src/features/account/AccountSettingsPage.test.jsx`; `npm --prefix frontend run build` | Planned |
| 13-01-02 | 01, 02 | `npm --prefix frontend test -- src/AccountApp.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx` | Planned |
| 13-01-03 | 01 | `npm --prefix frontend run build`; `git cat-file -e prototype/account-settings:frontend/src/prototypes/AccountSettingsPrototype.jsx` | Planned |
| 13-02-01 | 01, 02, 06 | `uv run --locked pytest services/auth/tests/test_account_profile.py -q`; `npm --prefix frontend test -- src/features/account/PreferenceSettings.test.jsx src/features/account/AccountSettingsPage.test.jsx` | Planned |
| 13-02-02 | 02 | `uv run --locked pytest services/auth/tests/test_account_profile.py -q`; `npm --prefix frontend test -- src/features/account/PreferenceSettings.test.jsx` | Planned |
| 13-02-03 | 05, 06 | `uv run --locked pytest services/auth/tests/test_account_profile.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agentcore_memory.py -q` | Planned |
| 13-03-01/02 | 03, 04, 06 | `uv run --locked pytest services/auth/tests/test_account.py services/auth/tests/test_cognito_adapter.py -q`; `npm --prefix frontend test -- src/features/account/AccountIdentity.test.jsx` | Planned |
| 13-03-03 | 03, 04, 06 | `uv run --locked pytest services/auth/tests/test_account.py services/auth/tests/test_api.py services/auth/tests/test_crud_client.py services/auth/tests/test_session_store.py -q` | Planned |
| 13-04-01 | 04, 06 | `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_cognito_adapter.py -q`; `npm --prefix frontend test -- src/features/account/AccountSecurity.test.jsx` | Planned |
| 13-04-02 | 04, 06 | `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_api.py services/auth/tests/test_cognito_adapter.py -q`; `npm --prefix frontend test -- src/features/account/AccountSecurity.test.jsx` | Planned |
| 13-04-03 | 04, 06 | `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_session_store.py -q`; `npm --prefix frontend test -- src/features/account/AccountSecurity.test.jsx`; `npm --prefix frontend run build` | Planned |
| 13-05-01 | 01–06 | `uv run --locked pytest services/crud/tests/test_account_postgres.py services/auth/tests services/crud/tests services/agent/tests/test_agent_turn.py services/agent/tests/test_agentcore_memory.py -q`; `npm --prefix frontend test`; `npm --prefix frontend run build` | Planned |
| 13-05-02 | 01–06 | Exact Python evidence-file assertion in 13-05-PLAN; actual Chrome interactions/inspection additionally required | Planned |

Requirement suffixes above are ACCOUNT-13-NN. HTTP tests use actual Auth/CRUD handlers and SQL; provider fixtures isolate sensitive mutations. Isolated PostgreSQL tests must execute without environment skips before the concurrency gate can pass.

| Requirement | Secure behavior | Automated coverage | Manual gate |
|---|---|---|---|
| ACCOUNT-13-01 | Account route remains authenticated; drafts and prior Plan preserved | Account routing/section/theme/dirty guard frontend tests | Chrome selected C desktop and mobile, light/dark, back/reload |
| ACCOUNT-13-02 | Token-owned profile only; atomic per-section revision/idempotency | Real HTTP handlers + test SQL database; four sections, optional clears, no interest minimum, onboarding preserved, stale/conflicting/replayed requests | Example profile edit/save/reload and restore |
| ACCOUNT-13-03 | Identity changes use canonical provider subject, verified email guard | Auth HTTP + adapter operation shapes + encrypted session/recovery reconciliation; unsafe config blocks before provider write | Canonical identity read only on shared example account; email activation currently blocked |
| ACCOUNT-13-04 | Fresh verification for factors/codes; no secret leakage or false success | Auth HTTP/adapter/store tests for wrong factor, subject mismatch, expiry, provider failure/partial success, code rotation hashes/counts | Read/security UI and validation only; no real credential/factor mutation on shared example account |
| ACCOUNT-13-05 | Cleared canonical profile overrides stale advisory memory; no Plan mutation | Explicit agent context/projection regression plus auth mirror routing test | Existing confirmed Plan unchanged after preferences update |
| ACCOUNT-13-06 | Delivery evidence corresponds to running changed source | Build and suite commands; local container hash comparison | Chrome console/network inspection and screenshots in artifacts/testing/2026-10-06-account-settings |

## Wave 0 Requirements
- 13-01-01 first creates failing profile-section HTTP/component tests and fixes the stale raw-payload revision expectation. No separate foundation-only plan.
- 13-03-01 creates managed-identity/account HTTP and adapter fixtures with real encrypted local-store persistence; 13-04-01 adds security fixtures.
- Each frontend slice creates its corresponding interaction tests before implementing behavior, using exact plan interface contracts.
- 13-02-03 adds explicit Agent canonical-clear regressions; 13-05-01 adds guarded PostgreSQL concurrency tests.
- `wave_0_complete` remains false until these actual test scaffolds exist and run. No prospective pass or missing-test command is treated as coverage.

## Manual-Only Verifications
Use mandatory docs/skills/travella-testing/SKILL.md and .agents/skills/travella-local/SKILL.md. Preserve screenshot evidence from selected C before implementation. Authenticate with supplied example account without printing credentials. Use non-sensitive temporary preference values, record old values privately and restore only the verification change, never overwrite concurrent changes. Check desktop/mobile and both themes, error/dirty/save/reload/back. Sensitive flows must use isolated provider fixtures; don't claim live success from fixtures. Current Cognito email-before-update policy is unsafe; live email change is blocked without separately authorized configuration change.

## Validation Sign-Off
Concrete task mapping complete; execution pending. `nyquist_compliant` and `wave_0_complete` remain false until tests and required evidence have actually run. Current unsafe email policy must refuse initiation; conditional successful flows are fixture-tested, not live provider-mutation evidence. Existing signed-out recovery debt remains separate. Update this section only with commands, observed results, inspected screenshot links and exact blockers from `artifacts/testing/2026-10-06-account-settings/verification.md`.
