---
phase: 16
slug: date-gated-travel-previews-and-booking-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-16
---

# Phase 16 — Validation Strategy

This is the implementation validation contract. Only the baseline run below has executed; proposed coverage and browser gates remain pending.

## Test Infrastructure

| Property | Value |
|---|---|
| Backend | pytest 9.1.1, FastAPI TestClient, injected SDK/TravelClient fakes |
| Frontend | Vitest + React Testing Library + jsdom, existing package lock |
| Quick backend | `uv run --locked pytest services/agent/tests/test_travel_api.py services/mcps/tests/test_liteapi.py services/mcps/tests/test_travel_security.py services/agent/tests/test_agent_checkpoint.py -q` |
| Quick frontend | `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/TravelSearch.test.jsx` |
| Full phase backend | `uv run --locked pytest services/agent/tests services/mcps/tests services/auth/tests/test_travel_proxy.py services/crud/tests/test_canvas_mock_booking.py -q` |
| Full frontend | `npm --prefix frontend test` and `npm --prefix frontend run build` |
| New focused tests | `uv run --locked pytest services/agent/tests/test_canvas_travel.py -q` (proposed file; create in Wave 0) |

Default pytest testpaths omit Agent/MCP; explicit paths are required. Frontend dependencies were absent at research time: restore with `npm --prefix frontend ci` before invoking frontend tests.

## Sampling Rate

- After each task change: relevant focused test file(s), including failure/forbidden-path checks.
- After each wave: affected backend/frontend suites.
- Before phase sign-off: full commands above; authenticated real Chrome desktop/mobile checks; inspect evidence; record any live model/provider limitation.
- Quick checks target under 30 seconds. No repeated full-suite run without changed code, failure or unresolved concern.

## Requirement Verification Map

| Requirement | Must prove | Test location / method | Status |
|---|---|---|---|
| TRAVEL-16-01 | Initial chat has no new tools; Canvas exact tool allowlist; foreign/deleted/missing Plan cannot invoke provider; trusted subject/Plan cannot be overridden | New `test_canvas_travel.py`; extend `test_travel_api.py` and SDK option capture | Pending |
| TRAVEL-16-02 | Missing/yearless/ambiguous/reversed/past/equal/too-long dates make zero provider calls; incomplete country/party/airports clarify; current exact correction supersedes old dates; ambiguous correction blocks old-date reuse; Canvas and durable context unchanged | Table-driven deterministic date gate and fake editor tests; before/after data assertions | Pending |
| TRAVEL-16-03 | Travel skill packaged into isolated project, exact allowlist, project-only settings, forbidden skill/tool/action rejected; no checkout access | SDK session/option inspection and adversarial fake tool invocation | Pending |
| TRAVEL-16-04 | At most three actual observed previews; duplicate/unobserved/cross-mode IDs fail; correct dates and price basis; estimates/unknown terms/provider/sandbox/freshness visible; recursive token exclusion | Backend DTO/projection tests and A2UI component tests | Pending |
| TRAVEL-16-05 | View all renders the matching complete bounded snapshot with zero new provider and checkout calls; back preserves chat, unsent text and unsaved editor; focus returns; reload/expiry shows explicit recovery | PlanningCanvas + results-only component tests and authenticated Chrome | Pending |
| TRAVEL-16-06 | Stop/disconnect/superseded run cannot commit late result; changed relevant criteria mark stale; unrelated note change does not; failure/empty/timeout honest; no booking/saving claim | Deferred-promise component tests, Agent streaming tests, fake clock | Pending |
| TRAVEL-16-07 | Real authenticated desktop/mobile interaction and inspected visual evidence; activity and legacy checkout remain intact | Browser gates + existing activity/checkout suites | Pending |

## Wave 0 Requirements

- [ ] Restore frontend lockfile dependencies; no new package required.
- [ ] Create focused Canvas travel fixture module with injected SDK worker and TravelClient spy; provider calls forbidden unless test explicitly expects them.
- [ ] Create deterministic date evidence fixtures with frozen/current-relative dates and current/recent traveler roles; include conflicting current messages and malicious assistant/provider text.
- [ ] Add token-free flight/stay fixtures with more than three options, material terms, unavailable prices, excluded taxes, estimated totals and nested secret sentinels.
- [ ] Add strict public schema and UI fixtures for ready, empty, loading, failed, interrupted, superseded, stale and expired behavior. Final enum names must come from implementation contract, not this prose.
- [ ] Add snapshot isolation tests across Plan/identity, duplicate IDs, invalid byte sizes and wrong mode.
- [ ] Test nested projection/checkpoint serialization and process receipt payloads; assert no token/raw payload. Transient result data must not become durable checkpoint state.
- [ ] Include legacy activity and sandbox checkout tests in phase regression commands; preserve their existing behavior.

## Manual Browser Verification

Follow `docs/skills/travella-testing/SKILL.md` and `.agents/skills/travella-local/SKILL.md`. Authenticate with the configured example account; never print or record its password.

| Journey | Required evidence |
|---|---|
| Before implementation | Existing Canvas state plus rendered intended preview/results-only sketch, inspected desktop/mobile screenshots |
| Missing dates | Ask Canvas for flights/stays without exact dates; focused clarification and no provider search |
| Flight previews | Exact criteria lead to up to three provider-backed cards with dates, return-party total, terms and sandbox/freshness labels |
| Stay previews | Exact criteria lead to up to three stay cards with whole-stay basis, excluded-tax/unknown-term notices |
| Matching results | View all shows the same option IDs/dates/price facts; no automatic search; no booking/checkout control |
| Return and draft preservation | Back preserves unsaved card changes, conversation and unsent composer text; keyboard focus restored |
| Stale and recovery | Criteria edit, timeout/empty/error, Stop and reload produce honest states; obsolete results are not presented as current |
| Responsive | Desktop and narrow/mobile widths; keyboard navigation; no clipping/overlap; focus visibility |
| Diagnostics | Inspect relevant Chrome console and network failures; correct regressions and rerun affected path |

Save evidence under `artifacts/testing/<date>-<task>/plan/`, `implementation/` and `verification.md`. Record exact commands, observed behavior and screenshot inspection. No paid provider calls belong in research; execution must distinguish deterministic fixture evidence from live integration evidence. Missing browser/model/provider access does not turn proposed tests into passes.

## Research Baseline Executed

On 2026-10-16, the quick backend command above passed: **31 passed, 25 warnings in 9.14s**. Warnings concerned LangGraph serializer defaults and Python coroutine-function deprecations. No frontend tests/build, authenticated browser journey, live model call or live provider search was executed by the researcher. Local health HTTP 200 is startup evidence only, not source-fidelity or feature verification.

## Sign-off

- [ ] All requirement tests implemented and passing.
- [ ] No new durable Plan schema; or any justified scope change explicitly reviewed and CRUD HTTP persistence checks added.
- [ ] No secrets/checkout data in model context, public projection, browser history/storage, logs or checkpoints.
- [ ] Browser plan/implementation screenshots captured and visually inspected.
- [ ] Current checkout source hashes match running container for affected files.
- [ ] Console/network inspection complete.
- [ ] Exact provider/model checks marked executed or explicitly unverified.
- [ ] Existing activity flow and unrelated sandbox checkout regressions pass.
- [ ] Set `nyquist_compliant: true`, `wave_0_complete: true` and final status only when supported by execution evidence.
