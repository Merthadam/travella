---
phase: 18
status: human_needed
---

# Phase18 verification

Implemented: separate Flights/Stays Claude SDK workers inside a private LangGraph subflow, isolated CRUD-owned discussions, bounded shared brief and research notes, scoped LiteAPI tools, observed comparison cards and exact confirmed shortlist/preferred actions. The trip Canvas and parent Plan graph remain the entry and return point.

Actual evidence is in [verification.md](../../../artifacts/testing/2026-10-25-focused-travel/verification.md) and [agent-evaluation.md](../../../artifacts/testing/2026-10-25-focused-travel/agent-evaluation.md). Automated HTTP/database tests, migration0012 on PostgreSQL17.6, authenticated desktop/mobile Chrome and a bounded live SDK/provider sample were executed. See the report for exact counts, known baseline failures and screenshots.

FOCUS01/02/05/07/09/10 have implementation and deterministic persistence evidence. FOCUS03/04/06/08 have implementation, deterministic tests and partial live evidence; the full live-quality/browser concurrency matrix remains open. No requirement is declared fully accepted solely from mocks. The browser caught a room/rate mismatch and an undersized specialist evidence budget; both were corrected and regression-tested.

Verdict: implementation available for user review, **phase acceptance pending**. Required user UAT and remaining live-quality cases are listed in 18-UAT.md. Do not close Phase15/17 gaps or mark Phase18 complete automatically.


## Shared-workspace follow-up — 28 October 2026

Source: `feb7ecd`; plans18-06–18-12 executed. Verdict remains **human_needed**: implemented and available locally, with bounded technical evidence and explicit remaining acceptance work. Historical evidence above remains unchanged.

The final dedicated verifier inspected the controller → post-commit host batch → strict SSE/parser → guarded reducer wiring, exact manual review and actual CRUD persistence, and reported no new actionable defect in its bounded inspection. It was interrupted before producing its final artifact after an extended run. This is the orchestrator's evidence reconciliation, not a completed independent clean-verification verdict. The earlier code reviewer likewise supplied three confirmed findings before interruption; all three were corrected and regression-tested (18-REVIEW.md).

### Requirement accounting

| Requirement | Implemented behavior and evidence | Remaining acceptance |
| --- | --- | --- |
| FOCUS-01 | Separate topic history/worker and per-owner/Plan/topic workspace; topic HTTP and recovery tests | Traveler UAT |
| FOCUS-02 | Compact brief, request-local workspace context, first-hydration versus real-change guard | Traveler UAT |
| FOCUS-03 | Bounded stay tools, apartment catalog filtering, live stay sorting and exact-room discussion | Full live-quality matrix |
| FOCUS-04 | Flight search/comparison tools, live direct/price refinement and observed carrier identities | Full live-quality matrix |
| FOCUS-05 | Shared main manual workspace with separate Canvas-style topic sidechat; real desktop/mobile journey | Traveler UAT |
| FOCUS-06 | Generation/revision/epoch fences, manual precedence, Stop and guarded Undo; deferred race tests and live dirty-draft refusal | Timed multi-tab/network-loss browser matrix |
| FOCUS-07 | Exact review → existing challenge → explicit confirmation; real choose/replace/remove and stored unbooked readback | Traveler UAT |
| FOCUS-08 | Source/time/price/unknown facts and exact room identity; no invented checkout or booking success | Full live-quality matrix |
| FOCUS-09 | Registry ownership/topic authorization, request-local projection, bounded recovery and tools; negative HTTP tests | Broader deployment verification outside this change |
| FOCUS-10 | Existing attributed research notes and structured exact-reference discussion context; worker/CRUD tests | Full live-quality matrix |
| FOCUS-11 | One controller for draft/applied query, snapshot and local view; manual filtering works without chat | Timed live concurrency permutations |
| FOCUS-12 | Allowlisted bounded view operations, signed post-commit batch, strict parser/reducer, guarded Undo | Broader live-quality and concurrency cases |
| FOCUS-13 | Main2–3 comparison, exact same-property rates, normal chat receives displayed refs, manual choice independent of history/model | Traveler UAT |
| FOCUS-14 | Observed carrier marks/fallbacks and original source/price terms; actual loaded logo images and deterministic unsafe/error tests | Dedicated browser broken-image/mobile-carrier sample |
| FOCUS-15 | Bounded reference-only session recovery, registry revalidation, explicit unavailable recovery;390px Browse/Chat and composer inspected | Native200%zoom and remaining native keyboard/race matrix |
| FOCUS-16 | Plans/summaries, current/prior tests, actual HTTP/database readback, authenticated browser/screenshots, bounded SDK samples recorded | Interrupted independent review; full quality matrix and traveler acceptance |

### Executed evidence

- Frontend:236passed,12conditional fixture skips. Python:705passed,6isolated-PostgreSQL skips,1 independently reproduced baseline onboarding-route404failure. Actual Python→React bridge rerun:215passed. Counts overlap and are not summed.
- Final wording correction:64workspace tests passed. Production build passed with the known large-chunk warning. Final local rebuild passed health and example-account sign-in/session/sign-out checks; all four representative frontend source hashes match the container.
- Chrome exercised manual flight and stay searches, apartment/direct/price filtering, comparison, exact choice and persistence, flight replacement/removal, topic-history503 independence, provider-offline recovery, live SDK view/Undo, dirty-form refusal, room-specific ordinary discussion, reload and unavailable-registry recovery, mobile and themes.
- Final rebuilt app reopened the retained test Plan authenticated. No payment, booking, deployment, push or merge occurred.

[Full executed commands, per-edge verdicts and screenshots](../../../artifacts/testing/2026-10-27-shared-travel-workspace/verification.md). [Bounded live-model samples](../../../artifacts/testing/2026-10-27-shared-travel-workspace/agent-evaluation.md). [Review findings and fixes](18-REVIEW.md). [Planned threat mitigation checks](18-SECURITY.md).

The initial live Stays ValueError did not recur, but its cause remains unproven. Native200%zoom, deliberate browser timing cases, full AI-SPEC quality and traveler UAT remain open. Phase15/17 gaps remain open. No requirement is declared fully accepted from fixtures or this reconciliation alone.
