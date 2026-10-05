---
phase: quick-261005-s1w
plan: "01"
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [ONB-12-01, ONB-12-02, ONB-12-03, ONB-12-08, ONB-12-09]
files_modified:
  - services/crud/profile_schemas.py
  - services/shared/traveler_profile.py
  - services/agent/memory.py
  - frontend/src/features/onboarding/places.js
  - frontend/src/features/onboarding/steps/HomeStep.jsx
  - frontend/src/features/onboarding/onboarding.css
  - frontend/src/features/onboarding/components/HomeLocationMap.jsx
must_haves:
  truths:
    - A traveler selects an address and an optional airport through Google-assisted search and sees distinct selected markers within the B layout.
    - Continue saves the confirmed full address in CRUD; reload preserves it and resolves map coordinates from the saved place ID.
    - home_city.name remains a city and default_airport remains an explicitly selected catalog IATA code.
    - Routine agent context and memory exclude the precise address; other saved profile values and progress survive.
  artifacts:
    - path: frontend/src/features/onboarding/steps/HomeStep.jsx
      provides: Address and airport selection without duplicate required city input
    - path: services/crud/profile_schemas.py
      provides: Additive optional bounded home_city.address contract
  key_links:
    - from: frontend/src/features/onboarding/steps/HomeStep.jsx
      to: services/crud/profile_schemas.py
      via: Existing saveOnboardingStep PATCH and ProfileOutput readback
    - from: services/agent/memory.py
      to: services/shared/traveler_profile.py
      via: Shared nested profile sanitization
---

<objective>
Apply the user's Phase 12 follow-up directly to the selected B Travel studio: map-based address and preferred-airport selection, saving the full address explicitly. The latest request overrides the prior prohibition on street addresses only for the dedicated home_city.address field. Existing Phase 12 decisions D01/D-01, D02/D-02, D06/D-06, D07/D-07, D09/D-09 and D10/D-10 otherwise remain in force.
</objective>

<context>
@docs/skills/travella-testing/SKILL.md
@.agents/skills/travella-local/SKILL.md
@.planning/phases/12-travel-studio-onboarding/12-CONTEXT.md
@frontend/src/features/onboarding/steps/HomeStep.jsx
@frontend/src/features/onboarding/places.js
@frontend/src/lib/googleMaps.js
@services/crud/profile_schemas.py
@services/crud/profile.py
@services/shared/traveler_profile.py
@services/agent/memory.py
</context>

## Execution boundaries

This is a bounded quick follow-up, using the existing proven frontend → authenticated CRUD → JSON profile persistence path. Use three sequential tasks below. Reuse existing dependencies and Google loader. Preserve B's remaining steps, existing profile values, completion rules, idempotency and revision checks. No account resets, cloud provisioning, database replacement or prototype alternatives. Parent orchestrator owns verification and evidence. No automated tests are added or run in this work; use build, real browser and direct HTTP checks.

<tasks>
<task type="auto">
  <name>1. Persist a dedicated full address and enforce privacy at projections</name>
  <files>services/crud/profile_schemas.py, services/shared/traveler_profile.py, services/agent/memory.py</files>
  <action>Add HomeCity.address as an optional string, default None, max_length 500. Trim it and reject control characters; permit full street-address text only in this dedicated field. Continue accepting old city-only profiles. Preserve HomeCity.name as the validated city, country_code as a catalog country, place_id for Google selections, and source. The existing repository merges the home step into its JSON payload and returns ProfileOutput; use this additive path, preserving revision/event receipts and other fields (D-06, D-07, D-10). derive_legacy_fields must continue producing only city plus optional IATA. Change profile_context to copy and allowlist the nested home_city fields, excluding address without mutating the canonical input. Reuse this sanitization inside AgentCore sync_profile and sanitize retrieved advisory data before exposure so its independent shallow PROFILE_FIELDS filter cannot leak a precise address (D-09). Preserve empty/cleared values and canonical-over-memory precedence. No address or raw request payload in logs, error text, analytics, URLs or checkpoints.</action>
  <verify><automated>git diff --check</automated><manual>Parent performs authenticated PATCH /v1/traveler-profile/onboarding followed by GET /v1/traveler-profile through real FastAPI and the local database. Assert exact address, city, country and IATA persistence, preserved unrelated fields, old city-only compatibility, length/control-character rejection, missing-auth rejection, and conflict/retry behavior. Inspect actual sanitized projection output without printing personal data.</manual></verify>
  <done>CRUD accepts and reads back the explicit address while city compatibility survives; all routine agent and memory projections exclude address.</done>
</task>

<task type="auto">
  <name>2. Replace the home form with map-based address and airport selection</name>
  <files>frontend/src/features/onboarding/places.js, frontend/src/features/onboarding/steps/HomeStep.jsx, frontend/src/features/onboarding/components/HomeLocationMap.jsx, frontend/src/features/onboarding/onboarding.css</files>
  <action>In the selected B home step, place a responsive Google map alongside or beneath the two search controls, preserving the overall studio split and live preview (D-01). Replace city-only predictions with address search and narrow place details sufficient for formatted address, city/locality, country, place ID and transient coordinates. Selecting a result fills the single confirmed address and the city/country fields used by the existing contract; remove the second required city-name entry from the Google path. Display the full address being saved and commit only on Continue. Resolve locality or postal_town using explicit component types, with no guessed city from display text; if a result lacks a usable city, offer manual correction/fallback. Keep city+country manual fallback usable when Google is unavailable, with an optional dedicated full-address field and an honest unverified map state.

