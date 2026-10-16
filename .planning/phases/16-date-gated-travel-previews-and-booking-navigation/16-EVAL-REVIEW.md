---
phase: 16-date-gated-travel-previews-and-booking-navigation
audited_commit: 228f322
evidence_commit: f896875
rechecked_commits: [fe5ffa9, a0457a8, d1574f3, 5bf1fb9, fa05765, b1114e4, b2d3f7e, f61fc82, 228f322]
audit_date: 2026-10-16
status: audited_with_quality_warnings
coverage_score: 88.89
infrastructure_score: 70
overall_score: 81.33
verdict: PRODUCTION READY
critical_gaps: 0
---

# Phase 16 evaluation coverage audit

**Final re-audit through source `228f322`, evidence `f896875`:** the corrected existing-manual-page and pictured-preview journey is supported by implementation, behavioral tests and authenticated Chrome evidence. Explicit snapshot reopen, Stop → Retry lease cleanup and parent same-route Back defects are fixed and independently tested. Root observed successful live immediate retry and final single-Back preservation on rebuilt source. No critical eval gap remains.

**AI-SPEC present:** Yes. **Overall score:** 81.33/100. **Deterministic scoring verdict:** PRODUCTION READY. That label is the GSD coverage formula's output, not a claim of statistically measured model reliability, complete production monitoring or a formal human clarification study. The remaining quality warnings are explicit below.

**Recheck completed for earlier regressions:** Independent source review invalidated initial date-gate confidence at `5c0320b`: current weekday dates such as “Friday to Sunday” silently reused old Canvas dates. Commit `fe5ffa9` adds the missing fail-closed calendar-intent gate and 39 real-handler zero-call cases across stays/flights/mixed. Commit `a0457a8` fixes mixed-success clarification context loss without re-searching an already completed mode; `d1574f3` handles explicit stay currency and `5bf1fb9` preserves traveler inputs after fixed host validation questions. This auditor independently ran **47 passing** targeted calendar/mixed/currency cases, then **5 passing** exact-host-reply provenance and currency retention/override cases during the earlier review. These overlapping runs are reported separately, not as 52 unique cases. No shipping approval is implied.

This audits implementation and test substance against AI-SPEC Sections 5–7 and all seven phase requirements. Eight of nine dimensions are covered, including all six critical dimensions. Clarification usefulness remains partial because no formal human rubric scores are available. This is a quality-evidence limitation, not a request for user approval or a newly invented workflow gate. The companion `16-VERIFICATION.md` reports phase goal achievement separately.

The reviewer read current source, assertions, E01–E20 dispatch, all four plan summaries and final acceptance addenda, requirements, validation and browser/review records. Corrected-scope runs recorded **162 backend tests**, **30 frontend tests**, **eight real-SSE application journeys**, **26 routing/account checks**, and **seven independently reviewed cancellation checks** passed; these are separate overlapping runs, not a summed unique count. This final verifier independently spot-ran the repeated-Stop/consumer-cancel real-CRUD case (1 passed, 0.79s) and four-stay actual SSE/parent-router journey (1 passed, 2.59s). Full regressions earlier recorded **257 backend passed / 1 baseline failure** and **131 frontend passed / 6 baseline failures / 1 standalone fixture-dependent skip**; related post-cancellation regressions recorded **193 passed / the same one baseline failure**. Baseline failures reproduce at `aa4f16f`; full suites are not green. Final build passed. The conditional standalone React case executes through the Python-driven SSE journeys.

## Corrected implementation evidence

| Boundary | Assertions inspected |
|---|---|
| Real existing destination | `CanvasTravelJourney.test.jsx` uses actual PlanningCanvas/plansApi/A2UI and finds the real `Accommodation search` / `Flight search` regions, final retained option headings and result count. It verifies Check-in/Departure and Destination/From inputs, unchanged request count on View all, matching mixed-mode pages, opaque history, Back preserving draft/composer and honest reload recovery. It no longer accepts the discarded results-only screen. |
| Complete criteria and mounted import | Both-mode `TravelSearch.test.jsx` cases assert seeded currency/country/nationality/cabin/airport labels and exact outgoing criteria, including child/infant ages and rooms. A second import into the mounted form aborts the old request; late response cannot overwrite it. Same-ID rerender preserves edits; explicit manual search becomes independent of the old imported expiry. |
| Deliberate manual continuation | Comparison performs no request. Only View rooms calls hotel detail/availability with the observed hotel_id and original snapshot criteria. Token-free flight details expose no mock checkout; a deliberate refresh calls only flights/search and permits the usual button only after a new manual token arrives. No booking is executed by these tests. |
| Image/schema/privacy | Real HTTP cases preserve hotel ID/stars/review/facilities and turn ten missing/unsafe image variants into null without dropping inventory or leaking PRIVATE sentinels. Actual SSE journeys assert observed photo src and generic local flight SVG. React asserts no-referrer, visible broken-photo fallback, and rejects HTTP/userinfo/query/fragment/private/internal/unsupported-port URLs. Safe DTOs remain strict and checkout-free; existing UTF-8 and nested-token/checkpoint tests run with enriched fixtures. |
| Invalid imports | Tests reject foreign Plan, wrong mode, expired and superseded imports without requests; changing Plan on an already mounted page removes prior imported offers. |
| Explicit re-open — resolved | `b2d3f7e` adds an import-request generation incremented by explicit View all/history navigation, separate from passive rerenders. Actual PlanningCanvas/SSE tests perform A→manual B→Back→View all A, assert original options/count return, Manual B disappears, and request count does not grow. Independent source reviewer executed both stay/flight journeys successfully (two tests, 3.90s). This auditor inspected code and assertions rather than repeating those runs. |

