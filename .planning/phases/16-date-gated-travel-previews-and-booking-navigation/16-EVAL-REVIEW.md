---
phase: 16-date-gated-travel-previews-and-booking-navigation
audited_commit: 5c0320b
rechecked_commits: [fe5ffa9, a0457a8]
rechecked_working_changes: stay-currency parsing and eight regression variants
audit_date: 2026-10-16
status: provisional_scope_changed
coverage_score: 66.67
infrastructure_score: 70
overall_score: 68
verdict: NEEDS WORK
---

# Phase 16 evaluation coverage audit

**Scope correction after this audit:** The traveler explicitly requires View all to open the existing manual TravelSearch page with observed results and criteria preloaded, and requires pictures in side-chat previews. The separate results-only screen in the original design is rejected. This report therefore remains **provisional evidence for the original implementation**, not verification of the corrected phase goal. Its numerical score describes the original nine-dimension contract only. Reassess navigation, DTO/image grounding/privacy, state continuity and browser evidence after the revised integration. Earlier locked navigation choices do not override this instruction.

**AI-SPEC present:** Yes. **Overall score:** 68/100. **Verdict:** NEEDS WORK.

**Recheck completed for identified regressions:** Independent source review invalidated initial date-gate confidence at `5c0320b`: current weekday dates such as “Friday to Sunday” silently reused old Canvas dates. Commit `fe5ffa9` adds the missing fail-closed calendar-intent gate and 39 real-handler zero-call cases across stays/flights/mixed. Commit `a0457a8` fixes mixed-success clarification context loss without re-searching an already completed mode. The audited working currency change passes requested stay currency through the provider/snapshot, retains prior currency during clarification, accepts current corrections and rejects unsupported/ambiguous values before calls. This auditor independently ran **47 passing** targeted calendar/mixed/currency cases, then **5 passing** exact-host-reply provenance and currency retention/override cases. These overlapping runs are reported separately, not as 52 unique cases. No shipping approval is implied.

This audits implementation and test substance against AI-SPEC Sections 5–7 and all seven phase requirements. Original critical tests were substantive but did not expose the three cases above; the added regressions now do. Six critical dimensions are covered for this bounded fixture strategy. Three quality/interaction dimensions remain partial while human rubric scoring and authenticated implementation-browser evidence are pending. This is not a phase completion or production-readiness approval.

The independent reviewer read the implementation, assertions, E01–E20 dispatch, all three summaries (03 is partial), requirements, validation record and verification evidence. Reported executed results are the executor/root evidence: focused backend/evals **115 passed**, backend regressions **257 passed / 1 baseline failure**, frontend **131 passed / 6 baseline failures / 1 standalone fixture-dependent skip**, build passed. Baseline failures were reproduced at `aa4f16f` by the executor/root; this auditor did not independently rerun those full suites. The fixture-dependent React test runs from Python with actual emitted SSE.

## Dimension coverage

