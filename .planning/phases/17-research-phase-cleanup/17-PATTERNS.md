# Pattern map

| New responsibility | Closest tracked analog | Reuse |
|---|---|---|
| ResearchBriefOverlay | prototypes/StateBarPrototype.jsx FoldableBrief; components/A2uiTripBrief.jsx | Visual behavior only from prototype; actual renderer/locks/error state from A2UI |
| ResearchProgress | components/CanvasGenerationReview.jsx PlanStages | Accessible stage nav, scoped to Research; avoid altering canvas styles |
| ResearchDraftOffer | components/PlanConversation.jsx message rendering | Typed action following committed assistant message, not Markdown HTML |
| useResearchOffer | features/plans/useTripContext.js | Abort/Plan identity/revision coordination and authenticated API |
| offer contracts | services/trip_context.py | Strict Pydantic allowlists and bounded payloads |
| offer transaction | services/crud/research_context.py | Locked Plan, lease, revisions, receipts, atomic context completion |
| offer projection | services/agent/service.py | Explicit snapshot/terminal allowlist and obsolete-run suppression |
| offer eval | services/agent/evals/test_research_eval.py | Deterministic cases; separately label live model evaluation |

All frontend paths above are under frontend/src/features/plans unless stated otherwise. Verify current code at execution; prototype is reference, not production dependency.
