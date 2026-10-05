---
phase: 12-travel-studio-onboarding
verified: 2026-10-05T14:25:28Z
status: human_needed
score: 11/15 must-haves verified
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/phases/12-travel-studio-onboarding/12-01-PLAN.md
  - .planning/phases/12-travel-studio-onboarding/12-01-SUMMARY.md
  - .planning/phases/12-travel-studio-onboarding/12-02-PLAN.md
  - .planning/phases/12-travel-studio-onboarding/12-02-SUMMARY.md
  - .planning/phases/12-travel-studio-onboarding/12-03-PLAN.md
  - .planning/phases/12-travel-studio-onboarding/12-03-SUMMARY.md
  - .planning/phases/12-travel-studio-onboarding/12-04-PLAN.md
  - .planning/phases/12-travel-studio-onboarding/12-04-SUMMARY.md
  - .planning/phases/12-travel-studio-onboarding/12-CONTEXT.md
  - .planning/phases/12-travel-studio-onboarding/12-REVIEW.md
  - .planning/phases/12-travel-studio-onboarding/12-UI-SPEC.md
  - .planning/phases/12-travel-studio-onboarding/12-VALIDATION.md
  - Dockerfile.frontend
  - artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/01-home-desktop.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/02-citizenship-desktop.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/03-needs-desktop.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/04-interests-desktop.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/05-needs-mobile.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/06-offline-error.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/implementation/07-interests-mobile.jpg
  - artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md
  - compose.yaml
  - frontend/package.json
  - frontend/src/AccountApp.jsx
  - frontend/src/FirstLoginOnboarding.jsx
  - frontend/src/PlansApp.jsx
  - frontend/src/api.js
  - frontend/src/features/onboarding/OnboardingFlow.jsx
  - frontend/src/features/onboarding/catalogs.js
  - frontend/src/features/onboarding/components/ProfilePreview.jsx
  - frontend/src/features/onboarding/components/StepActions.jsx
  - frontend/src/features/onboarding/onboarding.css
  - frontend/src/features/onboarding/places.js
  - frontend/src/features/onboarding/steps/CitizenshipStep.jsx
  - frontend/src/features/onboarding/steps/HomeStep.jsx
  - frontend/src/features/onboarding/steps/InterestsStep.jsx
  - frontend/src/features/onboarding/steps/NeedsStep.jsx
  - frontend/src/lib/googleMaps.js
  - frontend/src/main.jsx
  - frontend/vite.config.js
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
  - services/shared/travel_reference/README.md
  - services/shared/travel_reference/airports.json
  - services/shared/travel_reference/countries.json
  - services/shared/travel_reference/interests.json
  - services/shared/traveler_profile.py
covered_digest: "v1:sha256:2f18624bb7ba63d287ecb5473c6b4f908bf6ef7e0fa389c87c41b74a6a7fa2a8"
behavior_unverified: 4
overrides_applied: 0
decision_coverage:
  honored: 0
  total: 0
  not_honored: []
behavior_unverified_items:
  - truth: "Explicit Continue/Skip saves atomically; reopening resumes saved progress even after optional skips."
    test: "After a saved optional Skip on an unfinished profile, reload and continue; retain the saved progress and prior values."
    expected: "The next pending step opens, skipped status counts toward progress, and earlier values remain intact."
    why_human: "Ordinary reload/resume and all-optional-skip completion were exercised separately; an intermediate skipped-step reload is not explicitly recorded."
  - truth: "New fields survive authenticated CRUD, serializers and agent memory projection; stale mirrors cannot erase or resurrect preferences."
    test: "In an isolated follow-up, exercise mirror failure and a stale remembered snapshot after an explicit clear at the deterministic service/context boundary."
    expected: "The committed profile remains saved and later context retains canonical empty/null values; progress metadata remains excluded."
    why_human: "Serialization/clear projections and a real successful mirror were exercised; injected mirror failure and stale-mirror service execution were not."
  - truth: "Actual city suggestions disambiguate results; loading/no-results/failure/Retry work; selected identity survives via approved fields; no unbounded provider payload persistence."
    test: "On the final loader version, fail Google loading then restore connectivity and use Retry; also exercise empty results and obsolete query responses."
    expected: "Retry resolves actual suggestions, manual entry stays available, and old responses never replace current input."
    why_human: "Final first-load and ArrowUp/Enter passed; final offline Retry was abandoned and empty/stale response paths remain source-only."
  - truth: "Existing user sees prefilled v2 once; completing and signing in again shows Plans; no onboarding model endpoint is called."
    test: "Resolve the recorded final-build sign-in 401, then verify a fresh authenticated session routes a completed v2 profile to Plans."
    expected: "Fresh sign-in and session validation succeed, completion persists, and onboarding does not reappear."
    why_human: "Initial login and completed reload succeeded, but a later startup login returned 401 with no established cause. Existing session still returned 200."
