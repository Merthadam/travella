---
phase: "16"
slug: date-gated-travel-previews-and-booking-navigation
status: verified
threats_open: 0
threats_open_nonblocking: 0
asvs_level: 1
block_on: high
created: 2026-10-16
initial_review_head: 5c0320b
remediation_review_head: 5bf1fb9
corrected_navigation_review_head: b1114e4
corrected_navigation_remediation_head: b2d3f7e
lease_cleanup_review_head: f61fc82
history_routing_review_head: 228f322
register_authored_at_plan_time: true
---

# Phase 16 Security Audit

Source mitigation verification against all three PLAN threat registers, CONTEXT, AI-SPEC and UI-SPEC. The existing independent research/planning agent context was reused due the native thread cap; a fresh typed security-auditor instance could not be created. The reviewer did not implement code and was explicitly assigned these two reports by the root. No accepted-risk waiver or phase completion is implied.

## Trust Boundaries

| Boundary | Verified control |
|---|---|
| Browser → public Agent → private Connector | Existing token validation and owned active Plan read; fixed read-only tools bind owner, Plan and bearer in host closure |
| Traveler/Canvas → date and mode inputs | Deterministic exact grammar, authenticated source roles, explicit mode validators and no provider dispatch until required inputs pass |
| Provider/model → public result | Nested token-free DTO, observed search/mode/option membership, host prose and fixed strict A2UI catalog |
| Current run → graph checkpoint/browser | Request-local collector outside graph channels; terminal/generation/epoch checks, bounded memory and expiry |

## Threat Register

All dispositions are `mitigate`. Source paths below are relative to the repository.

| Threat | Category | Severity | Evidence | Status |
|---|---|---|---|---|
| T-16-01 | Elevation / spoofing | high | `service.py` owned active Plan read before graph; `canvas_travel.py` fixed `_call` actions/context; foreign/deleted/missing Plan and tool-escalation tests | CLOSED |
| T-16-02 | Tampering | high | `resolve_dates`, authenticated clarification source checks and validators; initial weekday bypass reproduced, fixed in `fe5ffa9`; independent 55-case zero-call rerun | CLOSED |
| T-16-03 | Information disclosure | high | `safe_stay` / `safe_flight` nested DTO reconstruction; collector outside graph; actual saver/token sentinel tests | CLOSED |
| T-16-04 | Tampering | high | `selected` cross-checks run registry; `CanvasTravel.jsx` strict schemas, fixed component/action and matching opaque search ID | CLOSED |
| T-16-05 | Denial of service | medium | Observer lock, cached exact requests, one capability/two lookups/one search per mode, five total attempts, deadline reserve, 24KiB tool text and bounded complete snapshots | CLOSED |
| T-16-SC | Dependency tampering | high | Diff adds no packages or lockfile changes; existing SDK/React/A2UI/Pydantic contracts reused; root restored with locked `npm ci` | CLOSED |
| T-16-06 | Flight tampering | high | Flight input contract, observed airport resolution, return-route/local-date checks, fixed party-return basis, unknown terms retained | CLOSED |
| T-16-07 | Mixed-mode tampering/disclosure | high | Separate typed snapshots and registry mode checks; duplicate/substituted IDs rejected; nested flight/room tokens excluded | CLOSED |
| T-16-08 | Denial of service | medium | Shared observer budget/lock/cache; concurrent two-mode lookup test reaches five and rejects a sixth call | CLOSED |
| T-16-09 | Checkout elevation | high | `TravelResults` is a local snapshot renderer; new path has no checkout/detail/refetch calls; legacy checkout files unchanged | CLOSED |
| T-16-10 | Generation/criteria tampering | high | `service.finish` generation check; hook run identity/epoch/staged terminal checks; relevant draft baseline and current-mode identity; late/cancelled provider barriers | CLOSED |
| T-16-11 | Retention disclosure | high | Plan-change/unmount cleanup, opaque history fields, no historical snapshot rehydration, request collector reset and nested checkpoint exclusion | CLOSED |
| T-16-12 | Telemetry disclosure | medium | `CanvasTravelObserver.telemetry` fixed outcomes/modes/counts/timing only; sentinel log test verifies no identity, date, nationality or provider contents | CLOSED |
| T-16-13 | Retention/retry resource exhaustion | medium | Four full snapshots, message references only, ten-minute expiry, byte limits, no automatic provider retry/refetch | CLOSED |
| T-16-14 | Verification evidence tampering | medium | Root checked current container hashes and actual Chrome journeys; six final captures independently inspected; missing final Back capture explicitly disclosed and provisional image excluded | CLOSED — final evidence update below |

