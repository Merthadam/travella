---
phase: 16
slug: date-gated-travel-previews-and-booking-navigation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-16
---

# Phase 16 — Validation Strategy

Deterministic checks and authenticated Chrome acceptance have executed. Corrected manual-page/imagery acceptance and live-discovered fixes are documented in the final evidence below; formal goal verification is separate.

## Test Infrastructure

| Property | Value |
|---|---|
| Backend | pytest 9.1.1, FastAPI TestClient, injected SDK/TravelClient fakes |
| Frontend | Vitest + React Testing Library + jsdom, existing package lock |
| Quick backend | `uv run --locked pytest services/agent/tests/test_travel_api.py services/mcps/tests/test_liteapi.py services/mcps/tests/test_travel_security.py services/agent/tests/test_agent_checkpoint.py -q` |
| Quick frontend | `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/TravelSearch.test.jsx` |
| Full phase backend | `uv run --locked pytest services/agent/tests services/mcps/tests services/auth/tests/test_travel_proxy.py services/crud/tests/test_canvas_mock_booking.py -q` |
| Full frontend | `npm --prefix frontend test` and `npm --prefix frontend run build` |
| New focused tests | `uv run --locked pytest services/agent/tests/test_canvas_travel.py -q` |

Default pytest testpaths omit Agent/MCP; explicit paths are required. Frontend dependencies were absent at research time; root subsequently completed `npm ci --prefix frontend`. Execution still checks/restores the lockfile environment before frontend tests.

## Plan Assignment and Baseline

Research/validation baseline commit: `b2b4157` (31 targeted tests passed before implementation). The approved sketch and inspected root Chrome captures are recorded in `artifacts/testing/2026-10-16-travel-previews/verification.md`. These are not Phase16 production verification.

| Plan/task | Scope | Required automated gate |
|---|---|---|
| 16-01-01 | Stay end-to-end tracer | `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k stay_journey -q` plus boundary tests |
| 16-01-02 | Focused clarification/exact search-only dates | Date/provenance and stay journey tests; existing PlanningCanvas regressions |
| 16-02-01 | Flight end-to-end tracer | `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k flight_journey -q` plus strict flight rendering |
| 16-02-02 | Mixed-mode/bounds/provider honesty | Both journey variants and existing travel/sandbox tests |
| 16-03-01 | Stop/stale/reload/Back journey | Barrier race tests and browser-history/criteria/expiry component tests |
| 16-03-02 | Authority/privacy/evals/regressions | E01–E20, complete targeted backend regressions, frontend suite/build |
| 16-03-03 | Root-owned authenticated Chrome evidence | Required actual interactions/inspection plus artifact presence check; no fixture/live conflation |

The cross-boundary journey test uses actual FastAPI/graph/editor-produced SSE, real plansApi stream parsing and React/A2UI rendering, with only external SDK/provider/network dependencies injected. It is deterministic application wiring evidence; it cannot establish real model behavior or live inventory. Root performs browser task once after executor handoff.

## Multi-Source Coverage Audit

| Source | Item | Plans | Status |
|---|---|---|---|
| GOAL | Canvas exact-date flight/stay previews and matching results without booking | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-01 Canvas-only bounded Plan-authorized private tools | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-02 exact grounded dates/inputs and no mutation | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-03 packaged allowlisted skill and no checkout | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-04 at most three observed honest previews | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-05 matching results, preserved Back, honest reload | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-06 all lifecycle/error/stale states | 16-01,16-02,16-03 | COVERED |
| REQ | TRAVEL-16-07 tests, Chrome evidence and honest unavailable checks | 16-01,16-03 | COVERED |
| CONTEXT | D-01 Canvas-only | 16-01,16-02,16-03 | COVERED |
| CONTEXT | D-02 existing styling and evidence | 16-01,16-02,16-03 | COVERED |
| CONTEXT | D-03 three previews and matching full results | 16-01,16-02 | COVERED |
| CONTEXT | D-04 results-only; existing sandbox unchanged | 16-01,16-02,16-03 | COVERED |
| CONTEXT | D-05 exact dates/current correction/search-only changes | 16-01,16-02,16-03 | COVERED |
| CONTEXT | D-06 existing read-only transport and bounded skill | 16-01,16-02 | COVERED |
| CONTEXT | D-07 full GSD/review/verification; delegated routine decisions | 16-01,16-02,16-03 | COVERED |
| RESEARCH | Existing contracts/transport, no new package/store/schema | 16-01,16-02 | COVERED |
| RESEARCH | Deterministic date provenance and ambiguous correction | 16-01,16-03 | COVERED |
| RESEARCH | Nested token stripping and graph/checkpoint exclusion | 16-01,16-03 | COVERED |
| RESEARCH | Registry IDs, strict A2UI, safe narrative | 16-01,16-02,16-03 | COVERED |
| RESEARCH | Five-call/timeout/128KiB bounds and honest truncation | 16-01,16-02,16-03 | COVERED |
| RESEARCH | Parent-owned snapshots, criteria fingerprints, expiry/Back | 16-01,16-03 | COVERED |
| AI-SPEC | E01–E20, async cleanup, safe telemetry, no automatic retries | 16-01,16-02,16-03 | COVERED |
| UI-SPEC | All eight state categories, themes, mobile, focus/history | 16-01,16-02,16-03 | COVERED |

