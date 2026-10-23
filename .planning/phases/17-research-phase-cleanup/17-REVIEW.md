---
phase: 17-research-phase-cleanup
reviewed: 2026-10-23T18:15:22Z
depth: standard
diff_base: 0289a0c
reviewed_head: 370fcd2
files_reviewed: 41
files_reviewed_list:
  - frontend/src/PlansApp.jsx
  - frontend/src/PlansApp.test.jsx
  - frontend/src/features/plans/components/PlanConversation.jsx
  - frontend/src/features/plans/components/PlanConversation.test.jsx
  - frontend/src/features/plans/components/PlanningCanvas.jsx
  - frontend/src/features/plans/components/ResearchBriefOverlay.jsx
  - frontend/src/features/plans/components/ResearchBriefOverlay.test.jsx
  - frontend/src/features/plans/components/ResearchDraftOffer.jsx
  - frontend/src/features/plans/components/ResearchDraftOffer.test.jsx
  - frontend/src/features/plans/components/ResearchProgress.jsx
  - frontend/src/features/plans/components/research-workspace.css
  - frontend/src/features/plans/usePlanningCanvas.js
  - frontend/src/features/plans/useResearchOffer.js
  - frontend/src/features/plans/useResearchOffer.test.jsx
  - frontend/src/features/plans/useTripContext.js
  - frontend/src/plansApi.js
  - frontend/src/plansApi.test.js
  - services/agent/claude/sdk_conversation.py
  - services/agent/crud_client.py
  - services/agent/graph/nodes/conversation.py
  - services/agent/http_contracts.py
  - services/agent/prompts/chat-v1.md
  - services/agent/service.py
  - services/agent/state/contracts.py
  - services/agent/tests/test_research_offer_integration.py
  - services/agent/tests/test_research_offers.py
  - services/agent/turn.py
  - services/auth/crud_client.py
  - services/auth/tests/test_crud_client.py
  - services/crud/api.py
  - services/crud/contracts.py
  - services/crud/migrations/versions/0011_research_draft_offers.py
  - services/crud/models.py
  - services/crud/repository.py
  - services/crud/research_context.py
  - services/crud/research_offers.py
  - services/crud/tests/conftest.py
  - services/crud/tests/test_migrations.py
  - services/crud/tests/test_research_offers.py
  - services/research_offers.py
  - services/trip_context.py
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings:
  critical: 4
  warning: 1
  total: 5
status: clean
---

# Phase 17: Code Review Report

**Reviewed:** 2026-10-23T18:15:22Z  
**Depth:** standard  
**Files reviewed:** 41  
**Status:** clean after review fixes; no outstanding findings at `370fcd2`.

## Summary

Reviewed `0289a0c..370fcd2 -- frontend/src services`, including stale-review recovery in `0c530a2`. Scope covers server readiness and persistent deferral, exact-review receipts, authorization and replay, gateway/browser projections, floating brief behavior, and integration with existing canvas controls. Preparation/prototype deletion and unrelated historical test failures are excluded.

The initial review found five reproducible defects. Implementation owners corrected them in `68b98ec` and `370fcd2`; the reviewer inspected the corrections and reran targeted regressions. Frontmatter finding counts describe **remaining** findings; the resolved items below preserve the evidence and original severity. This code review does not certify live model behavior or replace the parent-owned browser and phase acceptance gates.

## Narrative Findings (AI reviewer)

No outstanding findings at the reviewed head. The following findings were reproduced with actual CRUD FastAPI handlers, signed test identity, isolated SQL persistence, and deterministic Agent adapters where relevant. No paid model/provider calls were made.

### Resolved BLOCKER: First-draft confirmation could be bypassed through group generation

**File:** `services/agent/service.py:173-181` (current correction location; original guard only covered `generate_plan`).

**Issue:** A fresh Plan with `research_entry_required=true` could submit `generate_themes` or `generate_research` without a review receipt. Both calls reached the generation graph. Calling the action a retry did not establish an existing draft. The original unit test explicitly asserted this bypass with `entry_required=True`.

**Reproduction:** Create an eligible Plan without review/confirmation. Through production `CrudContextReader` and `AgentTurnService`, submit both group actions at the current revision without a receipt. Before correction, both returned `in_progress` and the deterministic graph invocation count became two.

**Fix applied:** Require authoritative first-entry policy for every canvas generation action. Reject missing authority rather than manufacturing `false` from a schema default. Permit existing-draft group retries only when canonical policy establishes an accepted draft. Receipt transport remains restricted to full draft generation.

**Resolution:** `370fcd2`. Real HTTP integration now rejects all three fresh-Plan generation actions with 409, invokes no graph, releases the lease, and preserves context. Missing/legacy authority also fails closed. Legitimate accepted-draft group retries remain covered.

### Resolved BLOCKER: A cropped model quote overrode an explicit traveler refusal

**File:** `services/crud/research_offers.py:221-234`; `services/research_offers.py:90-98`.

**Issue:** Request intent checked negation only inside the model-selected `source_quote`. A positive substring of a negative traveler message therefore cleared durable deferral and created a fresh actionable offer.

**Reproduction:** Set deferral, then complete a turn with message `Do not create a draft; keep researching.` and proposal `{intent: "request_review", source_quote: "create a draft"}`. Before correction, the HTTP response was 200 with `research_deferred=false` and an available offer.

