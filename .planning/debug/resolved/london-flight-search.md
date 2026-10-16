---
status: resolved
trigger: Budapest to London, October 23–26 2026, one adult fails repeatedly in chat; agent refuses altered search.
created: 2026-10-16
updated: 2026-10-16
---

## Symptoms
Expected: provider-backed flight options or an accurate actionable failure; explicit retry/alteration request should be handled naturally.
Actual: generic unavailable response, then agent claims it cannot change airports/dates. Manual BUD–LIS succeeded earlier today.

## Current Focus
hypothesis: confirmed city-code validation gap and generic failure masking; original historical tool arguments unavailable.
next_action: completed; verified live Heathrow and Gatwick searches and test Plan cleanup.

## Evidence
- Chat observer caps provider calls at 45 seconds; manual HTTP route allows 128 seconds, private connector 115 seconds.
- All observer exceptions lose their type and become generic unavailable; provider failure codes are discarded.
- Model-selected typed FlightSearch skips the legacy airport resolver, which is appropriate for validated actual airport codes but requires checking selected London code.

## Resolution
Fix implemented in 3d9e7ff; GSD debug executed inline under the skill's Codex spawn restriction.

- Live private connector reproduction: BUD–LON on 2026-10-23/26 for one adult returned provider_response_invalid in 1.6 seconds. BUD–LHR with otherwise identical criteria returned 100 options in 13.3 seconds. A second LHR probe validated all 100 options through safe_flight. LON is absent from the actual-airport catalog, LHR present.
- Original tool arguments are not persisted, so the original user's chosen airport code cannot be established retrospectively. This reproduction establishes a real airport-validation failure consistent with the symptom, not proof of the original request's code.
- Fix in progress: reject city/unknown airport codes before provider calls with a recoverable airport-selection error; preserve allow-listed failure codes; clarify explicit retry/alternative-airport handling; allow flight latency up to the existing overall turn deadline instead of a fixed 45-second cap.

- Verification: 248 regression tests passed. Four rebuilt runtime files matched local hashes; startup/authentication passed on 5175.
- Live SDK/browser: natural retry/alter request chose LHR and displayed 3 of 91 results; “try Gatwick instead” retained dates/adult party and displayed 3 of 81. Manual page preloaded BUD–LGW/date/country/results correctly. Saved revision unchanged.
- Evidence: artifacts/testing/2026-10-16-london-flight-search/verification.md. Original request exact tool arguments unavailable; root-cause attribution for that historical invocation remains limited. Confirmed reproducible validation/error-handling defects fixed.
