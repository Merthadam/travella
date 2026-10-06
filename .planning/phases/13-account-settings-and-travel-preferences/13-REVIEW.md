---
phase: 13-account-settings-and-travel-preferences
reviewed: 2026-10-06T17:50:14Z
depth: standard
reviewed_head: e3905d7
diff_base: 49e6d52
files_reviewed: 39
files_reviewed_list:
  - frontend/package.json
  - frontend/src/AccountApp.jsx
  - frontend/src/AccountApp.test.jsx
  - frontend/src/PlansApp.jsx
  - frontend/src/PlansApp.test.jsx
  - frontend/src/features/account/AccountIdentity.jsx
  - frontend/src/features/account/AccountIdentity.test.jsx
  - frontend/src/features/account/AccountSecurity.jsx
  - frontend/src/features/account/AccountSecurity.test.jsx
  - frontend/src/features/account/AccountSettingsPage.jsx
  - frontend/src/features/account/AccountSettingsPage.test.jsx
  - frontend/src/features/account/PreferenceSettings.jsx
  - frontend/src/features/account/PreferenceSettings.test.jsx
  - frontend/src/features/account/account.css
  - frontend/src/features/onboarding/components/HomeLocationMap.jsx
  - frontend/src/features/onboarding/steps/HomeStep.jsx
  - frontend/src/main.jsx
  - services/agent/tests/test_agent_turn.py
  - services/agent/tests/test_agentcore_memory.py
  - services/auth/account.py
  - services/auth/api.py
  - services/auth/app.py
  - services/auth/cognito_adapter.py
  - services/auth/crud_client.py
  - services/auth/session_store.py
  - services/auth/tests/test_account.py
  - services/auth/tests/test_account_profile.py
  - services/auth/tests/test_account_security.py
  - services/auth/tests/test_api.py
  - services/auth/tests/test_cognito_adapter.py
  - services/auth/tests/test_crud_client.py
  - services/auth/tests/test_session_store.py
  - services/crud/api.py
  - services/crud/app.py
  - services/crud/profile.py
  - services/crud/profile_schemas.py
  - services/crud/tests/conftest.py
  - services/crud/tests/test_account_postgres.py
  - services/crud/tests/test_api.py
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-10-06T17:50:14Z
**Depth:** standard
**Files Reviewed:** 39 current source/test/configuration files
**Status:** issues_found

## Summary

Reviewed the bounded Phase 13 changes from `49e6d52` through `e3905d7`, using the phase plans, summaries, context, research, project rules and verification evidence. Scope includes account routing/editors, shared home controls, Auth provider operations and encrypted records, profile section persistence and related tests. Removed account prototype files were checked as deletions; evidence/planning artifacts and generated files are excluded from the source count. No structural pre-pass or external reviewer evidence was supplied.

One new correctness blocker prevents MFA-off travelers from using advertised password changes and authenticator setup. Existing broad-suite debt and the deliberately disabled live email capability are not new findings.

## Narrative Findings (AI reviewer)

### Critical Issues

### CR-01: Omitted Cognito MFA list prevents password changes and first authenticator setup

**Classification:** BLOCKER

**File:** `/Users/adammerth/.superset/worktrees/7718c7a9-dea7-4520-aacf-2cd62896751c/transparent-pajama/services/auth/account.py:232-235`

**Related lines:** `services/auth/account.py:171-173`, `services/auth/account.py:469-476`, `services/auth/account.py:489-496`; the shared account fixture at `services/auth/tests/test_account.py:23-24` always supplies an empty list.

**Issue:** `GetUser.UserMFASettingList` is optional. A successful response with no activated MFA methods can omit it, as demonstrated by the [official AWS CLI GetUser example](https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/get-user.html). Both status calculations use `user.get('UserMFASettingList')` and classify this valid response as `unavailable`. However, `begin_verification` treats the same omission as an empty list and successfully issues a password-only proof. `consume_proof` subsequently rejects that proof because `unavailable != 'off'` and it lacks `factor_verified`. Thus a traveler without MFA can enter the correct current password repeatedly but cannot change their password. Authenticator setup is also hidden/refused because capabilities require status `off`; safe email changes would encounter the same proof-consumption failure when enabled. This is incorrect product behavior, not a missing optional provider configuration.

**Evidence:**

- An isolated existing FastAPI/encrypted-SQL fixture was run with only `UserMFASettingList` removed from the otherwise valid provider response. Account GET returned `mfa.status = unavailable` while advertising password changes as available. Verification succeeded. POST `/auth/account/password` then returned **403 `verification_required`**, and the fixture provider's password-change call count remained **0**.
- A separate local example-account sign-in followed by read-only GET `/auth/account` returned **200**, `mfa.status = unavailable`, password changes available, and all three authenticator capabilities false. The temporary review session was signed out afterward. No live password, email, factor or recovery-code mutation was submitted. This corroborates the live availability symptom; the isolated fixture establishes its exact cause.
- Existing account and security fixtures always insert `UserMFASettingList: []` for the MFA-off case, so their passing mutation tests do not exercise the actual omitted-field shape.

**Fix:** Normalize an omitted list to an empty list after a successful subject-validated `GetUser` response. Keep explicitly malformed values and provider failures unavailable. Use one shared helper in output, proof issuance and proof consumption so they interpret the provider response consistently. For example:

```python
methods = user.get('UserMFASettingList', [])
if not isinstance(methods, list) or any(not isinstance(item, str) for item in methods):
    return 'unavailable'
return 'on' if 'SOFTWARE_TOKEN_MFA' in methods else 'off'
```

Add an omitted-field HTTP regression proving password verification can authorize the isolated password change and first authenticator setup when pool policy allows it. Preserve tests for explicit empty lists, active TOTP requiring the factor, malformed present values, provider failure and activation after proof issuance. Recheck the live read-only account status/setup affordance without changing shared credentials or factors.

## Review validation and limits

The targeted fixture reproduction and sanitized local account read described above were executed during this review. Existing phase test/browser results were inspected as evidence; the entire regression suite was not rerun for this read-only review. Successful sensitive provider mutations remain fixture evidence. Safe live email activation remains intentionally unavailable under current pool policy. No source files, cloud configuration, credentials or factors were changed, and no commit was created.

---

_Reviewer: gsd-code-reviewer_
_Depth: standard_