human_verification:
  - test: "Fresh sign-in after final rebuild"
    expected: "After resolving the unexplained 401, a completed v2 account signs in and opens Plans."
    why_human: "The final credential exchange failed; the existing authenticated session does not prove relogin. Follow travella-local and do not repeatedly retry or reset credentials."
  - test: "Final Google recovery and async states"
    expected: "Offline loader failure followed by Retry succeeds; no-result and stale-response states remain correct; manual home entry stays usable."
    why_human: "The final callback loader's first load passed, but final Retry and timing edge cases were not completed."
  - test: "Selected B acceptance, keyboard and reduced motion"
    expected: "The user accepts desktop/mobile presentation; keyboard access remains usable; reduced-motion preference removes floating motion."
    why_human: "Screenshots and core keyboard paths were inspected, but OS/browser reduced-motion emulation and complete keyboard acceptance were not performed."
  - test: "Canonical precedence during mirror failure"
    expected: "A failed mirror does not roll back saved data and a stale mirror cannot resurrect cleared preferences in deterministic downstream context."
    why_human: "Real successful mirroring and projection assertions passed; failure/stale-reader execution was source-inspected only. A paid model call is not required."
  - test: "Reopen after an intermediate optional Skip"
    expected: "Saved skipped status and previous values persist; the next pending step opens."
    why_human: "The record proves ordinary reload and all-step Skip completion, but does not explicitly demonstrate this combined transition."
---

# Phase 12: Travel studio onboarding Verification Report

**Phase Goal:** Travelers complete the selected B four-step onboarding UI, save and resume each step, and supply reusable preferences to subsequent Plan conversations without agentic intake.

**Verified:** 2026-10-05T14:25:28Z  
**Status:** human_needed  
**Re-verification:** No — initial verification; no prior VERIFICATION.md or overrides existed.

## Evidence scope

This verification read the roadmap, all four plans and summaries, CONTEXT, UI contract, validation plan, requirements, review, actual implementation, and the independent execution records [browser/build verification](../../../artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md) and [53 direct HTTP/API observations](../../../artifacts/testing/2026-10-05-travel-studio-onboarding/api-verification.md). SUMMARY completion labels were not treated as proof.

The parent explicitly restricted this pass to source and existing evidence: no tests, browser interactions, application/profile/container changes, or commits. Consequently this verifier did not rerun the manual exercises or build. VERIFIED behavior below refers to the named, recorded manual observations corroborated by the actual code, not a newly executed test. No automated test coverage is claimed. The approved phase plan uses direct API/browser checks and prohibits unrequested automated tests.

The API exercise used real FastAPI handlers, isolated SQLite persistence, and two fixture identities. The browser exercise used Chrome DevTools, the example account, Cognito, and the running PostgreSQL stack. These establish different evidence boundaries: SQLite first-save concurrency does not prove PostgreSQL first-save concurrency.

The selected B baseline, final home desktop screenshot, and final interests mobile screenshot were independently viewed in this pass. The execution record documents inspection of all seven screenshots. The source matches the selected split desktop and compact mobile structure, with live draft preview and explicit saved status.

## Goal Achievement

### Observable Truths

