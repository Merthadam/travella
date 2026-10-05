---
phase: 12-travel-studio-onboarding
reviewed: 2026-10-05T14:16:54Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - Dockerfile.frontend
  - compose.yaml
  - frontend/package.json
  - frontend/src/AccountApp.jsx
  - frontend/src/FirstLoginOnboarding.jsx
  - frontend/src/PlansApp.jsx
  - frontend/src/api.js
  - frontend/src/main.jsx
  - frontend/src/prototypes/OnboardingPrototype.jsx
  - frontend/src/prototypes/onboarding-prototype.css
  - frontend/vite.config.js
  - frontend/src/lib/googleMaps.js
  - frontend/src/features/onboarding/OnboardingFlow.jsx
  - frontend/src/features/onboarding/catalogs.js
  - frontend/src/features/onboarding/places.js
  - frontend/src/features/onboarding/onboarding.css
  - frontend/src/features/onboarding/components/ProfilePreview.jsx
  - frontend/src/features/onboarding/components/StepActions.jsx
  - frontend/src/features/onboarding/steps/HomeStep.jsx
  - frontend/src/features/onboarding/steps/CitizenshipStep.jsx
  - frontend/src/features/onboarding/steps/NeedsStep.jsx
  - frontend/src/features/onboarding/steps/InterestsStep.jsx
  - services/agent/crud_client.py
  - services/agent/http_contracts.py
  - services/agent/memory.py
  - services/agent/request_context.py
  - services/agent/service.py
  - services/agent/turn.py
  - services/auth/agent_client.py
  - services/auth/api.py
  - services/auth/crud_client.py
  - services/crud/api.py
  - services/crud/contracts.py
  - services/crud/profile.py
  - services/crud/profile_schemas.py
  - services/shared/traveler_profile.py
  - services/shared/travel_reference/airports.json
  - services/shared/travel_reference/countries.json
  - services/shared/travel_reference/interests.json
  - services/shared/travel_reference/README.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 12 frontend integration review

This is an author self-review by the UI implementation agent, with a browser finding supplied by the parent integration agent. It is not an independent review. This pass inspected source only; no tests were added or run.

## Scope

Reviewed `frontend/src/features/onboarding/OnboardingFlow.jsx`, all four step components, `components/ProfilePreview.jsx`, `components/StepActions.jsx`, `onboarding.css`, `places.js`, `catalogs.js`, `frontend/src/api.js`, `frontend/src/AccountApp.jsx`, `frontend/src/lib/googleMaps.js`, and the shared-loader call site in `frontend/src/PlansApp.jsx`. Read `services/crud/profile_schemas.py` only to compare frontend limits with the server contract. This is not a backend authorization or security audit.

The review covered saved-step resume, explicit Continue/Skip requests, draft preservation, event identity on retry, stale-revision recovery, completion routing, lookup cancellation, optional airport selection, legacy data display, and interest count/length constraints. The required editable city name after Google selection is the accepted provider-retention design, not a finding.

## Findings and changes

| Priority | Finding | Resolution | Evidence limit |
| --- | --- | --- | --- |
| P1 | A background session request failing because the network was unavailable could route to sign-in and discard an unsaved onboarding draft. | Parent changed `AccountApp.jsx:50` to route away only for HTTP 401; temporary network/server errors preserve the mounted form. | Found by the parent during browser verification. This pass inspected the fix; browser recheck belongs to the integration evidence. |
| P2 | Preset interest additions bypassed the 1,000-character combined-interest limit. A traveler could add custom interests near the limit, select another preset, then receive a generic 422 on completion. | `InterestsStep.jsx:14` now uses one `fitsProfile` check for both preset and custom additions. Removing an interest remains possible. Matching a catalog interest through the text input is not incorrectly blocked by the separate 20-custom-interest limit. | Source path inspected after change; this edge case was not exercised in a browser by this reviewer. |
| P3 | Pressing ArrowUp before any city suggestion was active selected the second-to-last result. | `HomeStep.jsx:69` now starts at the final suggestion; subsequent ArrowUp presses wrap normally. | Source path inspected after change; keyboard browser recheck belongs to integration verification. |

No additional concrete regressions were found in the reviewed paths. No claim is made about unreviewed code or exhaustive race coverage.