## Dimension coverage

| AI-SPEC dimension | Status | Measurement and substantive evidence | Remaining gap |
|---|---|---|---|
| Date/input gate — critical | COVERED | Real HTTP tests assert zero provider calls for missing dates, current ambiguous overrides over exact canvas dates, missing room/nationality/flight facts, invalid and reversed dates. Exact source-span tests assert search-only overrides and unchanged draft. Prior-source tests reject assistant/provider/missing-role/truncated/superseded history. Two-turn real SSE→React clarification preserves traveler facts. | Natural-language coverage is deliberately conservative, not a measured model comprehension rate. |
| Tool authority — critical | COVERED | Fake SDK captures the actual packaged skill/configuration and invokes actual MCP request handlers. Hook assertions deny checkout; observer rejects tool arguments/identity/date escalation before calls; initial-chat request makes no travel call. Mixed concurrency asserts one capability, two lookup and one search per mode, five calls total, dedup and overflow rejection. | Additional feature-specific timeout/configuration assertions would strengthen bounds regression coverage; existing implementation contains explicit limits. |
| Grounding — critical | COVERED | Counts 0/1/2/4 assert exact preview IDs and no padding; unknown/cross-mode/duplicate/wrong-search selection rejects publication. Corrected real SSE→parser→A2UI journeys assert observed hotel photo src, generic local plane illustration, material fields and actual manual-page options. Unsafe-photo cases preserve safe metadata without tokens. Byte-limit test preserves whole options within UTF-8 ceiling. | These tests prove host projection and selection validation, not live model ranking quality. |
| Identity/privacy — critical | COVERED | Foreign/deleted/missing Plan requests never call provider; trusted owner/Plan scope is asserted. Nested flight/room checkout sentinels are absent from tool text, emitted SSE and compiled output. Actual InMemorySaver checkpoint/storage inspection and concurrent owner/Plan collector isolation exceed helper-only coverage. Recursive checkpoint test covers nested projection/evidence. React checks no secret text and opaque-only history fields. | Account logout/login UI transition itself is not exercised; Plan change and unmount/reload are covered. See navigation warning. |
| Cancellation/currentness — critical | COVERED | Real graph/provider barriers cover cooperative/swallowed cancellation and late generations; hook tests cover staged publication, eviction, criteria and expiry. `f61fc82` fixes repeated task cancellation interrupting durable lease release. Four real CRUD HTTP/SQLite cases assert locked→unlocked readback and successful generation-2 retry. Independent targeted checks pass; root's actual Stop→immediate Retry produced six cards with no 409. | The original fixture boundary missed the lease issue; persisted-state regressions now cover it. |
| Durable authority — critical | COVERED | Real handler journeys assert unchanged draft and Plan revision, empty state_changes, no save call from navigation and no booking action. Request-local collector keeps inventory outside graph channels. Strict tool dispatch cannot call CRUD/checkout. Existing activity addition guard remains separate. | A deliberately malicious travel final answer with add_ids would be a useful negative regression; ordinary nonmutation and transport authority are already asserted. |
| Clarification usefulness — high | PARTIAL / WARNING | Tests assert focused needs-input outcomes, no calls and successful multi-turn recovery. Root observed live exact-date clarification and successful SDK searches. Fixed host questions prevent unsupported prose. | No formal human 1/3/5 rubric scores or ≥4/5 result; a live smoke journey is not a scored human study. Future samples can improve confidence without blocking the authorized workflow. |
| Price honesty — high | COVERED | SSE→React assertions cover party-return currency/estimate, local overnight times, unknown terms, stays and exclusions. Inspected actual desktop/mobile captures show whole-stay/party-return basis, excluded city tax, exact dates, sandbox/freshness and matching manual results; UI audit cites specific displayed amounts. | Real samples demonstrate integration, not future provider accuracy or a statistical pricing-quality rate. |
| Navigation continuity — high | COVERED | Real parent-router/SSE journeys cover mounted forms, no opening request, A→manual B→A, Back/Forward, editor/composer, reload and races. `228f322` removes same-path parent leave prompts independent of listener ordering. Final rebuilt Chrome single Back retained unsaved EUR 2400 budget/composer, hid manual form, kept pathname and restored View all stays focus. | Post-Back screenshot capture hung; actual DOM/focus verification passed. No Back JPEG is claimed. Dedicated account-transition-with-inventory coverage remains an optional strengthening beyond Plan reset/auth unmount tests. |