The initial high date-gate finding is not waived: it was reproduced, fixed and independently tested. Mixed-mode clarification preservation was fixed in `a0457a8` / `5bf1fb9`; explicit stay currency was fixed in `d1574f3`. All three source findings are closed in `16-REVIEW.md` after independent targeted verification.

## Accepted Risks Log

No accepted risks. Evidence integrity is closed by the final update below, with the failed Back capture explicitly disclosed. The orchestrator retains the mandatory delivery-gate decision; no missing image is represented as successful evidence.

## Security Audit Trail

| Date | Register threats | Closed | Open blocking | Open nonblocking | Reviewer |
|---|---:|---:|---:|---:|---|
| 2026-10-16 | 15 | 14 | 0 | 1 | Reused independent phase16_research context |

Independent checks: 11 focused authorization, checkout-denial, saver, concurrency, cancellation, generation, safe-logging and shared-budget tests passed; 55 date-gate cases and 10 source/clarification cases passed after remediation; a final 17-case currency/invalid-input/clarification subset passed at `5bf1fb9`. Test boundaries inject SDK/provider fixtures; no live provider call or production-browser result is claimed by this audit. Existing deprecation warnings are unrelated to these controls.

## Sign-Off

- [x] All planned threats have a disposition and evidence.
- [x] No open high/critical source mitigation remains after the verified date fix.
- [x] `threats_open: 0` reflects the configured high blocking threshold.
- [x] T-16-14 closed after current-source Chrome observations and independently inspected captures; final Back capture limitation disclosed below.

**Verdict:** source audit SECURED at ASVS level 1; browser/evidence delivery gate remains open. This is not phase completion.

**Scope cutoff:** this verdict covers the original results-only implementation through `5bf1fb9`. The later user instruction to reuse the existing manual search page and show preview images changes the projection/navigation boundaries and must receive an incremental audit after implementation. In particular, T-16-09's original no-checkout-new-renderer proof cannot automatically be reused for that revised design.

## Corrected D-04 incremental audit — fa05765 / b1114e4

This section supersedes the original scope cutoff for the two corrected implementation commits. Original controls remain present. T-16-09 is CLOSED under the revised traveler-authority boundary: the agent/import cannot check out; the existing authenticated manual screen can continue only through its explicit controls and existing confirmations. Hotel detail/availability refresh is deliberate after View rooms. Tokenless flight details require a deliberate current manual search; no token is introduced into the agent snapshot.

| Threat | Category | Severity | Evidence | Status |
|---|---|---|---|---|
| T-16-15 | Image disclosure/tampering | high | `safe_photo` applies existing public HTTPS validator plus query/fragment/length checks; `safeTravelImage` and `TravelPhoto` enforce browser-safe source/no-referrer/fallback; neutral inline flight SVG; 10 independent backend sentinel/photo cases passed | CLOSED |
| T-16-16 | Import elevation/disclosure | high | `travelSnapshotSchema.safeParse`, Plan/mode/currentness gates and explicitly reconstructed hotel metadata; no checkout token in imported schema; observed hotel_id reaches manual detail only after action | CLOSED |
| T-16-17 | Import/manual state tampering | high | Abort/epoch and ordinary rerender/manual ownership checks; `b2d3f7e` adds explicit navigation request identity, independently verified in both actual SSE→PlanningCanvas journeys; see REVIEW WR-03 | CLOSED |
| T-16-18 | Manual continuation elevation | high | Hydration only sets local state; search/details require existing deliberate controls; flight refresh submits the existing form; mock reservation remains behind existing separate confirmation | CLOSED |