| AI-SPEC dimension | Status | Measurement and substantive evidence | Remaining gap |
|---|---|---|---|
| Date/input gate — critical | COVERED | Real HTTP tests assert zero provider calls for missing dates, current ambiguous overrides over exact canvas dates, missing room/nationality/flight facts, invalid and reversed dates. Exact source-span tests assert search-only overrides and unchanged draft. Prior-source tests reject assistant/provider/missing-role/truncated/superseded history. Two-turn real SSE→React clarification preserves traveler facts. | Natural-language coverage is deliberately conservative, not a measured model comprehension rate. |
| Tool authority — critical | COVERED | Fake SDK captures the actual packaged skill/configuration and invokes actual MCP request handlers. Hook assertions deny checkout; observer rejects tool arguments/identity/date escalation before calls; initial-chat request makes no travel call. Mixed concurrency asserts one capability, two lookup and one search per mode, five calls total, dedup and overflow rejection. | Additional feature-specific timeout/configuration assertions would strengthen bounds regression coverage; existing implementation contains explicit limits. |
| Grounding — critical | COVERED | Counts 0/1/2/4 assert exact preview IDs and no padding; unknown/cross-mode/duplicate/wrong-search selection rejects publication. Source-derived typed projection is inspected. Actual SSE→parser→A2UI journeys assert matching full results, material flight/stay fields and absence of deliberately fabricated model booking prose. Byte-limit test preserves whole options within UTF-8 ceiling. | These tests prove host projection and selection validation, not live model ranking quality. |
| Identity/privacy — critical | COVERED | Foreign/deleted/missing Plan requests never call provider; trusted owner/Plan scope is asserted. Nested flight/room checkout sentinels are absent from tool text, emitted SSE and compiled output. Actual InMemorySaver checkpoint/storage inspection and concurrent owner/Plan collector isolation exceed helper-only coverage. Recursive checkpoint test covers nested projection/evidence. React checks no secret text and opaque-only history fields. | Account logout/login UI transition itself is not exercised; Plan change and unmount/reload are covered. See navigation warning. |
| Cancellation/currentness — critical | COVERED | Real graph/provider barriers cover cooperative and swallowed cancellation, cleanup and a newer generation defeating late output. Hook tests stage until successful terminal, abort old work, reject late old snapshots, supersede on failed replacements, enforce four-snapshot eviction, criteria invalidation and ten-minute expiry. | Browser timing/visual experience remains part of pending acceptance, not a missing host guard. |
| Durable authority — critical | COVERED | Real handler journeys assert unchanged draft and Plan revision, empty state_changes, no save call from navigation and no booking action. Request-local collector keeps inventory outside graph channels. Strict tool dispatch cannot call CRUD/checkout. Existing activity addition guard remains separate. | A deliberately malicious travel final answer with add_ids would be a useful negative regression; ordinary nonmutation and transport authority are already asserted. |
| Clarification usefulness — high | PARTIAL / WARNING | Tests assert needs-input outcomes, no calls, and a successful two-turn nationality clarification using the real rendered host question. Fixed host-authored questions are implementation, not prompt-only intent. | No recorded human 1/3/5 rubric scores or ≥4/5 result. No authorized live SDK sample assessed. Record a compact scored transcript sample covering dates, stay occupancy/nationality and flight party/origin/country; preserve the live-evidence limitation. |
| Price honesty — high | PARTIAL / WARNING | Real SSE→React assertions cover return-party currency/estimate, local overnight timestamps, unknown refund/baggage, stay breakfast/refund and matching amounts. Safe typed projections retain excluded taxes/room details and remove tokens. | Authenticated implementation Chrome inspection of price basis, excluded taxes, sandbox/freshness and unknown terms is pending in the evidence record. Planning sketches do not satisfy it. |
| Navigation continuity — high | PARTIAL / WARNING | Real PlanningCanvas integration exercises matching full results without another search, ordinary/history Back/Forward, draft note and composer preservation, reload with honest unavailable results, and mixed-mode isolation. Hook tests cover expiry, eviction and Plan reset. | Authenticated desktop/mobile journey and visual/focus checks pending. Add account logout/login clearing to browser checks; no dedicated account-switch integration assertion exists. |