Deferred booking graph/payment/supplier handoff, initial-chat tools, autonomous saving and additional modes remain excluded by explicit user scope, not unplanned gaps.

## Sampling Rate

- After each task change: relevant focused test file(s), including failure/forbidden-path checks.
- After each wave: affected backend/frontend suites.
- Before phase sign-off: full commands above; authenticated real Chrome desktop/mobile checks; inspect evidence; record any live model/provider limitation.
- Quick checks target under 30 seconds. No repeated full-suite run without changed code, failure or unresolved concern.

## Requirement Verification Map

| Requirement | Must prove | Test location / method | Status |
|---|---|---|---|
| TRAVEL-16-01 | Initial chat has no new tools; Canvas exact tool allowlist; foreign/deleted/missing Plan cannot invoke provider; trusted subject/Plan cannot be overridden | New `test_canvas_travel.py`; extend `test_travel_api.py` and SDK option capture | Passed |
| TRAVEL-16-02 | Missing/yearless/ambiguous/reversed/past/equal/too-long dates make zero provider calls; incomplete country/party/airports clarify; current exact correction supersedes old dates; ambiguous correction blocks old-date reuse; Canvas and durable context unchanged | Table-driven deterministic date gate and fake editor tests; before/after data assertions | Passed |
| TRAVEL-16-03 | Travel skill packaged into isolated project, exact allowlist, project-only settings, forbidden skill/tool/action rejected; no checkout access | SDK session/option inspection and adversarial fake tool invocation | Passed |
| TRAVEL-16-04 | At most three actual observed previews; duplicate/unobserved/cross-mode IDs fail; correct dates and price basis; estimates/unknown terms/provider/sandbox/freshness visible; recursive token exclusion | Backend DTO/projection tests and A2UI component tests | Passed |
| TRAVEL-16-05 | View all renders the matching complete bounded snapshot in existing manual pages with zero navigation provider and checkout calls; back preserves chat, unsent text and unsaved editor; focus returns; reload/expiry shows explicit recovery | PlanningCanvas + existing manual-page import tests and authenticated Chrome | Passed |
| TRAVEL-16-06 | Stop/disconnect/superseded run cannot commit late result; changed relevant criteria mark stale; unrelated note change does not; failure/empty/timeout honest; no booking/saving claim | Deferred-promise component tests, Agent streaming tests, fake clock | Passed |
| TRAVEL-16-07 | Real authenticated desktop/mobile interaction and inspected visual evidence; activity and legacy checkout remain intact | Browser gates + existing activity/checkout suites | Passed |

## Wave 0 Requirements

- [x] Restore frontend lockfile dependencies; no new package required.
- [x] Create focused Canvas travel fixture module with injected SDK worker and TravelClient spy; provider calls forbidden unless test explicitly expects them.
- [x] Create deterministic date evidence fixtures with frozen/current-relative dates and current/recent traveler roles; include conflicting current messages and malicious assistant/provider text.
- [x] Add token-free flight/stay fixtures with more than three options, material terms, unavailable prices, excluded taxes, estimated totals and nested secret sentinels.
- [x] Add strict public schema and UI fixtures for ready, empty, loading, failed, interrupted, superseded, stale and expired behavior. Final enum names come from implementation.
- [x] Add snapshot isolation tests across Plan/identity, duplicate IDs, invalid byte sizes and wrong mode.
- [x] Test nested projection/checkpoint serialization and process receipt payloads; assert no token/raw payload. Transient result data must not become durable checkpoint state.
- [x] Include legacy activity and sandbox checkout tests in phase regression commands; preserve their existing behavior.

## Manual Browser Verification

Follow `docs/skills/travella-testing/SKILL.md` and `.agents/skills/travella-local/SKILL.md`. Authenticate with the configured example account; never print or record its password.

| Journey | Required evidence |
|---|---|
| Before implementation | Existing Canvas state plus rendered intended preview/manual-page sketch (original results-only design superseded), inspected desktop/mobile screenshots |
| Missing dates | Ask Canvas for flights/stays without exact dates; focused clarification and no provider search |
| Flight previews | Exact criteria lead to up to three provider-backed cards with dates, return-party total, terms and sandbox/freshness labels |
| Stay previews | Exact criteria lead to up to three stay cards with whole-stay basis, excluded-tax/unknown-term notices |
| Matching results | View all opens existing manual pages with the same option IDs/dates/price facts; no automatic search or checkout; existing deliberate manual controls remain |
| Return and draft preservation | Back preserves unsaved card changes, conversation and unsent composer text; keyboard focus restored |
| Stale and recovery | Criteria edit, timeout/empty/error, Stop and reload produce honest states; obsolete results are not presented as current |
| Responsive | Desktop and narrow/mobile widths; keyboard navigation; no clipping/overlap; focus visibility |
| Diagnostics | Inspect relevant Chrome console and network failures; correct regressions and rerun affected path |

