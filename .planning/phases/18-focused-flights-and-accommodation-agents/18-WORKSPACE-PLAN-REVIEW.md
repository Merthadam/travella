# Shared workspace pre-execution plan review

Reviewed 2026-10-27. Scope: new plans **18-06–18-12**, not retrospective acceptance of 18-01–18-05. This is static plan verification, not implementation verification. No application tests, provider/model calls, deployment or traveler UAT were performed by this checker.

## ISSUES FOUND

**Phase:** 18 — Focused Flights and Accommodation Agents, shared-workspace correction
**Plans checked:** 7; **tasks:** 18
**Issues:** **0 blockers, 5 warnings, 0 info**
**Disposition:** The plans cover the approved outcome. The remaining warnings concern file scope; the orchestrator explicitly retained these coordinated slices with the rationale below. They do not block later authorized execution. This is not a zero-issue `VERIFICATION PASSED` result and does not authorize automatic execution.

## Goal and coverage

The roadmap goal is a manual-first Flights/Stays workspace where bounded specialists operate the same search/results state, separate topic conversations retain grounded trip context, and travelers explicitly choose exact unbooked options. Current authority is CONTEXT D18-01–D18-10, WORKSPACE-SPEC, current UI-SPEC, and WORKSPACE-RESEARCH. Historical full chat browsers and specialist import controls are superseded; General Trip imports remain compatible.

| Requirement | Implementing plans | Verification plan | Result |
| --- | --- | --- | --- |
| FOCUS-11 shared manual state and immediate precedence | 06, 08, 10, 11 | 12 | Covered |
| FOCUS-12 bounded validated automatic effects | 07, 08 | 12 | Covered |
| FOCUS-13 main comparison and exact choice | 10 | 12 | Covered |
| FOCUS-14 observed carrier/source/price facts | 09, 10 | 12 | Covered |
| FOCUS-15 scoped recovery and accessible responsive flow | 11 | 12 | Covered |
| FOCUS-16 concrete integrated evidence and honest acceptance | 12 | 12 | Covered |

FOCUS-01–10 retain their historical implementation owners and have relevant regression coverage in the new plans. All sixteen roadmap IDs occur in plan requirements frontmatter. Relevant PROJECT.md ownership, explicit confirmation, provider honesty, privacy, recovery and supplier-handoff constraints remain covered; car rental and other future-phase scope are not silently imported into this correction.

| Locked decision | Executable coverage |
| --- | --- |
| D18-01 topic substages/history/context | 06 controller scope; 07 private topic context; 11 recovery; 12 regression |
| D18-02 main manually complete workspace | 06 manual HTTP/registry tracer; 10 comparison and deterministic choice |
| D18-03 shared automatic effects, no duplicate browser/import | 07 post-commit batch; 08 bounded operations; 10 compact chat references |
| D18-04 manual precedence and reversible research | 06/07 synchronous invalidation; 08 Undo and hard constraints; 11 races |
| D18-05 exact two/three comparison and preserved draft | 08 current ordered references; 10 factual comparison/discussion |
| D18-06 exact explicit unbooked choice | 10 direct deterministic review, existing challenge/commit and readiness |
| D18-07 real carrier identity/logo/fallback | 09 normalization, strict projections and image component |
| D18-08 source/time/scope/unknown evidence | 06 honest result states; 09 cards; 10 comparison |
| D18-09 quiet Canvas chat, mobile, Stop/Undo/focus | 06, 08, 10, 11, with browser gate in 12 |
| D18-10 planning only | Every objective and 12 acceptance reconciliation; no automatic execution |

No locked decision is reduced to a placeholder, static substitute or future enhancement. The manual-first tracer is a lasting UI → authenticated HTTP → registry slice; its strict final reducer interface is connected by 07 without a temporary protocol or transcript-derived adapter.

## Explicit edge and UI coverage

| WORKSPACE-SPEC edge | Concrete coverage |
| --- | --- |
| Manual form edit during agent search | 06-01/07-03 dirty draft and immediate version revocation |
| Manual search during agent search | 06-01/11-02 search independent of cancellation acknowledgement |
| Sort/dismiss/compare during turn | 08-03/10-01/11-02 version guards; scrolling exempt |
| Stop/topic/Plan switch | 07-03/11-02 run, instance, topic and scope fences |
| Provider failure/empty success | 06-02 prior evidence preservation; 07-02 empty final search |
| Compare unavailable/expired evidence | 10-01/02 factual UI retained and stale confirmation denied |
| Different dates/party/currency | 09-02/10-01 explicit incompatible scope labels |
| Exact room versus cheapest property | 08-02/10-02 full reference, deterministic review and stored readback |
| Dismiss saved option | 08-03/10-02 visibility-only operation and unchanged readiness |
| Missing/broken/mixed carrier logos | 09-01/02 observed metadata, neutral fallback and operator identity |
| Mobile/chat collapsed/keyboard | 10-03/11-03 manual journey, draft and focus preservation |
| Cross-owner/Plan/topic/forged reference | 07-01/08-01/10-02 server validation and real HTTP negatives |
| Reload/registry expiry/restart | 11-01 authorized reference recovery without search or history replay |