**Coverage score:** 6/9 covered; **66.67** from the deterministic scorer. Partial dimensions are quantified above rather than credited as complete.

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
node /Users/adammerth/.codex/gsd-core/bin/gsd-tools.cjs query eval.score --covered 6 --total 9 --infra ok,ok,missing,ok,partial --raw
{"coverage_score":66.67,"infra_score":70,"overall_score":68,"verdict":"NEEDS WORK"}
```

## Critical gaps and evidence limits

The initial E01–E20 fixture set missed a **BLOCKER** date-override bug: weekday/relative/holiday intent could bypass clarification and search old Canvas dates. It is **resolved for the reproduced cases** by `fe5ffa9`, independently passing all 39 added cases. Mixed follow-up retention and requested currency regressions also pass after their narrow fixes. No known critical guardrail finding remains open from these three cases. The English calendar-cue strategy still has bounded language coverage; passing examples are not proof of arbitrary natural-language interpretation.

Fixture tests cannot validate real skill selection, SDK structured-output reliability, live provider inventory, model ranking, production latency or cost. Do not convert E01–E20 success into claims about those qualities. Live checks and browser acceptance are owned by root and were pending in `artifacts/testing/2026-10-16-travel-previews/verification.md` at audit time.

The isolated provider fixture returns deterministic normalized inventory and the fake SDK selects known IDs. Injection assertions prove that denied authority and host projection remain safe under that fixture; they do not measure the live model's susceptibility to injected provider prose.

## Nyquist requirement map

| Requirement | Status at audit | Behavioral coverage / remaining evidence |
|---|---|---|
| TRAVEL-16-01 | COVERED | Initial-chat/tool deny, five-call bounds, real authenticated handler ownership and private transport scope. |
| TRAVEL-16-02 | COVERED | Exact-date/source/missing-input zero-call matrix, active clarification retention, unchanged draft/revision. Human wording scores remain an AI quality warning. |
| TRAVEL-16-03 | COVERED | Actual SDK skill packaging/options capture, MCP handler invocation and checkout/tool-argument denial. Live skill/model behavior remains unverified. |
| TRAVEL-16-04 | PARTIAL | Automated observed A2UI/price/terms/count/secret assertions pass; authenticated visual notices/price inspection pending. |
| TRAVEL-16-05 | PARTIAL | Real parser/React navigation, draft/chat/history/reload and expiry tests pass; authenticated Chrome and account-transition check pending. |
| TRAVEL-16-06 | COVERED | Empty/failed/mixed-mode states, aborted/new-generation barriers, stale fact/expiry/eviction guards and no saved/booked assertions. |
| TRAVEL-16-07 | PARTIAL | Focused suites, baseline classification and build recorded; implementation Chrome screenshots, console/network and final visual inspection pending. |

No requirement is MISSING. Keep VALIDATION sign-off incomplete until the mandatory browser evidence is recorded. This report does not edit VALIDATION concurrently with its owner.

## Remediation

1. Complete the already assigned authenticated Chrome desktop/mobile acceptance and link inspected implementation captures, console/network observations, price notices, matching results, Back/reload/expiry and account clearing. Reassess the two browser-dependent dimensions after evidence is available.
2. Record a small human-scored clarification transcript set against the 1/3/5 rubric; target ≥4/5. Identify fixture versus live samples explicitly. An AI review of copy is not a recorded human evaluation.
3. Add the explicit no-network Agent/eval and frontend journey commands to the project's chosen executable verification runner/CI. Avoid changing unrelated test discovery just to inflate pass counts.
4. Complete only the planned safe telemetry fields, with fixed outcome codes and an opaque correlation identifier. Add assertions for their semantics and secret exclusion; do not introduce raw tracing or a new collector.
5. Useful bounded follow-ups: directly capture Canvas max_turns/budget settings and force deadline exhaustion, reject malicious travel add_ids in a final response, and exercise real account transition clearing. Freeze the test clock if exact calendar-boundary comparisons are added.

## Files inspected

- Phase `16-AI-SPEC.md`, `16-REQUIREMENTS.md`, all PLAN/SUMMARY files, `16-VALIDATION.md`, and the shared verification evidence.
- `services/agent/tests/test_canvas_travel.py`, `services/agent/evals/test_canvas_travel_eval.py`, `services/agent/tests/test_agent_checkpoint.py`.
- `services/agent/claude/canvas_travel.py`, `canvas_editor.py`, request/graph collector and checkpoint implementation seams.
- `frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx`, `CanvasTravel.jsx`, `useCanvasConversation.js`, PlanningCanvas/PlansApp/AccountApp lifecycle seams.
- `pyproject.toml`, `frontend/package.json`, available repository runner/workflow paths.

Audit role reused an independent context because the collaboration service refused additional threads. No production code, test, dependency or concurrent validation artifact was changed by this audit.
