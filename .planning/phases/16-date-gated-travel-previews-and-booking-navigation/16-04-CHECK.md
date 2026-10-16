# Phase 16 Plan 04 — Independent plan check

**Date:** 2026-10-16  
**Status:** VERIFICATION PASSED  
**Scope:** User-corrected existing manual TravelSearch destination and pictured side-chat previews. This approves the plan, not completed implementation or browser acceptance.

```yaml
issues: []
```

## Findings

The two-task, eight-file correction plan implements the traveler's explicit instruction. `16-04-PLAN.md`, the authoritative UI-SPEC D-04 addendum, CONTEXT/REQUIREMENTS corrections and updated AI-SPEC agree: View all opens the actual existing manual Flight search / Accommodation search page with exact observed criteria and results, and previews include honest imagery. Earlier results-only/text-first rules are superseded, not execution requirements.

| Dimension | Result | Evidence |
|---|---|---|
| Requirement and context coverage | PASS | Tasks 01/02 cover corrected TRAVEL-16-04/05, lifecycle 06 and verification 07. Original plans retain Canvas-only tool/date/skill requirements 01–03; this correction explicitly preserves their gates and regression coverage. Existing manual controls remain available; agent checkout authority and the separate booking graph remain excluded. |
| Task completeness | PASS | Both tasks name files, read-first seams, concrete actions, acceptance criteria, automated commands, failure conditions and done outcomes. `query verify.plan-structure` reports valid, two tasks, zero errors and zero warnings. |
| Dependencies and ordering | PASS | Wave 4 follows completed 16-03 implementation tasks. The root-approved browser dependency resolution below prevents waiting on obsolete UI acceptance. Tasks inside 04 run sequentially; no same-wave conflicting producer is introduced. |
| Runtime wiring and data contracts | PASS | View all search_id → same-Plan currentness guard → existing accommodation/flights screen → importedSnapshot → existing form/results. Safe DTO metadata supports real filter/detail consumers, and actual emitted SSE→parser→A2UI→manual page tests verify the entire path. No orphan replacement screen remains. |
| Scope sanity | PASS | Eight files, one vertical tracer and one focused regression task. No dependency, provider endpoint, registry, durable schema or graph expansion. Existing manual visual language and handlers are reused. |
| Validation and threat coverage | PASS | The plan requires observed IDs/criteria, zero opening search/lookup/detail, one-time hydration, pending-request races, independent fresh manual results, missing/unsafe/broken imagery, UTF-8/privacy tests and legacy sandbox regressions. Root owns revised sketch and authenticated final Chrome desktop/mobile evidence. |

## Critical seam review

- **Already-mounted forms:** importing a different search updates all dates, country/nationality, rooms and ages, currency, airports, passenger ages and cabin. Airport owns local query state, so the plan explicitly synchronizes its displayed label. StayDestination receives an existing criteria-backed selection with legitimate nullable place_id; no provider ID is fabricated and hydration triggers no destination/airport lookup.
- **One import per identity:** same-ID rerenders preserve edits and later manual results. A distinct eligible import resets filters/comparison/detail once and aborts/invalidates prior manual work; a late response cannot replace it. A successful later explicit manual search becomes the page's own result, independent of the old imported snapshot's expiry.
- **Observed result criteria:** the form can be edited, while detail requests use the criteria associated with the observed snapshot. Imported data is not rewritten from assistant prose or current Canvas defaults.
- **Manual continuation:** import opens no dialog and performs no search, prebook or booking call. Explicit View rooms uses observed hotel_id with the existing authenticated detail/availability path. Token-free flight results offer an explicit normal search refresh; only a newly returned manual capability can expose the existing separate sandbox confirmation. No capability returns to model/chat/history/checkpoints.
- **Imagery and metadata:** safe stays include observed hotel_id/image_url/stars/review fields/facilities needed by existing controls, within existing payload bounds. Unsafe image URLs become absent images. Provider photo, same-size missing/broken fallback, no-referrer, accessible labeling and a local generic plane are explicit. Current contracts contain no flight logo; invented branding/CDN URLs are prohibited.
- **Plan/lifetime continuity:** owner/Plan/mode/run/expiry guards remain active for imports. Back retains Canvas editor, composer, scroll and focus. Opaque history and unavailable-reference recovery remain; later independent manual results must not be invalidated merely because their former import expired.
- **Regression substance:** tests target actual existing page DOM and real emitted event parser/renderer wiring, not a stub replacement. They cover both mode criteria, full retained result identity, already-mounted state, zero navigation requests, explicit manual actions, races and legacy checkout boundaries.

## Approved dependency resolution

Root explicitly approved this orchestration decision: **16-03 tasks 01 and 02 are complete; task 03's final browser acceptance is superseded by the corrected 16-04 journey and root verification after 04.** Do not require the rejected results-only UI to pass browser acceptance before implementing the requested correction. Root will finalize the 16-03 summary only after the corrected final browser gate. The same clarification is recorded in the 04 plan objective.

## Delivery gates retained

Root must capture and inspect the revised sketch before implementation, then exercise current-source authenticated Chrome desktop/mobile journeys, exact imported fields/results, image/fallback states, manual continuation, Back/reload/expiry, console and network. The new UI-SPEC addendum explicitly says prior captures do not certify this correction. Fixture success cannot establish live SDK/provider quality. The provisional EVAL-REVIEW against the earlier implementation remains historical evidence until the corrected integration is audited.

The checker made no production/test edits or browser calls. Only the assigned check artifact and narrow AI-SPEC navigation/imagery passages were changed. Review used the GSD plan-checker contract in the existing independent context because the collaboration thread cap prevents another typed reviewer.

**VERIFICATION PASSED.** Proceed with the authorized 16-04 execution after the root-owned revised sketch capture; completion still requires implementation, tests, source/security review and corrected browser evidence.