**Fix applied:** Validate an explicit request against the entire current traveler message; full-message refusal/deferral takes precedence over the selected substring. Retain quote containment and reference validation.

**Resolution:** `68b98ec`. `test_negated_full_request_cannot_be_reenabled_by_positive_substring` now proves suppression survives this input.

### Resolved BLOCKER: Generic activity questions were treated as traveler priorities

**File:** `services/research_offers.py:54-87`; `services/crud/research_offers.py:49-89`.

**Issue:** The original priority evaluator accepted any occurrence of an activity noun. Thus the useful-context gate claimed traveler-grounded priorities even when the traveler had only asked about available activities.

**Reproduction:** Set destination Rome, flexible timing and two travelers, then append only `What museums are there in Rome?`. Before correction, GET research-offer returned `{eligible: true, reasons: []}`.

**Fix applied:** Require a bounded personal preference assertion or direct positive endorsement in conversation text; reject questions and source-report/epistemic language. Explicit interests fields retain separate handling because their editing action already establishes intent.

**Resolution:** `68b98ec`. `test_generic_activity_question_cannot_establish_traveler_priorities` covers the original question and additional inquiry/source-report cases. Initial explicit preferences and destination replacement behavior remain covered.

### Resolved BLOCKER: Changing flights prevented regeneration of an existing unsaved draft

**File:** `services/crud/research_offers.py:116-125`, interacting with `frontend/src/features/plans/components/PlanningCanvas.jsx:141-144`.

**Issue:** The first-entry classifier recognized accepted draft receipts only at the current context revision. In the existing canvas review, changing flight need increments that revision; the existing regeneration control then sends the reviewed revision without a new first-entry receipt. An unsaved draft was wrongly treated as never having entered the canvas and rejected.

**Reproduction:** Accept receipt-backed generation at revision R, change flight need through the real context handler to R+1, and submit the existing canvas-style full regeneration at R+1. Before correction, the explicit flight edit returned 200 but generation returned 409, `Review and confirm your trip before creating the first draft.`, with no second graph invocation.

**Fix applied:** Distinguish whether this Plan has previously entered a draft from whether a particular receipt is valid for the current revision. A saved canvas or Plan-owned accepted entry establishes existing-draft status across edits. Consumption of a supplied receipt still requires its exact current revision, fingerprint, ownership and live lease.

**Resolution:** `68b98ec`, with cross-service regression in `370fcd2`. The accepted unsaved draft remains eligible after a flight edit, existing regeneration/group controls succeed, stale receipt consumption still returns 409, and new Plans remain gated.

### Resolved WARNING: Repeating unchanged priorities generated another proactive invitation

**File:** `services/crud/research_offers.py:58-89`, `services/crud/research_offers.py:240-243`.

**Issue:** Invitation identity incorporated priority message UUIDs. Repeating the same preferences changed the fingerprint even though the trip's useful context was unchanged, defeating duplicate-invitation suppression.

**Reproduction:** Complete an offer using existing `We want local food and museums.` evidence, then repeat that exact statement with `priority_message_ids=["current"]`. Before correction, the second completion created a different offer ID.

**Fix applied:** Keep UUIDs for authorization/reference checks while fingerprinting sorted normalized priority categories. Equivalent statements retain invitation identity; newly grounded priorities or changed trip essentials can change it.

**Resolution:** `68b98ec`. `test_repeated_equivalent_preferences_do_not_create_new_invitation` asserts one persisted invitation across equivalent wording and repeats.

## Review verification

Reviewer executed on the corrected source:

```text
uv run --locked pytest services/agent/tests/test_research_offers.py services/agent/tests/test_research_offer_integration.py services/crud/tests/test_research_offers.py services/auth/tests/test_crud_client.py -q
78 passed, 1 skipped

npm --prefix frontend test -- ResearchBriefOverlay.test.jsx ResearchDraftOffer.test.jsx useResearchOffer.test.jsx PlanConversation.test.jsx plansApi.test.js
5 files passed; 34 tests passed
```

The reviewer-local PostgreSQL test skipped because this process had no `TEST_DATABASE_URL`. The CRUD owner separately executed the isolated PostgreSQL suite with **49 passed, zero skipped**, recorded in [backend-policy-pytest.txt](../../../artifacts/testing/2026-10-23-research-cleanup/backend-policy-pytest.txt). Dependency deprecation warnings remain. Tests include receipt ownership/revision/expiry/replay, cancelled completion, deferral persistence, history projection, route allowlisting, Plan switching, exact flight-review races, stale-review recovery and overlay drag/click separation.

The readiness language recognizer remains intentionally conservative and English-based; unsupported wording can remain unready. Deterministic tests do not establish live-model invitation quality. Browser screenshots, actual desktop interactions, and any remaining UAT/model limitations are recorded by the parent in [verification.md](../../../artifacts/testing/2026-10-23-research-cleanup/verification.md). The unchanged TripBrief baseline failure and memory-sync profile fixture mismatch are not phase regressions.

No source files or shared planning state were changed by this reviewer. Only this report was written; no commit was made.

---

_Reviewer: gsd-code-reviewer; depth: standard._