**Coverage score:** 8/9 covered; **88.89** from the deterministic scorer. Human rubric coverage is not credited as complete.

## Infrastructure audit

| Component | Status | Finding |
|---|---|---|
| Eval tooling | ok | pytest, FastAPI TestClient, actual LangGraph/MCP handlers, InMemorySaver and Vitest are executed. External SDK/provider network edges alone are faked for these journeys. No new eval service is necessary. |
| Reference dataset | ok | Twenty executable E01–E20 entries map to substantive parameterized tests. This is a reusable scenario index over shared tests, not twenty independent live model trials. Composition covers positive/negative flight/stay, injection, source provenance, races and privacy. Success dates are relative to date.today()+180 rather than the spec's proposed frozen 2026-10-16; calendar-boundary reproducibility is a small follow-up. |
| CI/CD integration | missing | No repository CI workflow, Make/Task runner or equivalent executable automation includes this eval command. Commands exist in AI-SPEC/VALIDATION and were run locally. Default pytest testpaths include only auth/CRUD, so bare pytest omits this suite. This is an integration gap, not evidence of a failed local suite. |
| Online guardrails | ok | Actual request path enforces strict criteria before dispatch, allowlisted no-argument tools, owner/Plan scope, observed-ID selection, sanitized bounded projection, call/time/budget limits, cancellation/currentness and no travel mutation capability. |
| Tracing | partial | Existing Python logger wraps real travel execution with safe mode/outcome/calls/results/duration/discards; editor logs aggregate SDK cost. Sentinel assertions verify no source/identity/token content. Missing planned opaque run correlation, selected-preview count and explicit budget-exhaustion/distinct invalid/unavailable/superseded outcomes limit diagnosis. `discard_count` also records truncation/failure, so it is not yet a clean stale-generation metric. |

**Infrastructure score:** 70/100. The AI-SPEC explicitly treats operational thresholds as planning defaults pending a baseline; this review does not invent a requirement for installed alerts or another tracing service.

Scores were obtained with:

```text
node /Users/adammerth/.codex/gsd-core/bin/gsd-tools.cjs query eval.score --covered 8 --total 9 --infra ok,ok,missing,ok,partial --raw
{"coverage_score":88.89,"infra_score":70,"overall_score":81.33,"verdict":"PRODUCTION READY"}
```

## Critical gaps and evidence limits

**Resolved requirement blocker — explicit View all selects its matching result:** At `b1114e4`, opening A, manually searching B, returning to chat and selecting View all A left B visible. `b2d3f7e` separates explicit import intent from passive rerenders. Real PlanningCanvas regressions assert A returns without another provider search, while existing same-ID rerender/manual-continuation protections remain. Source reviewer independently passed stay and flight journeys; this auditor inspected the committed fix and assertions.

**Resolved live Stop → Retry:** Repeated cancellation interrupted the worker's context-lease release. `f61fc82` makes cancellation a one-shot transition and shields cleanup; real CRUD lock readback/generation-2 tests pass. On rebuilt source root observed Stop→immediate Retry produce six previews from 27 stays/91 flights, without 409. This closes the earlier investigation.

**Resolved real-browser Back:** Parent same-path routing previously invoked the dirty-Plan leave guard before child history interception. `228f322` protects same-route history in the parent; both mode journeys independently pass without relying on child listener order. Root's final single Chrome Back passed with budget/composer/focus preserved. The failed screenshot call is disclosed; an incorrect earlier Back capture was removed.

**Quality warnings, not new approval gates:** no recorded human clarification rubric, no executable CI integration for the explicit eval command, incomplete planned diagnostic counters, and optional extra timeout/add_ids/account-transition regression coverage. These affect confidence/score but do not independently establish a broken authority boundary or require a new human approval flow. No human evaluation beyond the traveler's correction is available; do not fabricate one or characterize an AI copy review as human scoring.