Save evidence under `artifacts/testing/<date>-<task>/plan/`, `implementation/` and `verification.md`. Record exact commands, observed behavior and screenshot inspection. No paid provider calls belong in research; execution must distinguish deterministic fixture evidence from live integration evidence. Missing browser/model/provider access does not turn proposed tests into passes.

## Research Baseline Executed

On 2026-10-16, the quick backend command above passed: **31 passed, 25 warnings in 9.14s**. Warnings concerned LangGraph serializer defaults and Python coroutine-function deprecations. No frontend tests/build, authenticated browser journey, live model call or live provider search was executed by the researcher. Local health HTTP 200 is startup evidence only, not source-fidelity or feature verification.

## Implementation Checks Executed (2026-10-16)

- Plan 01: 58 backend checks and 14 focused frontend checks passed; Plan 02: 82 backend checks and 15 focused frontend checks passed. See the committed plan summaries for commands and fixture-only standalone skips.
- Plan 03 task 01 (`a6bc489`): 85 travel backend checks passed; lifecycle/PlanningCanvas frontend command passed 19 with one fixture-only standalone skip. Eight Python-triggered HTTP/graph/SSE-to-React journeys execute that skipped case using actual emitted events.
- `uv run --locked pytest services/agent/evals/test_canvas_travel_eval.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q`: **115 passed in 19.97s**. E01–E20 all passed with zero critical host-invariant failures. Cases execute real gate, graph, handler, projection, serialization and browser parser code, with external SDK/provider network edges injected. They do not measure live model judgment or inventory.
- `uv run --locked pytest services/agent/tests services/mcps/tests services/auth/tests/test_travel_proxy.py services/crud/tests/test_canvas_mock_booking.py -q`: **257 passed, 1 failed in 14.24s**. The failure is `test_profile_memory_sync_uses_verified_identity_and_safe_status`, whose old expected payload omits newer optional profile fields. Reproduced unchanged at preimplementation commit `aa4f16f`: **1 failed**.
- `npm --prefix frontend test`: **131 passed, 6 failed, 1 skipped** across 21 files. Five AccountApp onboarding/auth heading expectations and one TripBrief confirmation expectation fail. All six reproduce in the same two test files from a temporary `git archive aa4f16f` checkout: **13 passed, 6 failed**. The standalone skip requires the Python-emitted SSE fixture and runs in the integrated journeys. No travel test failed.
- `npm --prefix frontend run build`: passed; existing bundle-size warning remains. LangGraph/Python deprecation warnings and existing test-key warnings remain in backend output.
- Baseline reproduction used the installed locked dependencies with archived source in `/tmp/phase16-baseline-aa4f16f`; no branch switch or source replacement. Initial archive lacked the shared JSON catalogs; extraction of baseline `services/` resolved that harness-only import error before the recorded reproduction.
- Actual injected `InMemorySaver` channel values and serialized storage exclude result IDs, token sentinels and date evidence; recursive checkpoint projection defense passes separately. Default application construction still has no saver. Concurrent real graph calls isolate owner/Plan collectors, and receipts replay original expiry without another provider call.
- The existing activity, legacy travel, sandbox checkout, proxy and CRUD mock-booking tests passed apart from the explicitly reproduced unrelated failures. No new CRUD operation or durable Plan schema was added; travel integration assertions read back unchanged Plan data.

Requirement map status: TRAVEL-16-01 through TRAVEL-16-07 have executed phase-specific coverage and root authenticated Chrome acceptance. Final evidence includes corrected desktop/mobile photos and manual forms, live model/private sandbox searches, source hashes, diagnostic inspection, actual CRUD cancellation readback and cleanup. Full regression suites remain **not green** because of seven reproduced preimplementation failures. Back preservation was verified in Chrome DOM/focus; its screenshot call hung and no image is claimed.

Final fixes/tests:162 travel/checkpoint checks;30 manual/legacy checkout checks;8 actual HTTP→SSE→parent-router journeys;26 Plan/account routing checks;7 independent cancellation checks; build passes. These are separate runs, not a summed unique-test count. Details in plan summaries and `artifacts/testing/2026-10-16-travel-previews/verification.md`.

## Sign-off

- [x] All requirement tests implemented and passing.
- [x] No new durable Plan schema; or any justified scope change explicitly reviewed and CRUD HTTP persistence checks added.
- [x] No secrets/checkout data in model context, public projection, browser history/storage, logs or checkpoints.
- [x] Browser plan/implementation screenshots captured and visually inspected.
- [x] Current checkout source hashes match running container for affected files.
- [x] Console/network inspection complete.
- [x] Exact provider/model checks marked executed or explicitly unverified.
- [x] Existing activity flow and unrelated sandbox checkout regressions pass.
- [x] Set `nyquist_compliant: true`, `wave_0_complete: true` and final status only when supported by execution evidence.
