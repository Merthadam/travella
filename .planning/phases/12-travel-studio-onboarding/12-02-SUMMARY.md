---
phase: 12-travel-studio-onboarding
plan: "02"
subsystem: onboarding
tags: [react, fastapi, google-places, travel-catalogs, profile]

# Dependency graph
requires:
  - phase: 12-travel-studio-onboarding/12-01
    provides: onboarding flow contract, authenticated profile step-save interface, and selected design direction
provides:
  - Canonical shared country, interest, and scheduled-service airport catalogs
  - Google Places city autocomplete adapter and retryable shared Maps loader
  - Onboarding home, citizenship, needs, and interests flow with step-scoped profile persistence
  - Strict profile validation, legacy compatibility, and bounded agent profile projection
affects: [onboarding, profile-memory, agent-context, docker-packaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared checked-in JSON catalogs are consumed by frontend and CRUD validation
    - Google place predictions/details stay transient; onboarding persists user-entered city text and approved identifiers
    - Onboarding step saves use revision and event identifiers with per-step allowlisted fields

key-files:
  created:
    - services/shared/travel_reference/countries.json
    - services/shared/travel_reference/interests.json
    - services/shared/travel_reference/airports.json
    - services/shared/travel_reference/README.md
    - frontend/src/features/onboarding/catalogs.js
    - frontend/src/features/onboarding/places.js
    - frontend/src/features/onboarding/OnboardingFlow.jsx
    - frontend/src/features/onboarding/steps/HomeStep.jsx
    - frontend/src/features/onboarding/steps/CitizenshipStep.jsx
    - frontend/src/features/onboarding/steps/NeedsStep.jsx
    - frontend/src/features/onboarding/steps/InterestsStep.jsx
    - frontend/src/lib/googleMaps.js
    - artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md
  modified:
    - frontend/src/PlansApp.jsx
    - frontend/src/AccountApp.jsx
    - frontend/src/FirstLoginOnboarding.jsx
    - frontend/src/api.js
    - frontend/src/main.jsx
    - frontend/vite.config.js
    - Dockerfile.frontend
    - services/crud/api.py
    - services/crud/contracts.py
    - services/crud/profile.py
    - services/crud/profile_schemas.py
    - services/auth/api.py
    - services/auth/crud_client.py
    - services/auth/agent_client.py
    - services/agent/crud_client.py
    - services/agent/http_contracts.py
    - services/agent/memory.py
    - services/agent/request_context.py
    - services/agent/service.py
    - services/agent/turn.py

key-decisions:
  - "Keep catalogs in services/shared/travel_reference so the frontend and backend validate against one canonical source."
  - "Use OurAirports public-domain rows filtered to scheduled service and valid unique IATA codes; rank nearby airports by straight-line distance."
  - "Persist only user-entered city text, Google place ID, country code, and selected airport code; keep provider coordinates and prediction objects transient."
  - "Keep legacy profile values until the traveler explicitly replaces them; preserve per-step save and skip semantics."

patterns-established:
  - "Catalog modules are static, bundled data; airport data is loaded lazily and cached in the frontend."
  - "The shared Google Maps loader supports retry after script failure and loads requested libraries through importLibrary."

requirements-completed: []

# Coverage remains with a human while parent final verification is pending.
coverage:
  - id: D1
    description: "Shared reference catalogs validate country, interest, and airport selections without runtime model/provider lookup."
    verification:
      - kind: integration
        ref: "artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md — catalog validation and profile persistence checks"
        status: pass
    human_judgment: true
    rationale: "Parent final verification is still pending; the artifact records the API exercise but does not establish every packaged runtime path."
  - id: D2
    description: "City autocomplete resolves a selected city and exposes nearby airport choices without persisting provider coordinates."
    verification:
      - kind: manual_procedural
        ref: "Parent browser report: Budapest resolved via ArrowDown+Enter; country HU, place ID, and location returned; nearby airport candidates rendered."
        status: pass
    human_judgment: true
    rationale: "Container rebuild is underway; manual-city, error/retry, and final browser checks remain pending."

# Metrics
duration: "not recorded (multi-agent execution)"
completed: 2026-10-05
status: implemented
verification_status: pending-parent-final-check
---

# Phase 12 Plan 02: Place selection and reference catalogs Summary

**Shared travel catalogs, city autocomplete, nearby airport suggestions, and step-scoped onboarding profile saves are implemented; parent container/browser verification remains in progress.**

## Performance

- **Duration:** Not recorded (multi-agent execution)
- **Started:** Not recorded
- **Completed:** 2026-10-05 (implementation handoff)
- **Tasks:** 3 implementation tasks
- **Files modified:** See the created and modified file inventory above; parent and parallel workers shared the implementation.

## Accomplishments

- Added 249 ISO 3166-1 alpha-2 country entries, 20 curated starter interests, and 4,133 scheduled-service airport entries in `services/shared/travel_reference/`. Source, snapshot date, license, and deterministic airport filtering are documented in its README.
- Added frontend catalog loading and a Places Data API adapter with city-only predictions, session tokens, narrow `location` and `addressComponents` detail fields, stale-query suppression, nearby airport distance ranking, and manual airport search.
- Extracted the shared retryable Maps loader and switched PlansApp to use it. For a newly inserted script, it uses Google's callback with `loading=async` as the readiness signal and verifies `importLibrary` before returning; an early script `load` event cannot settle the loader before the callback.
- Integrated the four-step onboarding flow with authenticated step saves, revision and event handling, strict canonical-value validation, legacy profile preservation, and bounded agent profile projections.
- Parent-reported browser check resolved Budapest by keyboard, returned country `HU`, place ID, and transient location, displayed the five nearest airport options (BUD about 18 km; SLD 127 km; BTS 156 km; SOB 169 km; PEV 178 km), then saved and read the home profile back with HTTP 200. Parent reported no model calls.

## Verification

- **Frontend build:** Parent reports `npm --prefix frontend run build` passed with only the existing bundle-size warning.
- **API:** The manual CRUD record at `artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md` reports passing real FastAPI handler checks for reads, saves, validation, idempotent replay, stale revisions, ownership separation, legacy compatibility, and persistence. It used an isolated SQLite fixture and no model or memory-provider calls.
- **Browser:** Parent reports the selected-city and airport flow described above worked. Screenshots are available under `artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/`.
- **Pending:** Parent's final container rebuild/browser retest is underway after switching Maps readiness to the documented callback. Manual city entry and the latest loading/error/retry states have not yet received final verification. Therefore this summary records implementation status, while the two plan requirements remain unmarked complete.
- **Automated tests:** Not added or run, per the plan and user instruction.

## Files Created/Modified

- `services/shared/travel_reference/countries.json` - Full country/territory catalog.
- `services/shared/travel_reference/interests.json` - Curated starter interest list.
- `services/shared/travel_reference/airports.json` - Filtered scheduled-service airports with IATA codes and coordinates.
- `services/shared/travel_reference/README.md` - Sources, versions, filters, and licensing notes.
- `frontend/src/features/onboarding/catalogs.js` - Bundled country/interests exports and lazy airport import.
- `frontend/src/features/onboarding/places.js` - Google city search/details adapter and local airport ranking/search.
- `frontend/src/lib/googleMaps.js` - Retryable Maps script loader shared by onboarding and PlansApp.
- `frontend/src/PlansApp.jsx` - Uses the extracted shared loader.
- `frontend/src/features/onboarding/` - Onboarding flow, steps, profile preview, and styles.
- `services/crud/`, `services/auth/`, and `services/agent/` - Profile step API, validation, persistence, and allowlisted context integration.
- `frontend/src/AccountApp.jsx`, `frontend/src/FirstLoginOnboarding.jsx`, `frontend/src/api.js`, `frontend/src/main.jsx`, `frontend/vite.config.js`, and `Dockerfile.frontend` - Onboarding routing, transport, shared catalog packaging, and Vite access configuration.
- `artifacts/testing/2026-10-05-travel-studio-onboarding/` - Browser screenshots and manual API evidence.

## Decisions Made

- Shared catalogs live under `services/shared/travel_reference/`, which both the backend and packaged frontend can consume.
- Airport candidates are a static OurAirports snapshot filtered to scheduled service and valid unique IATA codes; distances are approximate great-circle distances within 250 km and cross-border airports are allowed.
- Google details remain in transient adapter state. Only the provider place ID and independently supplied profile values are saved.
- No runtime catalog download, automated test suite, model inference, or memory-provider invocation was used for the catalog and onboarding flow.

## Deviations from Plan

- Catalog paths moved from the planned `frontend/src/features/onboarding/data/` directory to the canonical shared `services/shared/travel_reference/` location so CRUD validation and frontend display use identical data. Docker packaging and frontend imports were updated accordingly.
- Parent integration included the broader step-scoped CRUD, auth, and agent-context work required to connect this plan to the existing profile flow.

## Issues Encountered

- Google Maps emitted a loading-strategy warning in the manual browser run. The shared loader now uses Google's documented `loading=async` URL parameter and readiness callback; parent is rebuilding the container for a final first-load and Retry check.

## Next Phase Readiness

Implementation is ready for parent final verification. Complete the container rebuild and verify manual city entry plus loading/error/retry behavior before treating ONB-12-03 and ONB-12-04 as fully verified or starting dependent work.

---
*Phase: 12-travel-studio-onboarding*
*Completed: 2026-10-05 (implementation handoff; final verification pending)*

## Aggregated implementation commits

- `324ae15` — shared catalogs, Google lookup and packaging (12-02).
- `b306854` — profile save/resume, auth proxy and memory projection (12-01/12-04).
- `7bb93df` — four-screen UI, account routing and prototype cleanup (12-03/12-04).

Plans shared integration files; commits are grouped by coherent responsibility rather than duplicate per-task commits. Final verification scope and limitations are in `artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md`. No push or main merge was performed.

Final browser first-load callback check passed: five Prague suggestions; initial ArrowUp selected final option; Enter resolved selected city and nearby airports. Final offline Retry remains unverified.
