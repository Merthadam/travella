---
phase: 12-travel-studio-onboarding
plan: "04"
subsystem: onboarding
tags: [react, cognito, agentcore, memory, profile]
requires:
  - phase: 12-travel-studio-onboarding
    provides: Versioned profile contract, catalogs and four-step UI
provides:
  - Versioned onboarding rollout and completed-user Plans routing
  - Shared allowlisted profile projection with explicit-clear semantics
  - Browser/API evidence and preserved example-account data
affects: [profile-memory, account-routing]
tech-stack:
  added: []
  patterns: [canonical-profile-precedence, non-agentic-intake]
key-files:
  created:
    - artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md
  modified:
    - frontend/src/AccountApp.jsx
    - frontend/src/FirstLoginOnboarding.jsx
    - frontend/src/api.js
    - services/auth/agent_client.py
    - services/auth/api.py
    - services/agent/http_contracts.py
    - services/agent/memory.py
    - services/agent/crud_client.py
    - services/agent/request_context.py
    - services/agent/service.py
    - services/agent/turn.py
key-decisions:
  - Canonical profile fields include explicit null/empty values and exclude progress metadata
  - Draft saves do not wait for AgentCore; final sync remains bounded and best effort
  - Transient session-check errors preserve an in-progress form; only401 signs out
  - Prototype implementation removed from production entry; historical prototype commit preserved
requirements-completed: [ONB-12-02, ONB-12-08]
status: implemented
completed: 2026-10-05
---

# Plan12-04: Prefilled rollout and profile memory

**The selected intake flow now saves directly through CRUD and supplies structured preferences through the existing memory/context boundary.**

## Accomplishments

- Account routing uses `onboarding.completed_version`, showing old completed users the prefilled v2 flow once. The old agentic onboarding component is a compatibility re-export and its frontend model call was removed.
- One shared profile allowlist carries city, airport, citizenship, needs and interests through auth sync, runtime contracts, memory, CRUD reads, service context and bounded turns. It retains empty/null values so stale mirrored preferences cannot resurrect cleared values.
- Draft saves bypass mirror writes. Complete profiles invoke existing bounded best-effort synchronization; a mirror failure cannot roll back the already committed profile.
- Prototype B became feature-local React/Tailwind components. Prototype preview imports and A/C files were removed on `feat/travel-studio-onboarding`; no production merge/push performed.

## Actual verification

See [verification record](../../../artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md) and its screenshot/API links.

- Production build passed, with existing bundle-size warning.
- Chrome authenticated journey: home/airport, citizenship, needs, four-plus-custom interests, disabled four-interest completion, Back, reload/resume, offline failure/retry, stale conflict/reload, completion/Plans and completed reload.
- Synthetic legacy profile: ambiguous departure text displayed; old citizenship/needs/interests prefilled; all optional skips preserved their saved values and completed v2.
- Actual mirror returned `synced`; deterministic context projection passed. No paid model turn or induced AWS outage.
- Original example profile preferences and completion flag restored and compared successfully; restored canonical snapshot mirrored. Plans, credentials and volumes retained.

## Deviations and limits

- Source review required no prompt or graph rewrites: the existing graph consumes the updated shared context projection. No startup-skill command changes were necessary.
- Fixed an existing session polling behavior discovered by offline browser exercise; only authentication rejection now discards the mounted session.
- Independent review found the separate frontend Compose mount needed to follow the Docker working-directory change; corrected.
- A later startup sign-in check returned401 while the existing browser session remained valid. Configuration/account/JWKS/clock checks did not reveal the cause; no credential retries or resets. Fresh sign-in after final rebuild remains unverified. ONB-12-07/09 retain this verification gap.
- OS reduced-motion setting, exhaustive async lookup timing, live memory outage and paid downstream conversation behavior were not exercised; source/build checks are not represented as live verification.
- Final loader callback recheck and phase verifier results are recorded in the central evidence and phase verification document.

## Commits

Implementation was split into coherent catalog, backend and UI integration commits by the parent orchestrator. Hashes are added at aggregation.

## Aggregated implementation commits

- `324ae15` — shared catalogs, Google lookup and packaging (12-02).
- `b306854` — profile save/resume, auth proxy and memory projection (12-01/12-04).
- `7bb93df` — four-screen UI, account routing and prototype cleanup (12-03/12-04).

Plans shared integration files; commits are grouped by coherent responsibility rather than duplicate per-task commits. Final verification scope and limitations are in `artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md`. No push or main merge was performed.
