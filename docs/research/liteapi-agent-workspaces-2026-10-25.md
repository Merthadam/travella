# LiteAPI tools for focused stays and flights discussions

Researched 2026-10-25 against current official LiteAPI/Nuitee Connect documentation. This is capability research and a recommendation, not an implemented feature or an approved change to Travella's planning-only booking boundary. No authenticated provider calls, credentials, reservations, or payments were used. Account enablement remains unverified today; the historical account probes in [the October 8 report](liteapi-capabilities-2026-10-08.md) are not current production evidence.

## Recommendation

Give each discussion a small set of research tools, the confirmed trip context, and the identities of the options the traveler is currently examining. The highest-value improvement is enabling questions *after* search: compare rooms, investigate review concerns, explain fare restrictions, and refresh a selected price. Separate conversation histories do not require separate provider integrations. All provider calls should remain behind the private Connector; durable selections and shared trip changes remain explicit traveler-confirmed CRUD actions.

## Documented accommodation capabilities

| Capability | What it enables in conversation | Important limits |
| --- | --- | --- |
| Hotel rates and availability | Search using dates, occupancy, location or natural language; compare room/meal/cancellation choices, facilities and accessibility filters. | `aiSearch` must contain the location and cannot coexist with other location selectors. `maxRatesPerHotel=1` hides alternatives; fetch richer rates for shortlisted hotels. Account-enabled `sessionId` price consistency is optional, not a universal guarantee. [Rates](https://docs.liteapi.travel/reference/post_hotels-rates) |
| Hotel details | Answer property questions from descriptions, amenities, images, coordinates and metadata. | Static property facts do not establish availability of a particular room or dated rate. [Details](https://docs.liteapi.travel/reference/get_data-hotel) |
| Reviews and sentiment | Explain recurring positives/negatives and investigate issues like noise or cleanliness. | `getSentiment=true` analyzes the last 1,000 reviews; label this as an AI summary of guest reports. Translation limits the returned reviews to ten. [Reviews API](https://docs.liteapi.travel/reference/get_data-reviews), [sentiment guide](https://docs.liteapi.travel/docs/hotel-reviews) |
| Place search and details | Resolve a named area, attraction or airport before searching nearby hotels. | Returns identifiers, addresses, coordinates and viewport information; it is not a walking/transit travel-time service. [Place search](https://docs.liteapi.travel/reference/get_data-places), [place details](https://docs.liteapi.travel/reference/get_data-places-placeid) |
| Semantic hotel discovery, beta | Explore preferences such as boutique atmosphere or a family beach stay before dates are settled. | Returns matches, relevance and descriptive attributes, not live prices. Date-specific rates are still required. [Semantic search](https://docs.liteapi.travel/reference/get_data-hotels-semantic-search) |
| Hotel Q&A, beta | Ask a hotel-specific question using LiteAPI's own AI layer. | `GET /data/hotel/ask` uses `hotelId` and `query`; `allowWebSearch` defaults false. Answers are generated, so prefer structured property evidence when available. [Q&A](https://docs.liteapi.travel/reference/get_data-hotel-ask) |

For example, “Which of these is quieter and still close to our saved places?” should combine hotel details and review evidence with the trip's saved places. Proximity can be derived from coordinates and labeled accurately; walking minutes need a separate routing source. “Is breakfast and cancellation worth the extra cost?” needs room-level rates and actual cancellation deadlines, not only a property score.

Lower priority: minimum-rates lookup is useful for lightweight listings, but cannot replace full room comparison. City/hotel price indexes can inform flexible-date budget exploration; the city endpoint describes historical observations aggregated by future check-in day, not a live availability quote. [Minimum rates](https://docs.liteapi.travel/reference/post_hotels-min-rates), [city price index](https://docs.liteapi.travel/reference/getpriceindexcity).

## Documented flight capabilities

| Capability | What it enables in conversation | Important limits |
| --- | --- | --- |
| Airport discovery | Resolve cities/airport names and validate IATA selections. | Present alternatives for traveler choice. [Airports](https://docs.liteapi.travel/reference/get_data-flights-airports) |
| Flight search | Compare schedules, layovers, duration, cabin, stops, refundability, prices and baggage hints; stream results progressively. | Uses itinerary `legs`; Travella should constrain these to a return trip despite wider provider support. Dates are limited to eleven months ahead. [Search](https://docs.liteapi.travel/reference/post_flights-rates) |
| Verify selected offer | Refresh price/availability, baggage and fare terms; expose changed price, cabin or fare conditions. | An expiring snapshot, not a reservation or a lasting price promise. Expired offers need re-search. [Verify](https://docs.liteapi.travel/reference/post_flights-verify) |
| Flexible-date matrix | Compare nearby departure/return date combinations, then investigate the best candidates. | Separate account enablement; ±1–3 days; matrix summaries require normal search for complete offers. [Matrix](https://docs.liteapi.travel/reference/searchflightsmatrix) |

Fare explanations can use search/verify data; the reviewed reference does not require a separate fare-rules endpoint. The flight schema distinguishes mixed cabins/fare families and may indicate a fee applies while omitting its amount. Missing fee values must remain unknown. Segment-level amenities and baggage should not be generalized across every leg. [Flights OpenAPI](https://docs.liteapi.travel/openapi/openapiflights.json).

The strongest conversational examples are “Is saving this amount worth the longer layover?”, “Will this arrival lose our first day?”, and “What changes if we leave a day earlier?” Nearby-date research must not silently change confirmed trip dates. Hotel-night impacts are a proposal to discuss with the traveler.

## A deliberately small initial toolset

These are proposed domain tools, not claims about current exported tool names.

| Priority | Tool surface | Purpose |
| --- | --- | --- |
| First | `search_stays` | Existing search concept, expanded to validated preference filters and richer shortlisted room rates. |
| First | `get_stay_details` | Ground questions about a displayed property in its actual content. |
| First | `get_stay_reviews` | Retrieve bounded guest evidence and optional sentiment for comparison. |
| First | `search_airports` + `search_flights` | Retain discovery and search; expose useful itinerary/fare comparisons. |
| First | `verify_flight_offer` | Refresh the option under discussion and clearly report changes. |
| Next | `resolve_stay_area` | Translate a selected area/landmark into reliable spatial constraints. |
| Next, if enabled | `compare_flexible_flight_dates` | Answer date-flexibility questions with provider evidence. |
| Optional experiment | `ask_stay_question` / semantic discovery | Useful fallback or exploratory matching, after structured details and live rates work well. |

Comparison itself is chiefly orchestration over normalized evidence, not another provider endpoint. Each result should carry source, observation time, environment, missing fields and option identifiers so conversation and displayed results refer to the same things. Provide only tools supported by account capabilities; independent read requests can be bounded and batched, with a finite research budget.

## Booking side effects and handoff

Hotel prebook creates a checkout session and validates final pricing; payment configuration can also be involved. It should not be exposed as an unrestricted research tool. [Hotel prebook](https://docs.liteapi.travel/reference/post_rates-prebook).

**Flight prebook is a materially stronger action:** it reserves with the provider and can create a payment intent. It also returns attachable seats/baggage. Therefore, discovering those precise extras by creating a prebook crosses the research boundary. Abandoned holds may have commercial consequences. General baggage discussion can use search/verify; precise purchasable seat/bag selection belongs in the later supplier checkout unless product scope deliberately changes. [Flight prebook](https://docs.liteapi.travel/reference/post_flights-prebooks), [flight flow](https://docs.liteapi.travel/docs/build-a-flight-booking-experience).

For hotels, the hosted white-label guide documents `/booking?offerId=...`, with the supplier performing prebook and loading the selected room/rate. It also contains an inconsistent warning under `xData` requiring a preceding hotel-details session. Verify actual behavior against the provisioned host before promising exact-offer continuity. Avoid its guest/email URL examples under Travella's privacy contract. An equivalent exact-offer flight handoff contract was not established by this review. [Deep links](https://docs.liteapi.travel/docs/deeplinking-to-whitelabel).

## Access and unresolved questions

Flights production and white-label access require explicit approval. Sandbox uses limited, non-production inventory and cannot validate real prices; the guide recommends the E2E/Nuitee Air test provider. The same key mechanism does not prove every capability is enabled. [Flights access](https://docs.liteapi.travel/docs/getting-access-to-flights).

Before implementation, establish current account capabilities, matrix access, usable review/Q&A coverage, the verified checkout host and exact-offer compatibility. Confirm research-heavy usage economics: published core usage depends on look-to-book terms, and flights publish an excess-search surcharge. Price-index costs conflict between the city reference ($0.02/request) and general pricing ($0.05/request), so do not budget from one page alone. [Usage pricing](https://docs.liteapi.travel/reference/api-pricing-usage-costs), [city index](https://docs.liteapi.travel/reference/getpriceindexcity).

The proposed specialists stop at research and explicitly saving an option before supplier handoff, consistent with the existing MVP. In-product checkout would be a separate scope decision, not a consequence of selecting an agent SDK.

## Claude SDK and current implementation

Current code reviewed at `4e0780a`:

- [Canvas travel tools](../../services/agent/claude/canvas_travel_tools.py) already use Claude Agent SDK custom MCP tools: capabilities, destination lookup, airport lookup, stay search and return-flight search. The agent currently permits only one distinct rate search per mode per turn.
- [LiteAPI adapter](../../services/mcps/liteapi.py) already provides hotel detail to the application, but that operation is absent from the agent's toolset. Stay search requests up to 30 properties and four rates per property, or twenty rates for a chosen hotel. Flight requests do not send provider `filters` or `sort`; normalization retains selected baggage/cancellation summaries rather than the full comparison evidence.
- [Runtime](../../services/agent/claude/runtime.py) creates a disposable SDK filesystem per turn and passes `no-session-persistence`. [Conversation](../../services/agent/claude/sdk_conversation.py) and [Canvas editor](../../services/agent/claude/canvas_editor.py) explicitly construct context from application history and current facts. An SDK invocation is not currently a durable specialist chat.
- The project pins `claude-agent-sdk==0.2.163` in [pyproject.toml](../../pyproject.toml). Current documentation may describe newer options; verify compatibility before implementation.

**Proposal:** introduce three application conversation scopes—Trip, Flights and Stays—within the existing [Plan-scoped LangGraph](../../services/agent/graph/builder.py) and Agent service. Each specialist gets its own instructions, bounded history and tool allow-list, plus the latest confirmed Plan revision, relevant traveler preferences, and validated identifiers for currently displayed/selected options. Reuse the SDK runner and private Connector. This does not require three deployed agent services or three continuously running subprocesses.

Retain application-owned conversation history initially, consistent with the existing disposable runtime. Native SDK sessions are an optional implementation choice: the SDK supports specific-session resume and custom tools. If adopted, scope session ownership to authenticated traveler + Plan + topic, persist transcripts securely across hosts, and reconcile current Plan state on every turn. A session ID alone is not durable storage or authorization. [SDK sessions](https://code.claude.com/docs/en/agent-sdk/sessions), [custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools).

SDK subagents support delegated specialist tasks with separate context. They could help bounded comparisons later; the user-facing Flights/Stays conversations should have explicit application identities and lifecycles, rather than depend on an agent deciding to delegate. [SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents).

Share confirmed facts and explicitly accepted decisions across topics. Keep exploratory dates/preferences scoped until confirmed; refresh stale results and reject obsolete runs after shared changes. Saving shortlists or selections uses explicit traveler actions through CRUD. SDK transcripts never become authoritative Plan state or raw browser projections.

LiteAPI also publishes an [OpenAPI-generated MCP server](https://github.com/liteapi-travel/mcp-server). Continue exposing a curated set through Travella's private Connector to retain authorization, normalized results and transaction boundaries; broad generated booking/admin tools are unnecessary for these discussions.

## Verification scope

Official documentation and local source were inspected. No implementation, live model call, authenticated provider probe, UI prototype or browser acceptance test was performed. Earlier Chrome DevTools access failed because its browser profile was already in use; this documentation task does not resolve or claim to pass that UI gate. User selected discussion before prototypes. The recommendations above remain proposals.
