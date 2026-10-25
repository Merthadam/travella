# Phase 18 implementation research

Inspected 2026-10-25 at `d0e3bbe`; recommendations below are proposed implementation, not shipped behavior.

## Existing seams

| Source | Finding and consequence |
| --- | --- |
| `frontend/src/features/plans/components/PlanningCanvas.jsx` | Dedicated travel screens already exist; they mount TravelSearch and hide CanvasConversation. Compose specialist chats here rather than adding another top-level application. |
| `frontend/src/features/plans/useCanvasConversation.js` | Reads Plan-wide history and holds four ephemeral travel snapshots. Extract/reuse cancellation and stale-event handling; topic must be included in every client cache identity. |
| `services/crud/models.py` | One Conversation per Plan; messages are unique by conversation/event. Retain the parent Conversation and add a topic discriminator to messages plus topic state. Avoid replacing the one-to-one Plan contract. |
| `services/crud/repository.py` | History, agent context and full generation context currently read the same messages. All three must explicitly default/filter to Trip so specialists cannot contaminate generation. |
| `services/crud/research_context.py` | Begin/complete/cancel uses a durable Plan lease and atomic completed-turn writes. Extend that path for topic-bound conversation commits without applying specialist output as shared requirement edits. |
| `services/agent/service.py`, `state/run_store.py` | Plan-level run generation/replay and active streams exist. Retain serialization but bind each event/receipt to its topic and input digest. A duplicate event with another topic must be rejected. |
| `services/agent/graph/builder.py`, `claude/runtime.py` | One graph routes to bounded workers; SDK sessions use temporary directories and no-session-persistence. Add a specialist worker route; keep provider results outside checkpoint channels. |
| `services/agent/claude/canvas_travel_tools.py` | Nine existing tools, date provenance and bounded evidence. Add a topic allowlist enforced both at SDK registration and host invocation. The existing first-three provider ordering must not prevent an evidence-grounded specialist ranking. |
| `services/crud/canvas.py` | Travel cards currently contain need/status and optional mock booking, not a real preferred research option. Introduce a distinct research choice model rather than reusing mockBooking. |
| `services/mcps/travel_research.py` | Flight references expire within ten minutes and are process-local. Persist only safe historical comparison summaries; returning users must re-search/reverify live offers. |

## Architecture decisions

Preserve the one parent Conversation and add `topic` to messages with a default/backfill of `trip`. Keep globally unique event identity per parent; reject payload/topic mismatch on replay. Add a topic-state row keyed by Plan/topic for bounded attributed discussion notes, and a separate safe research-choice collection. Foreign keys cascade on hard purge; access follows active Plan ownership. Keep Plan-wide serialization until simultaneous specialist runs are a separate demonstrated need.

The shared brief is a deterministic projection from CRUD: confirmed requirements, saved Canvas themes, selected map pins and accepted research choices. Generated theme suggestions retain their provenance; they are context, not hard requirements. Each snapshot carries Plan revision, ResearchContext revision and a digest of relevant saved Canvas/choice fields. Conversation append does not invalidate inventory by itself. Commit checks the source versions; applicability checks use relevant-field digests so a title edit need not discard a valid quote. Unsaved browser state cannot override this brief.

Bound the brief to 8 KiB serialized UTF-8, up to ten relevant selected places, three accepted choice summaries and explicit counts/coverage. Prioritize traveler-focused places, then scheduled places and stable Plan order. Never drop dates/party/destination to fit; fail with a context-size error if essentials exceed the bound. Topic input gets at most twelve recent complete messages plus bounded attributed notes. Wider history is paginated for review, not blindly added to every model turn.

Use separate prompt/tool configurations, not a model deciding which user-facing agent to delegate to. Stays gets capabilities, destination lookup, stay search/details/reviews/rates and bounded accommodation filter lookup. Flights gets capabilities, airport lookup, flight search/verify. Neither gets place mutations, web/terminal access, checkout, arbitrary MCP dispatch or the other specialist's tools. Shared accepted data enters through the brief.

## SDK and supplier documentation

Official SDK docs describe specific-session resume and session persistence. Our recommendation is to retain application-owned history with the existing disposable runner, reducing cross-host transcript and authorization complexity. Custom tools are registered through an in-process MCP server and explicitly allowed. Validate options against the pinned SDK before changing runtime configuration. [Sessions](https://code.claude.com/docs/en/agent-sdk/sessions), [custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools).

LiteAPI rates support hotel-type IDs, facility IDs with all/any behavior, and refundable-only rates. Extend only those filters needed for apartment/hotel, amenities and cancellation matching. Resolve IDs from the supplier catalogs; never invent numerical IDs or equate a hotel facility with a specific room amenity. Property-type filtering narrows available inventory, not an exhaustive apartment marketplace. [Rates](https://docs.liteapi.travel/reference/post_hotels-rates), [hotel types](https://docs.liteapi.travel/reference/get_data-hoteltypes), [facilities](https://docs.liteapi.travel/reference/get_data-facilities).

For specialist turns, permit up to three bounded rate searches within ten total provider calls, preserving the general Trip agent's existing one-search-per-mode policy. Refine within the traveler's stated constraints; ask before relaxing a hard requirement. The specialist can inspect a bounded shortlist and explain tradeoffs. Proximity from coordinates is straight-line distance only; walking/airport-transfer minutes require a routing source, which is outside this phase. Missing kitchen, change fee, baggage or cancellation evidence remains unknown.

## Scope of API coverage

This is a focused extension of an existing integration. The current curated tools and the small filter/catalog addition cover the agreed journeys. Flexible-date matrix, room Q&A, native SDK resume/fork, generated full-provider MCP catalogs, loyalty/admin and reservation/payment operations remain outside this phase. This follows the previously agreed research-first boundary, not an assertion that all LiteAPI capabilities are supported.

## Validation Architecture

Use the existing FastAPI TestClient plus real isolated SQLite/PostgreSQL stores for topic writes, decisions, lifecycle and migrations. Use scripted SDK and provider fixtures for scope/grounding/invalidation tests, then authenticated Chrome DevTools desktop/mobile checks with the example account. Add adversarial evaluation cases for cross-topic history, injected reviews, missing apartment facts and changed flight prices. Source docs and code were inspected; no provider/model requests or implementation tests ran during this planning turn. See 18-VALIDATION.md.