The initial E01–E20 fixture set missed a **BLOCKER** date-override bug: weekday/relative/holiday intent could bypass clarification and search old Canvas dates. It is **resolved for the reproduced cases** by `fe5ffa9`, independently passing all 39 added cases. Mixed follow-up retention and requested currency regressions also pass after their narrow fixes. No known critical guardrail finding remains open from these three cases. The English calendar-cue strategy still has bounded language coverage; passing examples are not proof of arbitrary natural-language interpretation.

Fixture tests cannot validate real skill selection, SDK reliability, live inventory, model ranking, production latency or cost. Root's authenticated live SDK/private LiteAPI sandbox journey now establishes sampled successful integration: 27 stays and 91 flights, three previews per mode, three loaded hotel photos and three local flight SVGs, exact manual-page preload with no opening search, deliberate comparison/details, retry and recovery. It does not establish statistical quality, all-provider reliability or performance distributions. See `artifacts/testing/2026-10-16-travel-previews/verification.md` and independent `16-UI-REVIEW.md` for actual capture provenance and limitations.

The isolated provider fixture returns deterministic normalized inventory and the fake SDK selects known IDs. Injection assertions prove that denied authority and host projection remain safe under that fixture; they do not measure the live model's susceptibility to injected provider prose.

## Nyquist requirement map

| Requirement | Status at audit | Behavioral coverage / remaining evidence |
|---|---|---|
| TRAVEL-16-01 | COVERED | Initial-chat/tool deny, five-call bounds, real authenticated handler ownership and private transport scope. |
| TRAVEL-16-02 | COVERED | Exact-date/source/missing-input zero-call matrix, active clarification retention, unchanged draft/revision. Human wording scores remain an AI quality warning. |
| TRAVEL-16-03 | COVERED | Actual SDK skill packaging/options capture, MCP handler invocation and checkout/tool-argument denial. Live skill/model behavior remains unverified. |
| TRAVEL-16-04 | COVERED | Observed A2UI/photo/local-plane/metadata/fallback/privacy assertions plus authenticated desktop/mobile image, terms and price inspection. |
| TRAVEL-16-05 | COVERED | Real parent-router hydration/continuation/reopen/Back/reload assertions and final single-Back Chrome budget/composer/focus readback. |
| TRAVEL-16-06 | COVERED | Empty/failed/mixed, obsolete/expired, real lease cleanup/retry tests and live Stop→immediate Retry/reload evidence. |
| TRAVEL-16-07 | COVERED | Focused suites, baseline classification, build, source hashes, inspected before/after Chrome desktop/mobile evidence and console/network record. Screenshot limitation explicitly disclosed. |

All seven requirements have executed coverage. `16-VALIDATION.md` records completed browser acceptance and truthful baseline failures. This report does not edit that independently owned artifact.

## Remediation

1. No critical remediation remains. Retain regressions for explicit reopen, lease cleanup and parent same-route history; keep actual-browser evidence and failed-capture limitations attached to the final source.
2. Quality follow-up when human evaluation is available: score a small clarification transcript set against the 1/3/5 rubric, targeting ≥4/5. Identify fixture versus live samples explicitly. Do not pause the authorized workflow to seek new approval or present an AI review as human scoring.
3. Add the explicit no-network Agent/eval and frontend journey commands to the project's chosen executable verification runner/CI. Avoid changing unrelated test discovery just to inflate pass counts.
4. Complete only the planned safe telemetry fields, with fixed outcome codes and an opaque correlation identifier. Add assertions for their semantics and secret exclusion; do not introduce raw tracing or a new collector.
5. Useful bounded follow-ups: directly capture Canvas max_turns/budget settings and force deadline exhaustion, reject malicious travel add_ids in a final response, and exercise real account transition clearing. Freeze the test clock if exact calendar-boundary comparisons are added.

## Files inspected

- Phase `16-AI-SPEC.md`, `16-REQUIREMENTS.md`, all PLAN/SUMMARY files, `16-VALIDATION.md`, and the shared verification evidence.
- `services/agent/tests/test_canvas_travel.py`, `services/agent/evals/test_canvas_travel_eval.py`, `services/agent/tests/test_agent_checkpoint.py`.
- `services/agent/claude/canvas_travel.py`, `canvas_editor.py`, request/graph collector and checkpoint implementation seams.
- `frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx`, `TravelSearch.test.jsx`, `TravelSearch.jsx`, `CanvasTravel.jsx`, `useCanvasConversation.js`, PlanningCanvas/PlansApp/AccountApp lifecycle seams.
- `pyproject.toml`, `frontend/package.json`, available repository runner/workflow paths.

Audit role reused an independent context because the collaboration service refused additional threads. No production code, test, dependency or concurrent validation artifact was changed by this audit.
