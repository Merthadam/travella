---
phase: 18-focused-flights-and-accommodation-agents
plan: "12"
subsystem: integrated-verification
status: complete
acceptance: human_needed
requirements-completed: [FOCUS-11, FOCUS-12, FOCUS-13, FOCUS-14, FOCUS-15, FOCUS-16]
completed: 2026-10-28
key-files:
  created:
    - artifacts/testing/2026-10-27-shared-travel-workspace/verification.md
    - artifacts/testing/2026-10-27-shared-travel-workspace/agent-evaluation.md
    - .planning/phases/18-focused-flights-and-accommodation-agents/18-REVIEW.md
    - .planning/phases/18-focused-flights-and-accommodation-agents/18-SECURITY.md
---

# Plan18-12 — integrated execution evidence

Shared manual Flights/Stays workspaces are implemented and available for traveler review at http://localhost:5174. This plan records actual evidence and unresolved limits; it does not grant traveler acceptance or close prior phase gaps.

## What was exercised

- Authenticated Chrome manual search/filter/sort/details/comparison and exact unbooked selection in both modes. Flight choice/replace/remove worked with topic-history503 and real HTTP readback. Exact stay room EUR710.09 persisted rather than property minimumEUR669.35.
- Real Claude SDK flight direct/price view change and Undo, dirty-form refusal, stay sorting, and two exact rooms of one property through ordinary sidechat. New composer draft and date-field focus survived a reply. Existing preferred choice remained unchanged by research.
- Actual reload restored28results through registry lookup with no automatic supplier search. Server restart produced a truthful Search again state with dates/choice retained. New authentication cleared old recovery.390px Browse/Chat with preserved draft and visible composer was inspected, alongside desktop light/dark captures.
- Actual carrier logos from observed provider metadata and mixed identity loaded. Missing/error/unsafe image cases passed deterministic tests.

## Test results

- Final current/prior Python run:705passed,6isolated-PostgreSQL skips,1independently reproduced baseline onboarding-route404failure. No assertions weakened.
- Final current/prior frontend run:236passed,12conditional fixture skips. Actual Python→React bridge suites rerun after parser fix:215passed.
- Final wording-only label correction:64workspace tests passed. Production build passed; known large-chunk warning remains.
- Targeted integration fixes included85worker/tool/actualCRUD tests,109frontend tests,108manual-registry parser checks and22specialist prompt tests. Counts overlap; they are not added together.
- Static schema/UI gates passed; codebase-drift advisory skipped because STRUCTURE.md is absent.

## Browser-driven corrections

1. Preserved new composer drafts and keyboard focus during replies.
2. Added exact-reference identity through worker/CRUD for two room rates of one property; kept durable evidence UUIDs separate from provider identity.
3. Forwarded displayed ordered room references to ordinary follow-ups using existing structured discussion context.
4. Distinguished initial brief hydration from real edits so manual review survives initially unavailable history.
5. Normalized only empty manual registry presentation metadata to neutral values; retained strict actual criteria, references and scope. Fresh room comparison and saved-reference details no longer fail Canvas metadata parsing.
6. Clarified separate-search comparison wording without implying an observation is older; kept internal room IDs out of answer prose.

## Evidence and limitations

[Verification and per-edge verdicts](../../../artifacts/testing/2026-10-27-shared-travel-workspace/verification.md), [live sample findings](../../../artifacts/testing/2026-10-27-shared-travel-workspace/agent-evaluation.md), [integration regressions](../../../artifacts/testing/2026-10-28-workspace-integration/verification.md).

Native200%zoom remains unverified: headless keyboard shortcuts did not change browser zoom metrics. The full live AI-SPEC matrix and deliberately timed multi-tab/network-loss races remain pending; deterministic protection tests passed. Initial live Stays ValueError did not recur, but its specific cause is unproven. Reviewer supplied three confirmed defects before interruption; fixes are tested, but an exhaustive clean-review verdict is not claimed. Traveler UAT and earlier Phase15/17 gaps remain open. No deployment, push, merge, booking or payment occurred.

## Threat flags

No newly unmitigated planned high-severity threat found.23planned follow-up mitigations were checked at ASVS1 depth in18-SECURITY.md. Technical/acceptance limits remain explicit rather than accepted risks.

## Self-check

PASS: source commits and evidence files exist; commands collected nonzero test counts; screenshots were inspected; actual HTTP/database and live-model evidence are distinguished from fixtures. Overall phase remains human_needed.
