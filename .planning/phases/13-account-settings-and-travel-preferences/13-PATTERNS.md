# Phase 13 — Account implementation patterns

**Status:** implementation guidance, 2026-10-06. Companion: 13-RESEARCH.md. Proposed targets below are recommendations, not claims that new files already exist.

## Component Responsibilities

| Proposed target / responsibility | Closest existing analog | Reuse / required difference |
|---|---|---|
| Production account page and scoped styles | frontend/src/prototypes/AccountSettingsPrototype.jsx:101-140 | Selected C master/detail and grouped mobile selector only; replace every demo save/security toggle with real acknowledged state |
| Account section draft hook/API module | frontend/src/api.js:8-35; frontend/src/PlansApp.jsx:80-98 | Same-origin cookie requests and structured errors; retain ordinary draft and mutation ID across uncertain retry; save summaries only from canonical response |
| Account route in frontend/src/AccountApp.jsx | Existing bootstrap/session effects at 30-60 and signed-in branch 134-142 | Read route after auth; include account in periodic session checks; replace enrollment shortcut; preserve previous selected Plan and back behavior |
| Navigation label in frontend/src/PlansApp.jsx | Existing Account button at 325 | Replace authenticator-specific accessible label; navigation must not start security mutation |
| Reusable preference editors | HomeStep, CitizenshipStep, NeedsStep, InterestsStep under frontend/src/features/onboarding/steps | Reuse catalogs/place controls and normalization; parameterize/extract interest count presentation so account has no minimum; do not render onboarding progression controls |
| Account profile mutation/schema in services/crud/profile_schemas.py | OnboardingMutation and HomeValues/CitizenshipValues/NeedsValues/InterestValues | Separate section contract and general interest normalizer; preserve onboarding's five-interest rule |
| Account profile repository writer in services/crud/profile.py | save_step at 52-110 | Same lock + receipt-before-revision + atomic response receipt; preserve onboarding fields and unrelated sections |
| Account section route in services/crud/api.py | create_profile_router at 236-259 | Token subject only; return ProfileOutput; section writes/clears use actual SQL |
| Auth profile proxy/allow-list | services/auth/api.py:322-359 and services/auth/crud_client.py:49-53 | Register new route and allow-list method together; same token-only forwarding; successful section edits invoke existing bounded memory mirror |
| Identity/security handlers in services/auth/api.py or a narrowly extracted account module | current_session, identity, input/error protections, existing enrollment | Preserve cookie/CSRF/identity boundary; narrow safe responses; add canonical account read, step-up and provider readback |
| Cognito wrappers in services/auth/cognito_adapter.py | get_user and associate/verify wrappers | Add exact AWS request wrappers for name/email/password/preference; keep adapter mockable; no browser AWS SDK |
| Store helpers in services/auth/session_store.py | encrypted session/enrollment/recovery operations | Subject/session-bound verification, email reconciliation and recovery status/rotation; serialize races and account for provider success before local error |
| Future suggestion regression | services/agent/service.py:84-111; services/shared/traveler_profile.py:13-52 | Verify canonical empty values override stale mirror; no new Plan mutation path |

All analogs above were opened during research. Their implementation behavior is source-grounded. [VERIFIED: source files and ranges listed in table]

## Contract Grounding

Source excerpts below contain the exact existing values to reuse, not newly invented enums.

- Profile sections: `step: Literal["home", "citizenship", "needs", "interests"]`; onboarding-only actions: `action: Literal["continue", "skip"]`; concurrency inputs: `expected_revision: int = Field(ge=0, strict=True)` and `event_id: UUID`. [VERIFIED: services/crud/profile_schemas.py:176-182]
- Home sources: `source: Literal["manual", "google"]`; optional airport: `default_airport: str | None`. [VERIFIED: services/crud/profile_schemas.py:47-55,104-107]
- Shared optional arrays/text: `citizenships: list[str] = Field(max_length=10)`; `accessibility_needs: str = Field(max_length=1000)`; `food_needs: str = Field(max_length=1000)`; `interest_ids: list[str] = Field(max_length=40)`; `custom_interests: list[str] = Field(max_length=20)`. [VERIFIED: services/crud/profile_schemas.py:119-145]
- Current preference routes: `"/v1/traveler-profile"`, `"/v1/traveler-profile/onboarding"`. [VERIFIED: services/auth/crud_client.py:49-53]
- Current errors: `"invalid_profile": (422, "Check your profile details and try again.")`, `"revision_conflict": (409, "Plan changed. Refresh and try again.")`, `"request_reused": (409, "Request could not be processed.")`. Use account-appropriate UI copy rather than showing the Plan-specific conflict sentence unchanged. [VERIFIED: services/crud/contracts.py:59-64]