All five roadmap criteria are retained. Two clear restatements were merged: Plan 03 recovery details into criterion 2, and Plan 04 memory details into criterion 5. Other plan-specific truths retain separate rows.

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Selected B layout works at desktop and mobile, with top progress and no onboarding model calls. | VERIFIED | OnboardingFlow.jsx:77–89 renders four steps/progress/preview; scoped CSS has desktop/mobile layouts. Inspected home and 390px interests images; execution record reports mobile scrollWidth 390 and network inspection with no intake calls. Motion/overall acceptance still needs human review. |
| 2 | Explicit Continue/Skip saves atomically; reopening resumes saved progress even after optional skips. Back, failure/retry, clear, refresh and final navigation follow saved state. | UNCERTAIN — WARNING, PRESENT_BEHAVIOR_UNVERIFIED | OnboardingFlow.jsx:41–72 awaits PATCH before advancing, retains drafts, reuses retry identity and reloads canonical progress; profile.py:52–97 commits values/progress/receipt together. Recorded save/reload, failure/retry, conflict and all-step Skip pass. Intermediate Skip followed by reload remains unrecorded. |
| 3 | Existing profiles are prefilled and preserved, v2 appears once and completion returns to Plans. | VERIFIED | AccountApp.jsx:30–34/134–142 gates on completed_version. toDraft and legacy labels preserve prior values; legacy browser fixture and API skip/PUT checks passed, with completion/Plans and completed reload observed. Fresh sign-in is the added truth in row 14. |
| 4 | Real city/airport choices and cheap static catalogs replace simulated data; missing provider services have a clear fallback. | VERIFIED | places.js calls live AutocompleteSuggestion and fetchFields; catalogs.js imports shared JSON. Recorded Budapest/Prague lookup, nearby airports, manual PRG lookup, failed Google loader and manual Prague/CZ save. Retry/ordering is assessed separately in row 10. |
| 5 | New fields survive authenticated CRUD, serializers and agent memory projection; stale mirrors cannot erase or resurrect preferences. All chosen preferences reach later Plan context; mirror failure cannot lose profile. | UNCERTAIN — WARNING, PRESENT_BEHAVIOR_UNVERIFIED | ProfileOutput, shared PROFILE_FIELDS, AgentClient, memory request, AgentCoreMemory, CrudContextReader, AgentTurnService and TurnContext retain fields/explicit clears. Recorded deterministic projections and actual synced status pass. Failure/stale-mirror execution is unexercised; source alone cannot close this invariant. |
| 6 | Contracts specify missing vs explicit clear, preserve legacy data, and enforce required home/current completion rules. | VERIFIED | profile_schemas.py:46–180 forbids unknown fields, requires meaningful city/country, prevents home Skip, accepts explicit optional clears; profile.py merges only explicit step values. API record includes invalid home/IDs, explicit clears, legacy PUT omission and completion gating. |
| 7 | PATCH followed by GET returns data and progress together; duplicate retry is safe; stale second tab conflicts; unrelated fields survive. | VERIFIED | profile.py:57–66 checks original receipt before revision; original snapshot replay does not rewrite canonical state. Recorded API replay/readback/changed-event 409, browser stale-tab 409/reload, and subsequent-step preservation. Receipt eviction and PostgreSQL first-create race have separate evidence limits below. |
| 8 | A real authenticated traveler can explicitly save home and resume from canonical API without onboarding agent/model endpoints. | VERIFIED | AccountApp → OnboardingFlow → saveOnboardingStep → auth proxy → authenticated CRUD router. Recorded Google/manual home PATCH200, GET readback and home-to-citizenship reload in the real stack. |
| 9 | Catalog reads incur no model/provider lookup, countries cover full catalog, invalid IDs are rejected and custom entries deduplicate. | VERIFIED | Shared checked-in catalogs; cached Python loader and bundled/lazy frontend imports. README records 249 country entries and filtering provenance. Schema validators and recorded unknown-country/airport/interest and duplicate-custom rejection establish behavior. No inferred interests. |
| 10 | Actual city suggestions disambiguate results; loading/no-results/failure/Retry work; selected identity survives via approved fields; no unbounded provider payload persistence. | UNCERTAIN — WARNING, PRESENT_BEHAVIOR_UNVERIFIED | HomeStep.jsx:25–57 guards callback generations and renders error/manual states; googleMaps.js resets failed promise/script. Final first-load/ArrowUp/Enter succeeded. Final offline Retry was not completed; stale-response and empty-result paths were not induced. HomeCity stores name/country/place ID/source and rejects coordinates; raw predictions stay transient. |
| 11 | Nearby candidates and manual airport search work without repeated airport API charges; airport remains optional and independently represented. | VERIFIED | places.js ranks local catalog within 250 km, caps five, permits cross-border results and offers name/code search. Browser observed BUD choice, five options, PRG manual search; API null-airport clear persisted without clearing city. |
| 12 | Screens match B, editing is deterministic, optional fields skip and deliberate clears work; no profile/settings editor is added. | VERIFIED | Four concrete step components, explicit controls and live preview are mounted; needs are separate free text and citizenships are removable cards. Screenshot comparison plus API clear/legacy-preservation checks; main.jsx mounts only AccountApp, prototype entry removed. Human aesthetic/motion acceptance remains open. |
| 13 | Four items cannot complete; a fifth custom/catalog item can; removal disables completion; Skip can finish with no selection. | VERIFIED | interestCount/InterestsStep and server InterestValues independently enforce uniqueness/minimum; UI observed four/five/remove/restore and custom Rail journeys, API rejected four/duplicate-as-fifth; legacy Skip journey completed with no structured selection. |
| 14 | Existing user sees prefilled v2 once; completing and signing in again shows Plans; no onboarding model endpoint is called. | UNCERTAIN — WARNING, PRESENT_BEHAVIOR_UNVERIFIED | Correct versioned route exists; initial sign-in, prefill, completion and reload passed. Final startup sign-in returned401 while existing session remained200. Cause not established, so relogin cannot be certified. |
| 15 | Screenshots and recorded API/browser results demonstrate agreed flow; limitations are explicit and account/memory data remains intact. | VERIFIED | Seven implementation screenshots and two detailed execution records exist. Record documents original preference/completion restoration, successful canonical remirror and isolated fixture cleanup; no existing Plans, credentials or volumes removed. This verifier did not inspect private backup/cache or modify state. Remaining limits are explicit here. |

