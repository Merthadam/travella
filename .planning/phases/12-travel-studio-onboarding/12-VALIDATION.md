---
phase: 12
status: planned
nyquist_compliant: false
wave_0_complete: false
---
# Validation plan — not yet executed

No automated tests are authorized by this planning request. Use existing build command and manual Chrome DevTools/direct HTTP checks when implementing. Do not report these planned checks as executed.

1. Build: npm --prefix frontend run build; nonzero is failure. Existing bundle warning is tracked separately.
2. Direct profile API, isolated traveler fixtures: create first saved step, GET readback, update next step without erasing prior fields, reload/resume; reject missing-home completion, 1–4 interest completion without skip, unknown IDs, malformed city and oversized text. Explicit clear persists. Duplicate event replays same result; stale expected_revision conflicts. Unknown/unauthorized identities cannot access another profile; no browser subject accepted. There is no new DELETE endpoint; cover clearing nullable/list values as updates.
3. Legacy completed account: opens prefilled v2, preserves unrecognized text, persists progress, completes once and stays on Plans after relogin. Legacy PUT cannot erase v2 state.
4. New account: required home, optional airport and all other pages skip; complete with zero interests through Skip. Alternative path choose five incl custom, remove one to disable, restore to enable.
5. Google: real lookup, disambiguation, stale query response, empty result, blocked loader, manual city fallback, nearby airport and name/IATA search. No provider keys/raw payloads in evidence.
6. Memory: saved city, airport, citizenship, needs and interests reach canonical profile context of later Plan turns. Inspect deterministic context boundary first; live paid model call only if separately authorized. Mirror outage does not roll back save; cleared fields do not resurrect. Progress metadata absent from model inputs.
7. Chrome DevTools example account per docs/skills/travella-testing/SKILL.md. Four screens, Back, network save error + retry, reload/resume, keyboard combobox/cards/bubbles, reduced motion, desktop and true 390px viewport. Inspect console/network and screenshots.
8. Save screenshots under artifacts/testing/<execution-date>-travel-studio-onboarding/implementation/ and exact checks/results in verification.md. Clean up only created fixtures; preserve existing account preferences.

Baseline visual evidence already exists in artifacts/testing/2026-10-05-onboarding-prototypes/. True 390px prototype check was blocked by browser minimum window width; use device emulation at implementation time.