## Recommended Plan Boundaries

1. **Durable preference sections and tests.** Shared normalization, separate account mutation, transactional writer and API route, auth proxy allow-list/mirror, fix stale baseline assertion. Prove all sections/clears/no onboarding reset through real HTTP + test DB.
2. **Managed identity and bounded security.** Canonical GetUser projection; name write/readback; fail-closed email capability and complete verified flow; current-password change; fresh verification; signed-in MFA setup/replace/disable; recovery status/rotation; email/session/recovery reconciliation. Add adapter + HTTP + encrypted-store tests.
3. **Selected C production UI and navigation.** Production page, section editors, state machine, API integration, safe route/reload/back, scoped persisted appearance, dirty guards and error states; do not ship demo variants.
4. **Integration and required evidence.** Run affected service/frontend suites and build; local skill rebuild; example-account Chrome desktop/mobile/light/dark, ordinary preference save/readback/reload and restore test-created changes; console/network and inspected screenshots. Report email/security live-operation exclusions accurately.

Plans 1 and 2 can own separate backend files only if shared auth API edits are coordinated; plan 3 depends on concrete response shapes and may use exact test fixtures while backend work completes. Final gate depends on all three. These are planning recommendations.

## Security State Transitions

Recommended signed-in account operation:

1. Read canonical account and safe capability flags.
2. Hold ordinary draft locally; secrets only in form/submission memory.
3. Verify current credentials where sensitive; ensure returned subject matches active session.
4. Bind short-lived verification/enrollment state to subject and current opaque session.
5. Perform provider operation; read provider status back before publishing success.
6. Reconcile local session/recovery indexes by stable subject, preserving session expiry.
7. Clear transient secrets; retain only safe status/count. Never automatically retry code rotation or password change after an ambiguous result.

Exact existing session kind is `"kind": "session"`; email and subject fields are `"email": email`, `"subject": principal.subject`. [VERIFIED: services/auth/api.py:264-279]

## Reuse Limits

- Existing InterestValues normalization is valuable; its minimum is onboarding-specific. Extract shared validation while keeping onboarding behavior intact. [VERIFIED: services/crud/profile_schemas.py:142-167]
- Existing HomeStep supports catalog fallback and cancels obsolete lookups; account styling must not remove those behaviors. [VERIFIED: frontend/src/features/onboarding/steps/HomeStep.jsx:28-78]
- Existing MFA verify handler returns codes after verification but does not activate/read back preference. Do not copy it unchanged. [VERIFIED: services/auth/api.py:488-507]
- Existing sign-in handler deletes the browser session first; do not call it for account step-up. [VERIFIED: services/auth/api.py:509-539]
- Existing signed-out recovery is mock-tested, not live-proven. Keep its debt distinct from this phase's signed-in operations. [VERIFIED: services/auth/tests/test_api.py:348-382]
- Current pool returns `"AttributesRequireVerificationBeforeUpdate": []`. Safe email initiation stays unavailable; do not weaken the private verified-email gate or change the pool. [VERIFIED: sanitized AWS read-only probe 2026-10-06]
- Parent requested no production changes or commits from this researcher. Only these two phase artifacts are owned by this task.

## Test Anchors and Observed Baseline

- Auth tests already cover opaque/encrypted sessions, provider revocation, CSRF, MFA enrollment, signed-out recovery, reset invalidation and fixed session expiry. [VERIFIED: services/auth/tests/test_api.py:62-478]
- CRUD HTTP tests use real application handlers and SQL, with token-derived identity and separate-traveler readback. [VERIFIED: services/crud/tests/test_api.py:28-61,150-192]
- Observed targeted run: **59 passed, 1 failed**. The raw profile payload assertion at line 173 omits the actual revision; fix expected persistence rather than removing revision. [VERIFIED: executed pytest 2026-10-06]
- Default Python test discovery is `testpaths = ["services/auth/tests", "services/crud/tests"]`; invoke Agent tests explicitly for the future-suggestion requirement. [VERIFIED: pyproject.toml:30-32]
- Frontend scripts are `"test": "vitest run"` and `"build": "vite build"`. [VERIFIED: frontend/package.json:5-9]

## Delivery Limitations to Carry Forward

The email flow can be implemented and exercised against deterministic provider fixtures, but safe live initiation cannot pass under current pool configuration. Name/password/MFA mutation tests must use isolated provider fixtures; shared example-account verification must not alter those credentials or factors. Document those distinctions in verification evidence. These constraints are locked in the phase context and required testing skill. [VERIFIED: .planning/phases/13-account-settings-and-travel-preferences/13-CONTEXT.md:22-28; docs/skills/travella-testing/SKILL.md, read in full]