All thirteen rows have implementing actions and verification targets, with integrated evidence required in 12. All seven current UI Considerations are represented in must-haves and tasks: manual completion (06/10), shared view (06/07/08), user precedence (06/07/11), quiet assistant (07/08/10), logo fallback (09), reversible narrowing (08), mobile and zoom (11). Agent updates cannot change mobile pane/focus/scroll; explicit Compare opens main facts first and preserves the composer draft. Detached details keep the original full reference.

All six prohibitions are preserved as structured plan prohibitions: chat-only primary search (06/10/11), uncontrolled updates (07), hidden durable changes (10), fabricated identity/source (09), unbounded autonomy (08), false verification (12). `status: resolved` describes the formulation, not an execution pass. No unsupported pytest/Vitest enforcement descriptor is fabricated.

## Dependencies, wiring and source checks

Declared chain: delivered 18-04 → 06 → {07,09}; 07 → 08; {08,09} → 10 → 11 → 12. Waves 6–11 are consistent and acyclic. The only same-wave pair, 07/09, has disjoint modified-file sets. Their additive schema work does not impose a hidden prerequisite on the other's new feature. No undeclared shared mutable execution resource requiring an advisory was identified.

Source inspection confirmed that auth direct calls, runtime turn/stream entry points and Agent HTTP reuse AgentRequest/AgentResponse. Updating those shared strict models propagates the optional context/effect without inventing duplicate auth schemas; streams relay the service envelopes. Existing graph invocation already accepts private specialist context. Plan 07 keeps both new input and output outside parent checkpoint channels, resets ContextVars and releases output only after successful signed CRUD completion and a generation check.

The following substantive gaps were corrected during drafting:

- The oversized initial tracer was split into a six-file manual tracer and bounded protocol slice.
- Plan 06 now explicitly creates/tests `applyWorkspaceUpdate` and `travelWorkspaceUpdateSchema`, with all current identity, expiry, dirty-draft and idempotency guards. Its interface wires `getWorkspaceContext`, run-start/end callbacks and the update callback into `useTravelConversation`; 07 consumes that same controller.
- Current `chooseManual` calls `chat.send` and gates on history/loading state. Plan 10 explicitly replaces that dependency with `reviewExactTravelOption`, reusing the model-free host review and exact CRUD challenge/commit. Real active leases remain respected; model/history failure alone does not block review.
- AccountApp's periodic/focus 401 handler directly called `setStep('sign_in')`, bypassing the existing clear helper. Plan 11 now owns the concrete AccountApp change and a 401 → another-account storage-clearing regression, alongside normal logout and Plan deletion cleanup.

Carrier propagation covers the inspected Connector normalizer, public Segment model, safe FlightSegment model, strict browser snapshot and actual card renderer. Observed marketing/operating code/logo fields, safe origins, no-referrer loading, relative/unsafe rejection, load failure and mixed carrier identity all have tasks. No guessed carrier identity, new branding service or hypothetical permission gate is introduced.

## Plan scope and estimates

| Plan | Tasks | Modified files | Wave | Estimated tokens | Budget | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 18-06 | 2 | 6 | 6 | 28,000 | 100,000 | Within targets |
| 18-07 | 3 | 14 | 7 | 45,000 | 100,000 | File-scope warning |
| 18-08 | 3 | 10 | 8 | 34,000 | 100,000 | File-scope warning |
| 18-09 | 2 | 10 | 7 | 30,000 | 100,000 | File-scope warning |
| 18-10 | 3 | 13 | 9 | 38,000 | 100,000 | File-scope warning |
| 18-11 | 3 | 13 | 10 | 31,000 | 100,000 | File-scope warning |
| 18-12 | 2 | 5 | 11 | 26,000 | 100,000 | Within targets |

Each `estimate-check --calibrated` returned `over_budget: false`, with no slicing recommendation. Confidence is **low**, factor 1, sample count 0: these are uncalibrated planning estimates, not measured execution costs. No plan reaches the fifteen-file blocking threshold. The accepted rationale for retaining the warnings is coordinated additive changes across existing strict contracts, two or three bounded tasks per plan, no new dependencies/services/migrations, and under-budget estimates. This rationale does not erase the warning or guarantee execution duration; unexpected scope expansion should trigger a new split before execution continues.

## Nyquist and validation

| Tasks | Wave | Automated checks | Failing direction | Result |
| --- | ---: | --- | --- | --- |
| 06-01/02 | 6 | Mounted workspace/search, existing API/proxy/Trip regressions | Nonzero exit, missing/zero collection and behavioral failure | Present |
| 07-01/02/03 | 7 | CRUD digest/readback, new graph journey/checkpoints, parser/UI/proxy | Same, including private-state leak or stale effect | Present |
| 09-01/02 | 7 | Normalization/registry/schema and carrier/card behavior | Same, including unsafe or stripped identity fields | Present |
| 08-01/02/03 | 8 | SDK dispatch/worker/journey and Undo interaction | Same, including budget/authority/identity failure | Present |
| 10-01/02/03 | 9 | Comparison, deterministic review/CRUD and chat/Trip regressions/build | Same, including chat dependency or exact-reference mismatch | Present |
| 11-01/02/03 | 10 | Recovery/AccountApp, deferred lifecycle, responsive interactions/build | Same, including scope leaks and UI failure | Present |
| 12-01/02 | 11 | Grouped backend/frontend/build plus required evidence review | Same, including absent real readback/browser/live evidence | Present |

