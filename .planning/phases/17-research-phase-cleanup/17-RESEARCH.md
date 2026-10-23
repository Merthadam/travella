# Implementation research

Scope: repository inspection and previously exercised desktop prototype, 2026-10-23. No external dependency changes or paid model calls. No production implementation performed. Inline planning/review fallback; no sub-agents.

## Existing paths and implications

| Observed source | Finding | Plan implication |
|---|---|---|
| frontend/src/PlansApp.jsx:83,327 | showCanvas(generate, revision) passes autoGenerate to existing PlanningCanvas; DEV routes select prototypes | Preserve handoff and canvas; production Research should not import mock harness |
| frontend/src/features/plans/components/PlanConversation.jsx | Chat history, AG-UI text/snapshot handling, A2UI brief, review all compose here; existing review entry has no useful-context readiness gate | Extract small real Research shell and offer component; retain stream lifecycle and brief state |
| frontend/src/features/plans/components/TripBrief.jsx:20 | tripBriefProgress measures six completed fields | Reuse ring count, never treat it as offer eligibility |
| frontend/src/features/plans/components/A2uiTripBrief.jsx | Real renderer owns editable brief surface | Wrap/portal actual renderer, do not replace with duplicate form state |
| frontend/src/features/plans/components/CanvasGenerationReview.jsx; frontend/src/features/plans/flightNeeds.js | Explicit flights and reviewed revision; already-confirmed flights can return without refetch | Fetch/revalidate on review and again at confirmation; preserve existing flight mutation and separate Save plan |
| services/agent/prompts/chat-v1.md | Requires flight clarification before suggesting generation; current structured fields cover answer/state changes/input/evidence | Update the conflicting offer timing rule; add bounded advisory offer proposal, never a generation tool |
| services/agent/claude/sdk_conversation.py | ChatResult extends TurnResult; one SDK call with streaming answer and validated changes | Add optional typed proposal and policy context in the same call; no additional model, tool or framework |
| services/agent/graph/nodes/conversation.py; services/agent/state/contracts.py | Explicit result fields are transferred into graph state | Carry proposal deliberately; unknown or invalid fields must be dropped |
| services/agent/service.py:284,436 | Successful context completion atomically saves via CRUD; browser snapshot/terminal projection explicitly enumerates fields | Commit offer with completed message through CRUD before exposing it; add allowlisted projection after commit only |
| services/crud/research_context.py:100 | Context run completion writes user/assistant messages and receipt in one transaction | Extend transaction to persist offer tied to message/event; cancellation/duplicate completion cannot create orphan/duplicate offers |
| services/crud/models.py:122; services/crud/repository.py:360 | Message history has no typed action metadata | Store offers in a separate Plan-owned table; decorate authorized history from stored offer records, never parse Markdown into actions |
| services/agent/service.py:164 | Canvas requests already compare context_revision | Preserve existing generator boundary and carry reviewed revision exactly; stale research launch fails closed |

## Proposed ownership and state

Add shared services/research_offers.py typed contracts/policy and CRUD ResearchOfferRepository plus additive migration. CRUD owns the current offer, its revision/message association and deferred state. Agent only proposes eligible offers; browser only explicitly requests review/defer. Table is subordinate to Plan lifecycle, subject-scoped via existing ownership, deleted/purged with Plan. Keep private rationale/evidence outside public projection.

Readiness is deterministic required-field/provenance checks plus a grounded advisory signal from the same chat turn. Validate priority references against current Plan's authorized messages/active brief; deleted/inactive context and saved preferences alone cannot establish readiness. Unknown or conflicting evidence keeps research active. No percentage thresholds, turn-count heuristic or final-destination-only offer.

Offer state: unavailable → available (completed committed turn) → deferred OR review → consumed on accepted explicit handoff. Material context change supersedes old available/review offers. Deferral survives reload/restart and is not reset by casual edits. Explicit traveler request may create a fresh eligible offer. A manual brief review entry remains usable whenever current eligibility passes, without forcing another model turn.

Use a server-owned eligibility fingerprint of normalized readiness context and evidence references, plus research revision. Fingerprint prevents repeated offers for unchanged useful context; revision prevents stale confirmation. Keep these distinct: changing an irrelevant field can stale a reviewed snapshot without creating a new proactive invitation.

## Risks resolved in planning

- No new model tool that generates a canvas; typed offer activates only review.
- Interrupted/partial answer may mention a future draft, but never gains an actionable card until successful commit.
- Legacy messages without offer metadata remain plain messages. Existing open/saved canvases retain current navigation and dirty-state behavior.
- Initial research offer policy must not gate existing canvas regenerate/group retry paths; only the research launch carries the new policy.
- Plan 02 establishes durable lifecycle; Plan 03 attaches agent-generated offer and transcript card end-to-end.
- Additive table migration is costly but reversible before rollout; do not rewrite/drop existing records.

## Validation Architecture

Existing Vitest/Testing Library, pytest/FastAPI, PostgreSQL tests and Chrome DevTools are sufficient. Add targeted lifecycle/policy/stream/overlay tests in owning plans; no tests during planning. Exercise ownership, revision, duplicate event, reload, deferred, cancellation, direct manual entry, and legacy compatibility. Required real example-account Chrome and affected CRUD HTTP checks cannot be replaced by mocks. Existing Phase 15/UAT and unrelated suite failures remain separately reported.

## Artifacts this phase produces

ResearchProgress and ResearchBriefOverlay React components; ResearchDraftOffer transcript component and useResearchOffer hook; shared ResearchReadiness/ResearchOffer contracts and assess_research_readiness; ResearchDraftOffer model/repository with additive migration; allowlisted research_offer transport field; optional ChatResult.draft_offer proposal; tests and verified evidence. Exact migration number must use the next unused repository revision at execution.
