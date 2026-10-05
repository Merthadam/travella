---
phase: 12-travel-studio-onboarding
plan: "01"
subsystem: api
tags: [fastapi, sqlalchemy, postgresql, onboarding, idempotency, react]
requires:
  - phase: existing-traveler-profile
    provides: Authenticated profile API, CRUD-owned JSON storage, and account session boundary
provides:
  - Strict version 2 per-step profile mutation and resume contracts
  - Atomic profile data and progress saves with revision checks and bounded replay receipts
  - Authenticated home-save UI and reload recovery through the canonical API
affects: [12-02, 12-03, 12-04, traveler-profile, agent-memory]
actuals:
  tokens: null
  tasks: 3
  commits: 0
tech-stack:
  added: []
  patterns:
    - Per-subject transaction serialization covers concurrent first profile creation
    - Explicit step values and progress commit together in the existing JSON row
    - Catalog validation uses one shared reference source
key-files:
  created:
    - services/shared/traveler_profile.py
    - frontend/src/features/onboarding/OnboardingFlow.jsx
    - frontend/src/features/onboarding/steps/HomeStep.jsx
    - artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md
  modified:
    - services/crud/profile_schemas.py
    - services/crud/profile.py
    - services/crud/api.py
    - services/crud/contracts.py
    - services/auth/api.py
    - services/auth/crud_client.py
    - frontend/src/api.js
key-decisions:
  - Keep revision, onboarding progress, and private replay receipts in the existing profile JSON; no database migration
  - Retain the latest 64 mutation receipts by saved revision; evicted requests safely fail stale revision checks
  - Legacy PUT merges supplied fields and preserves v2 data and completion
  - Skip preserves stored values; Continue explicitly replaces only the current step fields
patterns-established:
  - PostgreSQL advisory transaction locks and SQLite immediate transactions serialize first and subsequent profile writes
  - Public and model-facing projections exclude private receipt metadata
requirements-completed: [ONB-12-01, ONB-12-02, ONB-12-07]
coverage:
  - id: D1
    description: Strict additive profile contracts preserve legacy values and enforce home and interest rules
    requirement: ONB-12-01
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md
        status: pass
    human_judgment: false
  - id: D2
    description: Profile data and progress persist atomically with safe retry and stale-write behavior
    requirement: ONB-12-02
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md
        status: pass
    human_judgment: false
  - id: D3
    description: The authenticated home journey saves through CRUD and resumes after reload
    requirement: ONB-12-07
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/01-home-desktop.jpg
        status: pass
    human_judgment: true
    rationale: Parent observed the production browser journey; final phase-wide visual and acceptance verification remains with the orchestrator
duration: null
completed: 2026-10-05
status: complete
---

# Phase 12 Plan 01: Save and resume a home step

**Explicit home and per-step onboarding saves now persist profile values, version 2 progress, and revision together through the authenticated CRUD API.**

## Performance

- **Completed:** 2026-10-05
- **Tasks:** 3 implementation tasks delivered across coordinated backend and frontend segments
- **Duration / token attribution:** Not independently measured for this plan; overlapping phase 12 files and parallel execution require orchestrator reconciliation
- **Commits:** Pending orchestrator aggregation; no commit hashes are claimed here

## Accomplishments

- Added `PATCH /v1/traveler-profile/onboarding` with strict step/action/value validation, UUID event identity, expected revision, structured home/airport/interests, and explicit completed/skipped states. Missing home cannot produce current-version completion. Country, airport, and interest selections validate against shared catalogs.
- Serialized per-subject writes with PostgreSQL transaction advisory locks and SQLite immediate transactions, including absent-row creation. Duplicate requests replay the original response before revision checks; changed reused events and stale writes conflict. The latest 64 receipts remain private and are ordered by saved revision to accommodate PostgreSQL JSONB key ordering.
- Preserved existing values during migration and optional skips. Legacy PUT merges only supplied fields, cannot erase structured data through omission, and cannot lower existing completion. Explicit nullable/list/text clears persist.
- Connected the selected production home UI to the authenticated profile route. Parent browser execution saved home, confirmed GET readback, saved subsequent steps, and reloaded into the correct saved position against the running PostgreSQL stack using the existing Cognito account session.

## Task Commits

1. **12-01-T1: Define additive profile and step-save contracts** — implementation complete; commit assignment pending parent integration.
2. **12-01-T2: Persist atomic step updates through the authenticated API** — implementation complete; commit assignment pending parent integration.
3. **12-01-T3: Build a real home-save/resume slice in the chosen shell** — implementation and parent browser exercise complete; commit assignment pending parent integration.

No task or metadata commit hashes have been inserted by the delegated worker.

## Files Created/Modified

