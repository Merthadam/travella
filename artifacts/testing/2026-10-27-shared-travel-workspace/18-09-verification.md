# Plan18-09 verification

Implemented observed marketing/operating code/logo projection and fixed-size airline marks. Origin policy accepts only the supplier origin `https://assets.nuitee.flights` observed in the parent's bounded actual sample; relative, credential-bearing, query/fragment, non-HTTPS, unexpected-port and other-origin URLs fall back without requests. See [actual supplier evaluation](agent-evaluation.md). Official reference re-opened: https://docs.liteapi.travel/reference/post_flights-rates. No additional logo supplier or airline-directory call was added.

## Executed automated checks

- Backend RED: `uv run --locked pytest -q services/mcps/tests/test_liteapi.py services/agent/tests/test_travel_registry.py` —10 missing-field assertion failures,26 passed before implementation. [Normalized RED evidence](18-09-backend-red.json).
- Backend GREEN: `uv run --locked pytest -q services/mcps/tests/test_liteapi.py services/mcps/tests/test_travel_research.py services/agent/tests/test_travel_registry.py` —53 passed. Includes normalization, public/safe/registry roundtrip, mixed identity, unsafe image rejection, observation age preservation and authenticated registry HTTP checks.
- UI RED: `npm --prefix frontend test -- --run src/features/plans/travel/CarrierMark.test.jsx src/features/plans/travel/TravelSearch.test.jsx` —6 expected failures,24 passed. Initial loader failure corrected before final RED. [Normalized RED evidence](18-09-red.json).
- UI GREEN exact plan command: `npm --prefix frontend test -- --run src/features/plans/travel/CarrierMark.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx` —36 passed,1 pre-existing optional Python fixture test skipped in standalone execution.
- Expanded backend check including `test_canvas_travel.py` and `test_travel_specialist_journey.py` —251 passed,7 Canvas manual-continuation fixture failures. The old mock omitted the new authenticated registry resolution request and emitted inconsistent strict mode/count/preview data. Updated the mock to mirror that seam; preserved Manual B assertions and no durable mutation assertions.
- Reran all affected actual SSE journeys: `uv run --locked pytest -q services/agent/tests/test_canvas_travel.py -k 'journey_actual_sse or journey_two_turn or mixed_journey' --tb=short` —8 passed. These execute the formerly optional Canvas React test with actual Python-generated SSE; no affected test remains skipped in this run.
- `uv run --locked pytest -q services/agent/tests/test_research_flights.py` —18 passed, including actual HTTP→graph→SSE→React research preview and neutral named airline fallback. The separately invoked ResearchFlights file skips11 fixture-dependent cases; this Python suite supplies that fixture and executes them.
- `git diff --check` passed. Existing LangGraph/Python deprecation warnings remain.

## Observable card behavior

Valid observed logos retain accessible carrier text; missing, unsafe and load-failed images render a neutral airplane within the same32px box. Marketing carriers from both legs remain visible; operating-carrier names/codes remain in details. Source LiteAPI is separately labeled. Return totals include explicit currency and party; cards show local airport times, stops, duration, baggage/cancellation unknowns, observation time and expiry. Stay totals include room/night/party scope and separate property amenities from unknown room amenities. Unobserved property type, distance and exact supplier link are not invented. Applied stay chips use the loaded real catalog names, including Apartments, and retain those names when the filter section closes.

Manual registry insertion retains provider search time and anchors expiry to it. Room detail refresh identifies its own observation without relabeling the main search as new.

## Pending delivery gate

Parent orchestrator owns rebuild, authenticated Chrome DevTools exercise, real image network/load verification, desktop/mobile screenshots and console/network review in plan18-12. These were not executed by this agent. WINDOWS entry7 tracks this pending gate. Automated tests and the prior live supplier sample do not close browser acceptance.

No changed CRUD persistence operations, database schema, booking policy, durable Plan mutation, secret or new provider endpoint. No push/deployment.
