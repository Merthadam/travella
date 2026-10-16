---
phase: "16"
slug: date-gated-travel-previews-and-booking-navigation
status: verified
threats_open: 0
threats_open_nonblocking: 1
asvs_level: 1
block_on: high
created: 2026-10-16
initial_review_head: 5c0320b
remediation_review_head: 5bf1fb9
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
| T-16-14 | Verification evidence tampering | medium | Root owns current container hashes and authenticated Chrome evidence; fixture/live distinctions documented, but final browser gate pending at audit | OPEN — below high threshold |

The initial high date-gate finding is not waived: it was reproduced, fixed and independently tested. Mixed-mode clarification preservation was fixed in `a0457a8` / `5bf1fb9`; explicit stay currency was fixed in `d1574f3`. All three source findings are closed in `16-REVIEW.md` after independent targeted verification.

## Accepted Risks Log

No accepted risks. The pending medium verification-evidence threat is an outstanding execution gate, not risk acceptance. The mandatory Travella browser skill still prevents claiming complete delivery until the root verifies it.

## Security Audit Trail

| Date | Register threats | Closed | Open blocking | Open nonblocking | Reviewer |
|---|---:|---:|---:|---:|---|
| 2026-10-16 | 15 | 14 | 0 | 1 | Reused independent phase16_research context |

Independent checks: 11 focused authorization, checkout-denial, saver, concurrency, cancellation, generation, safe-logging and shared-budget tests passed; 55 date-gate cases and 10 source/clarification cases passed after remediation; a final 17-case currency/invalid-input/clarification subset passed at `5bf1fb9`. Test boundaries inject SDK/provider fixtures; no live provider call or production-browser result is claimed by this audit. Existing deprecation warnings are unrelated to these controls.

## Sign-Off

- [x] All planned threats have a disposition and evidence.
- [x] No open high/critical source mitigation remains after the verified date fix.
- [x] `threats_open: 0` reflects the configured high blocking threshold.
- [ ] Root closes T-16-14 after required current-source Chrome evidence.

**Verdict:** source audit SECURED at ASVS level 1; browser/evidence delivery gate remains open. This is not phase completion.

**Scope cutoff:** this verdict covers the original results-only implementation through `5bf1fb9`. The later user instruction to reuse the existing manual search page and show preview images changes the projection/navigation boundaries and must receive an incremental audit after implementation. In particular, T-16-09's original no-checkout-new-renderer proof cannot automatically be reused for that revised design.
