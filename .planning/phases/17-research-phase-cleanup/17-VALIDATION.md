---
phase: 17
slug: research-phase-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-23
---
# Validation strategy

Planning contract only. Production checks below have NOT been run. Existing selected prototype evidence is under artifacts/testing/2026-10-23-floating-brief/. New inline-offer layout sketch evidence is under artifacts/testing/2026-10-23-research-cleanup/plan/.

## Test infrastructure and sampling

Existing Vitest/Testing Library and pytest/FastAPI/PostgreSQL. No new runner. Run each owning plan's focused commands after its changed behavior is implemented, then targeted combined suites plus frontend build at final verification. Do not repeatedly rerun unrelated broad suites without a reason. New test files are created alongside their implementation (not claimed to exist at planning). Check path/collection before claiming pass. Baseline unrelated failures are recorded separately.

| Task | Requirements | Planned verification | Status |
|---|---|---|---|
| 17-01-01/02 | RC-17-01/02/03 | ResearchBriefOverlay + PlanConversation Vitest; actual Chrome real brief edit, drag, keyboard and rectangle invariance | Pending |
| 17-02-01/02 | RC-17-04/06/08 | test_research_offers FastAPI with PostgreSQL/restart and useResearchOffer Vitest; live defer/readback | Pending |
| 17-03-01/02 | RC-17-04/05/06/08 | Agent offer fixtures, completed/aborted stream, history/duplicate tests; ResearchDraftOffer + PlanConversation Vitest | Pending |
| 17-04-01/02 | RC-17-07/08/09 | Stale flight fast path, revision conflicts, receipt replay/idempotent run, existing flight generation; review/PlansApp Vitest | Pending |
| 17-05-01/02 | all | Authenticated real Chrome, API persistence matrix, inspected screenshots, build, scope diff | Pending |

## Tests to create in owning waves

- Wave 1: frontend/src/features/plans/components/ResearchBriefOverlay.test.jsx.
- Wave 2: services/crud/tests/test_research_offers.py and frontend/src/features/plans/useResearchOffer.test.jsx.
- Wave 3: services/agent/tests/test_research_offers.py and frontend/src/features/plans/components/ResearchDraftOffer.test.jsx.
- Wave 4 extends these plus existing CanvasGenerationReview, PlanConversation, PlansApp and flight-generation coverage.

## Required desktop journey

1440×1000 and 1280×800; light/dark, 200% zoom, pointer and keyboard. Example user credentials via private config only. Inspect closed/open/moved/scrolling brief, live edit/readback, locked/saving/error, early/candidate/destination-only/ready/deferred/reloaded/superseded offers, review cancel/fresh-confirm/stale-confirm, flight Yes/No, loading/error/retry, existing canvas open/return. Assert message/composer rectangles invariant on overlay operations and no hidden focused element. Capture corresponding screenshots and console/network results under artifacts/testing/<execution-date>-research-cleanup/. The final stage requires user desktop UAT, not mobile redesign.

## CRUD and security matrix

T-17-01: wrong owner and wrong Plan offer/receipt return denied/not-found with no data/write.
T-17-02: missing/stale revision, stale context between review/confirm, double click, receipt replay and accepted-request retry cannot create an extra run; save remains explicit.
T-17-03: malformed model/HTTP metadata, raw HTML, arbitrary URLs/labels, source prompt injection cannot render or invoke an action; no private reasoning or credentials in events/logs.
T-17-04: stopped/failed/duplicate/late turn completion cannot leave actionable orphan offers; atomic context/message/offer transaction and receipts proven with API tests.
Read endpoints never mutate. request_review, defer, confirm and internal successful-turn completion each need real handler status/payload/readback/restart evidence. Deferred state survives reload and unrelated edits; explicit current-user request can re-enable when eligible. Deleted Plan inaccessible; recovery/purge follows parent lifecycle. Delete only test records created by this run.

## Evidence limits

No production tests/model calls were run during planning. Prototype interaction checks are not proof of production offer timing, persistence or agent quality. Live-model eval remains separately reported/authorized. Phase 15 existing acceptance gaps are not waived. Mobile intentionally deferred. Validation remains draft until actual execution evidence exists.
