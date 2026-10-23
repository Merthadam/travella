# Research/main integration verification

Integrated origin/main afb065d into the research cleanup branch following explicit user authorization to merge. Latest approved desktop design remains top-right brief circle and bottom composer. Previous design evidence: [sketch](../2026-10-23-research-docking/plan/top-right-docking-sketch.png).

## Conflict resolution

- PlanConversation retains both read-only Research flight previews and canonical research offers/review, with both transient states reset on Plan switch.
- Browser SSE and Agent response projections retain flight_preview, research_offer and committed assistant_message_id together.
- Main's cancellation cleanup, Canvas travel navigation, searchable selectors and Account scrolling are preserved by integration.
- Requirements, roadmap and quick-task history include both phases 16 and 17. The dirty separate main checkout was not changed.

## Executed checks

- Frontend targeted command: `npm --prefix frontend test -- src/PlansApp.test.jsx src/plansApi.test.js src/features/plans/components/PlanConversation.test.jsx src/features/plans/components/ResearchBriefOverlay.test.jsx src/features/plans/components/ResearchDraftOffer.test.jsx src/features/plans/useResearchOffer.test.jsx src/features/plans/travel/ResearchFlights.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/components/CanvasGenerationReview.test.jsx`: 56 passed, 12 fixture-dependent tests skipped in this standalone run. Their actual SSE fixtures are exercised by the backend bridge tests below.
- Backend combined command: `uv run --locked pytest -q services/agent/tests/test_research_offers.py services/agent/tests/test_research_offer_integration.py services/agent/tests/test_research_flights.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_canvas_semantic_travel.py services/agent/tests/test_flight_generation.py services/agent/tests/test_travel_api.py services/auth/tests/test_crud_client.py`: 331 passed, one fixture assertion failed because the new readiness reads were included in the flight stream's request count. Updated the flight test API fixture to mock readiness separately. Re-ran `services/agent/tests/test_research_flights.py`: 18 passed, including all 11 actual SSE-to-React Research flight checks. No production workaround was needed.
- Real PostgreSQL/API command in rebuilt isolated container, TEST_DATABASE_URL pointing to dedicated phase17_merge_verify: `uv run --locked pytest services/crud/tests/test_research_offers.py services/crud/tests/test_migrations.py services/crud/tests/test_flight_confirmation.py services/crud/tests/test_api.py -q`: 49 passed, zero skipped. Covers offer/review/confirmation persistence and ownership, migration upgrade/downgrade, flight confirmation and Plan lifecycle.
- Production build passed, with existing large-chunk advisory. `git diff --check` passed. Existing LangGraph/Lit development/deprecation warnings remain.
- Rebuilt isolated travella-research17 stack; example-account authentication check passed. Running container hashes match PlanConversation, browser API projection, research CSS, Agent response contract and Agent service.
- Chrome DevTools verified authenticated example account, default circle matching the progress anchor, composer at viewport bottom, actual click/open and Escape/close without transcript/composer reflow. Saved [closed](implementation/merged-research-closed.png) and [open](implementation/merged-research-open.png) screenshots were visually inspected.
- Relevant authenticated network reads and the stream returned 200. Console had no errors; only the existing Lit dev-mode warning.

## Browser-check incident and limits

The DevTools fill operation containing a newline submitted the `Layout check only` test line in the retained example Plan. History confirms one test user message and its assistant reply; this was unintended, not a generation/quality evaluation. Input testing stopped, the remaining composer text was cleared, and no history was deleted. The screenshots precede that test message. No draft generation or booking action was requested.

Live agent invitation quality, full generation, native zoom and mobile are not newly certified by this merge. Earlier phase acceptance gaps remain documented. The user explicitly approved merging the implemented desktop work. No infrastructure deployment was performed.