Sampling: 18/18 tasks have automated verification; every wave satisfies continuity. New test files are explicitly created by their owning tasks before dependent checks; no orphan `MISSING` sentinel exists. VALIDATION.md exists and distinguishes current planned gates from historical evidence. Its `nyquist_compliant: false` is honest pending execution, not a missing validation architecture. Command duration was not measured and no latency claim is made.

The orchestrator supplied clean command-path and failing-direction probes: 28 command blocks across all twelve historical/current plans, zero blockers/warnings. This checker consumed those results rather than rerunning their deterministic probes. The path recognizer alone covers only supported directory/prefix forms; the orchestrator additionally audited 61 explicit Python/JS target occurrences in the seven new plans and found zero undeclared missing paths. Three new test paths are declared creations. No escaped shell `&amp;` entities, swallowed-error comparison defaults, watch-mode checks or invented test-count assertions remain in the new plans.

The checker independently ran `verify.plan-structure` for all seven plans: all valid, all eighteen tasks have files/action/verify/done. Must-haves were loaded with `frontmatter.get --field must_haves`. Architectural responsibilities, current pattern reuse, requirements, cross-plan data contracts and AGENTS.md gates were checked. Research has explicit implementation dispositions rather than an unresolved product decision; live logo observations remain an execution check. No current REVIEWS.md input was supplied, so review-incorporation is not applicable.

The mandatory Travella testing skill was read before review and reread before reporting. The inherited choice to decline alternatives is preserved. The parent owns the inspected planning sketch evidence at [planning verification](../../../artifacts/testing/2026-10-27-shared-travel-planning/verification.md); this checker makes no new screenshot-inspection claim. Plans retain authenticated Chrome DevTools, example-account use, source-hash-verified rebuild, inspected screenshots/console/network, real FastAPI/database readback and bounded live samples. These checks remain unexecuted for the correction. Earlier Phase 15/17/18 acceptance gaps and final traveler UAT remain open.

## Structured issues

```yaml
issues:
  - plan: "18-07"
    dimension: scope_sanity
    severity: warning
    required_property: "Execution slices stay within the recommended 5–8 modified-file scope."
    description: "Plan 18-07 coordinates 14 files across three tasks; this exceeds the ten-file warning threshold. Its 45,000-token estimate is below the 100,000 budget but has low confidence with zero completed calibration samples."
    fix_hint: "Retain the documented bounded-task rationale and split any additional scope before execution; a smaller coherent slice is another valid route."
  - plan: "18-08"
    dimension: scope_sanity
    severity: warning
    required_property: "Execution slices stay within the recommended 5–8 modified-file scope."
    description: "Plan 18-08 modifies 10 files across three tasks for host view operations, worker grounding and Undo; its 34,000-token estimate is low confidence."
    fix_hint: "Keep the existing host/controller boundaries explicit and re-slice if new files or operations become necessary."
  - plan: "18-09"
    dimension: scope_sanity
    severity: warning
    required_property: "Execution slices stay within the recommended 5–8 modified-file scope."
    description: "Plan 18-09 modifies 10 files across two tasks to propagate carrier metadata through strict projections and UI tests; its 30,000-token estimate is low confidence."
    fix_hint: "Preserve the coordinated nullable-field scope and avoid folding unrelated provider or card changes into this slice."
  - plan: "18-10"
    dimension: scope_sanity
    severity: warning
    required_property: "Execution slices stay within the recommended 5–8 modified-file scope."
    description: "Plan 18-10 modifies 13 files across three tasks for comparison, deterministic exact choice and sidechat; its 38,000-token estimate is low confidence."
    fix_hint: "Retain task-local checks and split additional behavior if the existing review/confirmation contracts prove insufficient."
  - plan: "18-11"
    dimension: scope_sanity
    severity: warning
    required_property: "Execution slices stay within the recommended 5–8 modified-file scope."
    description: "Plan 18-11 modifies 13 files across three tasks, including the necessary AccountApp 401 cleanup regression, recovery races and accessibility; its 31,000-token estimate is low confidence."
    fix_hint: "Keep recovery, lifecycle and presentation work bounded to the listed tasks; split newly discovered cross-account or navigation changes rather than expanding silently."
```

## Recommendation

No blocker remains. The five nonblocking scope warnings are explicitly retained with the orchestrator's coordination rationale; they are not silently treated as passes. Later authorized execution can proceed with those cautions and all technical evidence gates intact. The present user request ends at planning: do not start implementation, deployment or acceptance closure from this review.