**Score:** 11/15 truths verified; 4 present and wired but behavior-unverified. No accepted overrides. No must-have is classified FAILED on the inspected implementation. This score does not close the human delivery gate.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| services/crud/profile_schemas.py and profile.py | Strict contract and atomic persistence | VERIFIED | Substantive schemas, revision/replay handling, storage writes, committed complete snapshots and route usage. |
| frontend/src/features/onboarding/data/countries.json | Shared reference selections | VERIFIED at explicitly permitted shared location | Literal path is absent. Plan 02 T1 explicitly allows canonical shared relocation with packaging changes. Actual services/shared/travel_reference/countries.json is imported by catalogs.js and Python reference_catalog; Dockerfile.frontend copies it. This is authorized path resolution, not a missing deliverable or override. |
| services/shared/travel_reference/{countries,interests,airports}.json and README.md | Real, versioned cheap catalogs | VERIFIED | Concrete static data, provenance/filter descriptions, shared frontend/server validation; airports lazily loaded once. |
| frontend/src/features/onboarding/OnboardingFlow.jsx and steps/components | Four-step UI and real state | VERIFIED | Imported from AccountApp; substantive step controls and real API save/reload; preview uses draft data. |
| frontend/src/AccountApp.jsx | Versioned rollout | VERIFIED | Reads canonical profile after session/sign-in; mounts onboarding below v2 and Plans after completion. Runtime fresh-login limit remains. |
| services/shared/traveler_profile.py and agent serializers/readers | Durable-to-context projection | VERIFIED presence/wiring | Shared allowlist survives intermediate validators and graph request context; behavior uncertainty is separately recorded. |
| frontend/src/lib/googleMaps.js and features/onboarding/places.js | Shared live provider adapter | VERIFIED presence/wiring | Used by HomeStep and PlansApp; callback readiness and retry reset are substantive. Final Retry behavior remains open. |