- `services/crud/profile_schemas.py` — structured profile response and strict home/citizenship/needs/interests mutation schemas.
- `services/crud/profile.py` — atomic merge, revision comparison, first-save serialization, replay receipts, and completion derivation.
- `services/crud/api.py`, `services/crud/contracts.py` — authenticated PATCH handler, preserve-on-omission PUT, safe validation errors.
- `services/auth/api.py`, `services/auth/crud_client.py` — allowlisted PATCH proxy, expanded response validation, and PUT origin/CSRF protection.
- `services/shared/traveler_profile.py` — cached reference lookup, compatible legacy-text derivation, and bounded public preference projection.
- `frontend/src/api.js`, `frontend/src/features/onboarding/OnboardingFlow.jsx`, `frontend/src/features/onboarding/steps/HomeStep.jsx` — explicit step requests, state/draft recovery, and the production home-save interaction.
- `artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md` — sanitized manual API and deterministic context results.

`services/crud/models.py` required no change. The existing JSON profile row supports the additive fields without a migration. The planned separate `useOnboardingProfile.js` abstraction was implemented within the feature flow rather than added as an independent file.

## Verification

- **53 observations passed** through real FastAPI handlers over HTTP with an isolated SQLite database and two synthetic identities. Checks covered missing profile, create/read/update, explicit clears, invalid home/country/airport/interest input, field ownership, missing authentication, duplicate replay, changed event rejection, stale revisions, legacy preservation, optional skips, out-of-order noncompletion, and completion. Concurrent first saves produced exactly one 200 and one 409, with stored revision 1.
- Deterministic profile, turn-context, and memory request projections retained structured fields and explicit empty/null values while excluding progress and private receipt metadata. No paid model or AWS memory write was invoked.
- Ruff and syntax compilation passed for the changed backend files. Custom-interest normalization was subsequently aligned with UI behavior by collapsing internal whitespace before case-insensitive deduplication; lint/syntax checks passed, and the fix was included in the final container rebuild.
- Parent integration exercised Cognito-authenticated browser PATCH home followed by GET readback, subsequent atomic step saves, and reload/resume on the real PostgreSQL application. See the [home screenshot](../../../artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/01-home-desktop.jpg) and [API record](../../../artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md). The API record explicitly describes the isolated worker checks; parent phase verification records the later deployed-stack evidence.
- No automated test suite or test files were added or run. The isolated HTTP server was stopped and only its temporary database directory was deleted. Existing application and account data were preserved.

## Decisions Made

- Preserve the current storage owner and schema. JSON additions avoid a new store or migration while transaction serialization handles concurrent creation safely.
- Bound receipts to 64 successful mutations. Older requests remain safe because their original revision is stale, though they no longer receive exact response replay.
- Use the shared countries/interests/airports catalogs produced by the parallel reference-data segment. New structured saves depend on those files being present in service images.
- Save failures leave drafts in the UI; successful saved progress determines resume state. Draft PATCH saves do not block on AgentCore mirroring; final mirror handling is summarized in 12-04.

## Deviations from Plan

1. **Coordinated execution segments:** Backend contracts, persistence, auth transport, and later memory projection were implemented together by one delegated worker while frontend and shared-catalog work proceeded independently. Parent assembled plan boundaries and performed live integration rather than requiring each worker to commit overlapping files.
2. **Existing storage was sufficient:** No model or migration change was needed. Revision/progress/receipts use the existing JSON object, with transaction locks covering absent-row races.
3. **Additional boundary hardening:** Added PUT to the existing origin/CSRF middleware, which previously covered POST/PATCH/DELETE. This preserves the legacy profile route's authenticated mutation boundary.
4. **Feature-local state ownership:** Home-save and resume state live in `OnboardingFlow.jsx`; the planned separate hook was unnecessary for the implemented feature size.

These changes preserve the approved product contract and avoid introducing a new data store, agent intake loop, or settings surface.

## Issues Encountered

- A second local startup authentication check returned 401 after an earlier successful sign-in. Existing authenticated browser sessions remained valid and supported the verified CRUD journey. Read-only diagnosis found matching Cognito configuration, an enabled confirmed account, available JWKS, and no material clock drift. The existing sign-in handler collapses multiple provider/token failures into 401, so the transient cause could not be established without another attempt. No rejected-password retry, reset, or auth behavior change was performed. This is a 12-04 fresh-login verification gap, not evidence of a new CRUD failure.
- Long-run receipt eviction and concurrent creation on PostgreSQL were source-reviewed; the executed race check used SQLite. Parent PostgreSQL browser checks established ordinary save/readback/resume behavior.

## User Setup Required

None for this slice. Existing Cognito, PostgreSQL, and example-account configuration are reused; shared reference files ship with the application images.

## Next Phase Readiness

The durable profile contract and home-save/resume slice support all four onboarding pages. UI rollout is integrated, with final phase-wide verification and acceptance maintained by the parent under 12-04. Commit metadata and shared actuals remain for parent reconciliation.

---
*Phase: 12-travel-studio-onboarding*
*Completed: 2026-10-05*

## Aggregated implementation commits

- `324ae15` — shared catalogs, Google lookup and packaging (12-02).
- `b306854` — profile save/resume, auth proxy and memory projection (12-01/12-04).
- `7bb93df` — four-screen UI, account routing and prototype cleanup (12-03/12-04).

Plans shared integration files; commits are grouped by coherent responsibility rather than duplicate per-task commits. Final verification scope and limitations are in `artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md`. No push or main merge was performed.