**Current totals:** 19 planned threats; 18 closed, zero high/critical source mitigations open, one medium browser-evidence gate open (T-16-14). No risk acceptance. Source audit SECURED through `b2d3f7e`; root separately closes required browser evidence. Independent remediation command `.venv/bin/python -m pytest services/agent/tests/test_canvas_travel.py -q -k 'journey and 4'` passed both stay/flight actual-SSE/React journeys in 3.90s, proving matching explicit reimport after manual continuation without an automatic new search.

## Stop/disconnect follow-up — f61fc82

Verified the new one-shot cancellation transition and shielded stream-worker teardown in `services/agent/service.py:418-478`, against the existing lease release and committing boundary at `:285-343`. Repeated Stop/disconnect/ASGI-consumer cancellation no longer interrupts the worker's lease cleanup; active-stream removal waits for actual worker completion. Existing late-result suppression and generation checks remain intact. T-16-10 and T-16-13 remain CLOSED with stronger cancellation/retry evidence.

Independent targeted verification: **7 passed in 1.87s** across the four Stop/disconnect × repeated-consumer-cancellation cases using real CRUD HTTP handlers/signed identity/SQLite plus three late-provider and superseded-generation cases. The tests assert persisted lock release before successful generation-2 retry and empty active-stream bookkeeping. No new threat or accepted risk. Source verdict remains SECURED through `f61fc82`, with `threats_open: 0`; T-16-14 still awaits root's final current-build Chrome evidence.

## Same-route history follow-up — 228f322

Verified `PlansApp.jsx` now treats same-path popstate as local Canvas navigation before calling load/open and the dirty-Plan guard. Different paths retain existing navigation/leave protection, and the initial mount is not skipped. This corrects root's real-Chrome listener-order failure without changing resource authorization or granting authority to history state. The existing strict Plan/search identity checks continue to decide whether a requested snapshot can render; opaque history references remain references only.

Independent same-path regression proof in both four-result actual HTTP/SSE→React stay/flight journeys: **2 passed in 4.47s**, checking no prompt or extra Plan fetch and preservation of unsaved editor state before continuing preview/manual navigation. T-16-10/T-16-17 remain CLOSED. Source verdict SECURED through `228f322`; no new source threat or accepted risk. T-16-14 remains a separate root-owned final-browser evidence gate until the rebuilt single-Back journey and replacement screenshot are recorded.

## Final evidence-integrity update

Root rebuilt `228f322` and directly observed a controlled single Chrome Back with no dialog, same Plan pathname, manual view hidden, retained composer/draft budget, and focus returned to View all stays. Root also recorded successful live Stop→immediate Retry, matching manual imports without automatic search, and real provider imagery. This reviewer independently inspected the six current desktop/mobile/recovery JPEGs listed in `16-UI-REVIEW.md`. Source hashes and live-versus-fixture provenance remain in the verification record.

The screenshot call after successful Back hung; no replacement Back image is claimed. The incorrect provisional image is excluded and root is removing it. This explicit limitation closes the evidence-integrity threat rather than concealing missing proof. It does not waive the project's delivery requirements or claim a completed Back capture. Current totals: **19 threats closed, zero blocking/nonblocking source threats open, no accepted risks**. Source verdict remains **SECURED through `228f322`**. Earlier pending-evidence statements describe the historical review checkpoints and are superseded by this update; final phase verification and delivery remain orchestrator-owned.


## Ship delta review — 2026-10-16

Inline review of the final model-selected tools, Research preview path, selector/pagination changes and integration with main at 8ce1419. No new open threats identified; threats_open remains 0. Earlier grammar/host-prose descriptions above are historical: Canvas language interpretation now belongs to the SDK model, while typed criteria, authenticated date-source evidence, actual airport-code validation, call/deadline budgets and output membership remain host checks. Search operations remain read-only; durable Plan choices still require existing explicit actions.

Reviewed token-free nested snapshot projection, request-local result collection and checkpoint removal, cancellation/late-result handling, exact airport/route/date validation, allow-listed sanitized failure codes and manual-page import validation. Research has no View all action. The merge retains main's conditional flight generation/card visibility and permits explicit read-only preview navigation without changing that preference. No credentials, dependencies, migrations or external booking tools added. Final combined regression run: 285 agent/graph/checkpoint/evaluation tests and 21 flight-generation/CRUD tests passed. This is an inline update, not a new independent reviewer verdict.