GSD artifact queries passed Plans 01/03/04 and reported the literal Plan 02 catalog path missing. The actual Plan 02 action explicitly permits its implemented relocation. No separate useOnboardingProfile.js, model migration, prompt rewrite or graph rewrite is necessary to realize the contracts: state is in OnboardingFlow and existing context/graph consumers are wired.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| main.jsx / AccountApp | OnboardingFlow / PlansApp | Imports and completed_version routing | WIRED | Real account response selects actual components. |
| frontend/src/api.js:35 | services/crud/api.py:257 | PATCH /v1/traveler-profile/onboarding through auth proxy | WIRED | request uses credentials; auth/api.py:322–360 derives session token; CrudClient allowlists PATCH; CRUD independently derives me.subject. |
| CRUD router | TravelerProfileRepository | Validated mutation and token subject | WIRED | save_step merges, derives progress, creates bounded replay receipt and commits. GET reads same subject row. |
| HomeStep / citizenship / interests | Shared catalogs and Places | Imports and adapter calls | WIRED | Real data drives lists; home-selected coordinates remain transient. |
| Saved complete profile | AgentClient → memory endpoint / runtime | Best-effort profile sync | WIRED | CRUD call finishes before sync; draft bypasses sync; HTTP/runtime timeout10 with one runtime attempt. |
| CRUD profile | AgentTurnService → graph → TurnContext | ProfileOutput + PROFILE_FIELDS + request context | WIRED | Service sends traveler_profile to graph.run; graph/builder.py:51–57 binds/resets request context, downstream readers use it; TurnContext includes allowed fields. |

The generic GSD key-link query reported all four repeated frontend-to-CRUD links as “Target not referenced in source.” It searches file references; it cannot prove this multi-service HTTP route. Manual route tracing above resolves the heuristic result, supported by actual authenticated browser/API request evidence.

### Data-Flow Trace (Level 4)

| Artifact | Variable | Source | Produces real data | Status |
|---|---|---|---|---|
| OnboardingFlow | saved, data, resolved | Authenticated profile GET/PATCH → persisted TravelerProfile payload | Yes | FLOWING |
| ProfilePreview | city/airport/citizenships/interests | Explicit form draft initially hydrated from canonical GET | Yes; correctly labeled live preview | FLOWING |
| HomeStep | suggestions, nearby airports | Google city predictions/details → temporary location → local airport catalog | Yes | FLOWING |
| CitizenshipStep / InterestsStep | catalog entries and selections | Canonical JSON and explicit user selections | Yes; static catalogs are intended reference data | FLOWING |
| Later Plan context | traveler_profile | Authorized CRUD GET → validated response → shared allowlist → request context/TurnContext | Yes at deterministic boundary | FLOWING; outage/stale-reader invariant unexercised |

No hollow props, fixed fake saved data, or ignored profile fetch result found. Empty adapter returns represent short inputs, obsolete requests, or genuinely empty candidates; they are not placeholder implementations.

### Behavioral Spot-Checks

No runtime commands were executed by this verifier, per assignment. These are reviewed existing observations, not proposed checks reported as runs.

| Behavior | Recorded command/request | Result | Status |
|---|---|---|---|
| Profile create/read/update/clear/auth/ownership/idempotency | Direct httpx HTTP calls to real FastAPI fixture at127.0.0.1:8124 | 53 recorded observations; relevant payloads and readbacks, not just status | PASS, recorded |
| Real authenticated onboarding | Chrome DevTools at localhost:5174, PATCH/GET + UI interaction | Home, citizenship, needs, interests, Back, reload, conflict, retry, legacy and Skip | PASS, recorded scoped paths |
| Final provider first load | Chrome fresh navigation and Prague lookup/ArrowUp/Enter | Five suggestions and chosen city/nearby airports | PASS, recorded |
| Final fresh sign-in | scripts/start-local-ready.sh authentication stage | 401; existing session200; cause unknown | WARNING, unresolved environment/acceptance check |
| Build/source deployment | npm --prefix frontend run build; recorded container file SHA-256 comparisons | 502 modules; known size warning; compared files matched | PASS, recorded |
| Reduced motion, final Google Retry, stale mirror/outage, skipped intermediate reload | Not executed/recorded completely | Source support only | SKIP, human-needed |

