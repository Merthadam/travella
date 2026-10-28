# 18-10 exact comparison, manual choice and compact chat

Source through `78d4d6d`; authenticated browser verification pending parent rebuild. No credentials or raw provider responses recorded.

| Executed check | Outcome |
| --- | --- |
| `npm --prefix frontend test -- --run src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/travelApi.test.js` | 81 tests pass across four files. |
| Final Workspace test rerun after progress status copy | 40 pass. |
| `npm --prefix frontend test -- --run src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx` | 16 pass; one fixture-dependent bridge skipped in standalone invocation, exercised below. |
| `uv run --locked pytest -q services/agent/tests/test_travel_specialist_journey.py services/crud/tests/test_topic_conversations.py` | 25 pass, actual FastAPI/SQLite lifecycle and boundary checks. |
| `uv run --locked pytest -q services/agent/tests/test_canvas_travel.py -k actual_sse_to_react` | Eight pass;189 intentionally deselected. Real Python SSE supplies the conditional React fixture. |
| `uv run --locked pytest -q services/agent/tests/test_research_flights.py` | 18 pass, including real Research SSE fixture→11 conditional React cases. Standalone ResearchFlights had11 fixture-gated skips before this run. |
| `git diff --check` | Pass. |
| Three `gsd-tools.cjs check tdd-red-evidence` records | RED_EVIDENCE_OK before each GREEN. |

## Observed automated behavior

- Checkbox order2→0→1 produces the same ordered exact comparison and structured references. A fourth is disabled; discussion failure preserves facts with retry. A later search retains the original comparison as historical. Differing routes and actual currencies trigger incompatible-total language.
- EUR950 exact room remains distinct from EUR100 property fixture price. Property comparison has no implied selected room. Room occupancy and excluded taxes come from that exact offer.
- History unavailable does not prevent manual exact fare review, prepare or confirmation. No chat.send is involved. Save receipt shows Ready and permits removal at the receipt revision even if history refresh throws. No commit occurs before confirmation.
- Actual shared flight lease rejects stay challenge with409 and DB still has no preferred choice. Cancel plus fresh GET permits confirmation. Exact-room review does not invoke the model; after save, a reopened database session retains the actual room id and EUR950. Remove returns researching and GETpreferred is null.
- Historical exact-room link makes one authorized registry GET, shows only that room, preserves current results and draft, and issues no supplier search. Missing registry observation reports expiry/unavailability and asks for explicit new research.
- Delayed review/challenge cannot open a confirmation after inactive→active topic switching. Composer can accept a new draft while a reply runs and retains it on completion. Ordinary hidden send remains blocked; explicit ordered comparison is allowed.

## Pending required runtime gate

Parent owns build session13160 and the example-account Chrome run. Check main comparison with chat closed and a draft, failed discussion retry, room/fare confirmation and reload/removal, old-reference inspection without supplier request, active Stop/lease behavior, new text typed during a real reply, narrow layout and console/network. Save and inspect implementation screenshots under the existing `implementation/` directory. This record does not claim those checks passed.