## Checks and remaining delivery gates

- `git diff --check` passed after the source fixes.
- The UI production build passed before this review. The parent will run the final build after integrating these fixes; this document does not claim that later build has run.
- Chrome DevTools exercise, screenshots, console/network inspection, persisted readback, and the final build remain governed by `docs/skills/travella-testing/SKILL.md` and `12-VALIDATION.md`. The parent owns their evidence under `artifacts/testing/2026-10-05-travel-studio-onboarding/`.

## Narrative Findings (AI reviewer)

Independent standard review of the Phase 12 production changes and new source against `HEAD`, with targeted tracing through authentication, profile persistence, memory/context readers, and deployment packaging. The author review above is preserved as a separate historical record. The scope includes the two prototype deletions; catalogs were reviewed as reference data. No structural pre-pass was supplied.

### CR-01: BLOCKER — Frontend container moved away from its mounted configuration — resolved in source

**File:** `/Users/adammerth/.superset/worktrees/7718c7a9-dea7-4520-aacf-2cd62896751c/zircon-poet/Dockerfile.frontend:3`; related `/Users/adammerth/.superset/worktrees/7718c7a9-dea7-4520-aacf-2cd62896751c/zircon-poet/compose.yaml:164`.

**Issue:** Moving the frontend working directory to `/app/frontend` left the multi-container Compose environment file mounted at `/app/.env.local`. Vite loads environment files from its project root, while `.dockerignore` prevents them from being copied into the image. The Compose service supplies only `VITE_API_TARGET` directly. Consequently the browser Maps key disappears in this deployment, disabling both existing Plans maps and onboarding city lookup.

**Fix:** Mount `frontend/.env.local` at `/app/frontend/.env.local` to match the new root. The parent applied this correction during review; the reviewer reopened `compose.yaml` and confirmed the matching path. No multi-container startup was performed by this reviewer.

### WR-01: WARNING — Interest uniqueness differs between browser and server — resolved in source

**File:** `/Users/adammerth/.superset/worktrees/7718c7a9-dea7-4520-aacf-2cd62896751c/zircon-poet/frontend/src/features/onboarding/steps/InterestsStep.jsx:4`; related `/Users/adammerth/.superset/worktrees/7718c7a9-dea7-4520-aacf-2cd62896751c/zircon-poet/services/crud/profile_schemas.py:145`.

**Issue:** The UI uses locale-dependent lowercase, while CRUD uses Unicode case folding. For example, custom interests `Straße` and `STRASSE` plus three other distinct selections are counted as five by the UI but as four by CRUD. Completion becomes enabled and then receives a generic 422. Locale-dependent casing also makes counts depend on browser locale.

**Fix:** Use the same deterministic normalization contract on both sides, such as JavaScript `toLowerCase()` and Python `lower()`, retaining whitespace normalization. The parent applied these changes during review. The reviewer reopened both exact locations and confirmed locale-independent `toLowerCase()` in the UI and `lower()` throughout the server uniqueness calculation. The Unicode edge case was not exercised dynamically by this reviewer.

### Independent review status and limits

**Final status: clean at source-review scope.** Both independently confirmed findings are resolved in the final source reread; no unresolved findings remain. Frontmatter counts describe unresolved findings only, with the findings retained above for traceability. Delivery verification remains separate.

No additional concrete authorization, atomic-write, idempotency, or memory-projection regressions were established. The reviewer traced the authenticated profile PATCH through the proxy and repository, legacy PUT preservation, saved/skipped progress, conflict/retry state, structured profile read validation, explicit-empty projections, and the canonical-profile precedence over memory. This conclusion is limited to reviewed source and does not imply exhaustive correctness.

The concurrent Maps-loader correction was independently reread: newly inserted asynchronous scripts now resolve through the Google callback. The original loader race is therefore not listed as an unresolved finding. Final deployed browser behavior remains the parent's verification responsibility.

No source files were modified by the reviewer. No tests were added or run, no paid model/memory calls were made, and no private `.cache` account snapshot was opened. Browser, live CRUD, final build, and fresh-sign-in outcomes remain in the parent verification artifacts; their success is not inferred from this review.

_Independent reviewer: gsd-code-reviewer; depth: standard; 2026-10-05._