### Probe Execution

N/A. This UI/CRUD phase declares no probe scripts, PASS-marker migration or tooling probes. No probe pass is inferred from SUMMARYs.

### Requirements Coverage

| Requirement | Source plans | Description | Status | Evidence |
|---|---|---|---|---|
| ONB-12-01 | 01,03 | B desktop/mobile, deterministic navigation/progress | NEEDS HUMAN acceptance | Implemented and core layout exercised; final motion/keyboard acceptance pending. |
| ONB-12-02 | 01,04 | Explicit atomic saves, resume, retry/conflict, skip | NEEDS HUMAN combined transition | Main API/browser cases pass; intermediate Skip+reload not expressly recorded. |
| ONB-12-03 | 02 | Required home, Google/manual fallback, optional airport | NEEDS HUMAN final recovery | Live lookup/manual save/airport verified; final loader Retry/async states pending. |
| ONB-12-04 | 02,03 | Shared catalogs, optional multi-citizenship cards | SATISFIED | Static imports, shared validation, browser country/card selection and API validation. |
| ONB-12-05 | 03 | Separate optional free-text needs | SATISFIED | Separate textareas, atomic step values, save/readback/clear/Back checks. |
| ONB-12-06 | 03 | Five distinct catalog/custom interests or Skip | SATISFIED | Browser minimum/removal/custom checks plus API duplicate rejection and Skip completion. |
| ONB-12-07 | 01,04 | Legacy prefill, v2 once, Plans after completion | NEEDS HUMAN relogin | Legacy, completion and reload pass; final fresh sign-in401 unresolved. |
| ONB-12-08 | 04 | Canonical/memory preferences; no intake or progress prompt data | NEEDS HUMAN failure invariant | Deterministic projection and successful mirror verified; failure/stale-reader behavior source-only. |
| ONB-12-09 | 04 | Direct API/browser evidence covering failures/responsiveness | NEEDS HUMAN remaining checks | Required evidence exists; final login/recovery/motion checks incomplete. |

All nine Phase 12 requirement IDs appear in plan frontmatter; none orphaned. Existing milestone requirements outside Phase 12 were not silently added to this independent onboarding phase.

### Decision Coverage

GSD `check.decision-coverage-verify` returned: **No trackable decisions in CONTEXT.md** (skipped, total0, honored0, blockingfalse). This context uses a Markdown “Locked user decisions” list, not the tool's trackable block format.

Manual source mapping nevertheless covers D01–D10: B shell/progress; required home/optional airport; multiple citizenship cards; two free-text needs; five interests/Skip; save/resume; v2 legacy routing; onboarding-only mount; no model intake/shared memory projection; existing CRUD JSON ownership and static catalogs. Remaining behavioral evidence is listed above, not inferred from decision text.

### Test Quality Audit

| Evidence | Linked requirements | Active/skipped tests | Circular | Assertion strength | Verdict |
|---|---|---|---|---|---|
| Direct HTTP/API verification record | 02–08 | No test files added/run; 53 procedural observations recorded | No generated expected-output fixtures identified | Value readback and multi-step behavior, two identities | Useful evidence with SQLite scope |
| Browser verification record and screenshots | 01–09 | Manual interaction; unexecuted paths disclosed | N/A | UI state plus network/status/persisted fields | Core paths evidenced; acceptance remains open |
| Existing test_agentcore_memory.py | Existing memory adapter | Two named tests found; not run | Not credited for new v2 invariants | Pre-existing scope | Does not establish new stale-clear service behavior |
| Existing test_onboarding_intake.py | Retired agentic intake | Not run | N/A | Old intake behavior | Not evidence for deterministic v2 |