Add Google airport search alongside nearby catalog suggestions. Google candidates are selectable as preferred airports only after an unambiguous match to the known airport catalog by stable identity or normalized name/known alias plus country and coordinates; require airport place type, and reject ambiguous/non-airport results. Never infer an IATA code from arbitrary text. Catalog search by exact IATA remains available; persist only the selected known code. Show a distinct home marker, selected airport marker and fit bounds to both; selecting an airport is optional and clearing it removes its marker (D-02). Changing the confirmed home visibly clears the airport for explicit reselection. Keep draft changes local until Continue (D-06).

Extend the existing session-token, debounce, stale-response and retry handling separately for address and airport lookups. Provide keyboard-accessible result lists and text equivalents to markers, real loading/error/empty states, clear selections and provider attribution. Use the existing Google loader and clean up map listeners/markers on unmount. Keep coordinate and raw provider objects in component/adapter memory. On resume, fetch map details by the saved home place_id; obtain airport marker coordinates from the catalog. Show saved text even if rehydration fails, and do not overwrite saved identity because a provider lookup fails. Confirm applicable Google retention/attribution conditions before persisting Google-derived display text; record the resolution, keeping the user-authorized full-address save requirement intact.</action>
  <verify><automated>npm --prefix frontend run build</automated><manual>Parent exercises address search, exact selected full-address display, home marker, airport search/catalog matching, selected airport marker, clear, Continue, Back and reload. Confirm there is no duplicate required city input, no save on typing, no unrecognized IATA persistence and no durable coordinates.</manual></verify>
  <done>The B home screen supports usable address and optional airport search with clear map markers; confirmed full address saves and resumes while other onboarding steps retain their behavior.</done>
</task>

<task type="auto">
  <name>3. Rebuild the local stack and record browser/API evidence</name>
  <files>artifacts/testing/2026-10-05-onboarding-home-map/verification.md, artifacts/testing/2026-10-05-onboarding-home-map/plan/home-map.jpg, artifacts/testing/2026-10-05-onboarding-home-map/implementation/home-map-desktop.jpg, artifacts/testing/2026-10-05-onboarding-home-map/implementation/home-map-mobile.jpg</files>
  <action>Parent follows travella-local to rebuild this checkout with bash scripts/start-local-ready.sh and use the canonical http://localhost:5174 origin. Capture the current home step and a small reviewable layout sketch/preview before implementation; use the selected B as the design basis, with no variant-selection round. Authenticate once as the configured example account using the ignored credential file without disclosing its contents. Use Chrome DevTools to exercise the changed journey, desktop/mobile layout, map and autocomplete keyboard behavior, error/empty states, save failure, Back, persisted reload and marker rehydration. Inspect console/network errors and screenshots. Exercise the changed profile PATCH/GET through HTTP with the real local database and verify values plus preserved fields, invalid input, unauthorized access, idempotency and revision conflict. Use only verification records created for the run for destructive cleanup; do not reset existing onboarding/account data to force entry. Document a blocker if current completion state prevents the real journey rather than claiming it passed. Record sanitized commands, status and observations in verification.md and link evidence in the final delivery.</action>
  <verify><automated>npm --prefix frontend run build</automated><manual>Chrome DevTools screenshots and network/console inspection plus direct authenticated HTTP persistence checks are required delivery gates. A successful build alone does not complete this task.</manual></verify>
  <done>Rebuilt application has been exercised with inspected visual evidence and HTTP persistence results; every failed or blocked check is reported explicitly.</done>
</task>
</tasks>

<threat_model>
| Boundary / threat | Severity | Disposition | Mitigation |
|---|---|---|---|
| Browser → CRUD: malformed address or unauthorized profile update | high | mitigate | Bounded dedicated field; existing token-derived ownership, validation, revisions and event replay |
| CRUD → agent/memory: precise-address disclosure | high | mitigate | Nested allowlist in profile_context plus memory adapter boundary; city-only legacy field |
| Google → browser: stale/ambiguous place selection | medium | mitigate | Independent request generations, bounded details, deterministic airport matching, explicit confirmation |
| Address → UI/logs: injection or personal-data exposure | high | mitigate | React text rendering; avoid raw logging/query URLs; transient coordinates; sanitized evidence |
</threat_model>

## Source coverage audit

| Source | Scope | Task | Status |
|---|---|---|---|
| GOAL | Selected B deterministic, saved/resumable onboarding follow-up | 1–3 | Covered |
| REQ | ONB-12-01/02/03: B home, explicit saves/resume, city and optional airport | 1–3 | Covered |
| REQ | ONB-12-08/09: safe profile/memory projection and browser/API evidence | 1, 3 | Covered |
| CONTEXT | D01/D02/D06/D07/D09/D10 plus latest full-address instruction | 1–3 | Covered |
| RESEARCH/CONTEXT | Existing Google loader/session/attribution and retention prerequisite | 2 | Covered; confirm retention condition during execution |

Other Phase 12 steps and deferred settings/AI/storage work remain outside this quick follow-up. This plan does not re-plan their already established implementation.

<output>
Create SUMMARY.md beside this PLAN.md with implemented files, executed checks, screenshot links and any remaining blockers. No commit is requested by this planning delegation.
</output>