No phase requirement is falsely credited to a skipped test. No full suite, paid model call, new test, or passing legacy test was substituted for the requested manual verification. The distinction between successful serialization and exercised mirror-failure behavior is retained.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| frontend/src/features/onboarding/places.js | 20,25,34,93,103 | Empty result returns | Info | Guard/obsolete/empty-input semantics; concrete live provider/catalog paths populate results. Not stubs. |
| services/agent/service.py | 571 | Empty helper result | Info | Existing controlled helper fallback; profile data flow is separately traced. |
| Modified implementation files | — | TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER | None found | No unreferenced blocking debt markers found. |
| Browser/runtime evidence | — | Final sign-in401 and unexercised paths | WARNING | Prevents complete acceptance; does not prove absent onboarding implementation. |

Source review's prior Compose env-mount and normalization findings are resolved in the current code. The separate multi-container stack was not launched. No new verified implementation blocker emerged in this pass.

### Human Verification Required

1. **Fresh login after final rebuild.** Resolve the recorded401, then confirm a completed profile signs in to Plans and v2 does not repeat. Initial login and existing-session success cannot establish this. The local skill says to stop after rejected credentials and seek direction before account/password/pool changes; this verifier made no retry or account change.

2. **Final Google Retry and async states.** In an isolated browser context, fail loading, restore connectivity, use Retry, and observe real suggestions. Exercise no-result and obsolete-query response paths. The final first-load callback check passed; the final offline check was abandoned and networking restored. Do not perturb the user's active session.

3. **UI acceptance, reduced motion and keyboard.** Review selected B desktop/mobile screens; emulate reduced motion and traverse the complete form by keyboard. Expect stopped floating transforms, stable keyboard controls, visible focus, usable fields and no clipping. Existing screenshot/core keyboard evidence is useful but incomplete for these checks.

4. **Mirror-failure and stale-clear invariant.** A controlled deterministic service/context exercise should fail the mirror and supply a stale remembered snapshot after clearing preferences. Expect durable canonical save and explicit empties in subsequent context, without progress metadata. No paid model call or live AWS outage is required to close deterministic behavior; actual paid conversational/provider behavior remains an explicitly unverified optional limitation.

5. **Resume immediately after an optional Skip.** On an isolated unfinished profile, save home, Skip a later optional step, then reload. Expect next unresolved step, saved skip progress and retained earlier/legacy fields. Ordinary reload and eventual Skip completion already passed; this specific combined transition lacks explicit recorded evidence.

These are end-of-phase human decisions/checks. No new permission request or mid-run halt was imposed by this verifier.

### Remaining Evidence Limits

- Concurrent first profile saves were exercised on SQLite; PostgreSQL advisory-lock concurrency and eviction after64 receipts were inspected in source only.
- No live AWS outage or paid downstream model interaction was induced. Deterministic profile/context projection is the approved default and passed; paid testing is not an added delivery requirement.
- Exhaustive screen-reader behavior, all Unicode/combined-interest-length edge cases and the separate multi-container runtime were not exercised.
- The user is now reviewing the running container. Do not restore the earlier profile fixture or disturb their session.

### Gaps Summary

**No established implementation blocker; five human verification groups remain.** Status stays **human_needed**, not passed. The unexplained401 is a failed observed login attempt with uncertain cause, not evidence that the onboarding route is missing. Core CRUD/browser behavior is evidenced, while the four listed must-have invariants retain PRESENT_BEHAVIOR_UNVERIFIED classification.

The roadmap has no later phase that explicitly absorbs these acceptance checks; none were silently deferred. No `verification: backstop` truths or `must_haves.prohibitions` blocks were declared. No override was invented.

Fingerprint was generated with `gsd-tools.cjs query verification.fingerprint` from all existing phase PLAN/SUMMARY files, mapped REQUIREMENTS, changed implementation files and cited evidence. The two deleted prototype paths (`frontend/src/prototypes/OnboardingPrototype.jsx`, `frontend/src/prototypes/onboarding-prototype.css`) are confirmed deleted by commit7bb93df; the fingerprint tool refuses absent paths, so their removal is recorded here and the replacement entry point is included in covered_files. No nested/superseded PLAN/SUMMARY files were found.

---

_Verified: 2026-10-05T14:25:28Z_  
_Verifier: gsd-verifier_  
_No source edits, tests, runtime mutations or commits were performed by this verifier._

