# Connected travel discussion verification — 2026-10-27

Scope: reply-attached suggestions, exact option context, comparison, explicit chat-to-manual handoff, and shared manual/chat preferred-choice review. User declined alternative prototypes earlier; the approved direction was captured before implementation.

## Evidence

- [Desktop plan](plan/desktop.png), [mobile plan](plan/mobile.png), [rendered outline](plan/layout.html).
- [Desktop flight comparison](implementation/flight-comparison-desktop.png), [mobile comparison](implementation/flight-comparison-mobile.png), [mobile context and unchanged draft](implementation/discussion-context-mobile.png).
- [Exact stay confirmation](implementation/stay-choice-desktop.png), [exact return-flight confirmation](implementation/flight-choice-desktop.png).
- [Running source matches](source-hashes.txt).

All listed screenshots were captured using Chrome DevTools MCP and visually inspected. Fixed a dark-theme contrast issue found in the first context-chip capture; the corrected mobile capture shows readable text. Expanded-card actions now wrap into usable rows. No horizontal overflow at 390×844. The composer, context removal and Browse/Chat controls remained visible and operable.

## Automated checks executed

`uv run --locked pytest -q services/agent/tests/test_travel_registry.py services/agent/tests/test_specialist_worker.py services/agent/tests/test_travel_specialist_journey.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py services/crud/tests/test_topic_conversations.py`: 46 passed at the full-suite run. Subsequently added one CRUD idempotency case (1 passed), and reran the final registry HTTP suite including a new oversized-results case (3 passed). Total distinct coverage: 48 passing tests. Existing SDK/LangGraph/SQLite deprecation warnings only.

`cd frontend && npm test -- --run src/plansApi.test.js src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/travelApi.test.js src/features/plans/travel/CanvasTravelJourney.test.jsx`: 45 passed, 1 conditional actual-SSE fixture test skipped. Request serialization, exact context without composer replacement, explicit comparison, cancellation/late events, shared confirmation, manual filters and import preservation passed.

`cd frontend && npm run build`: passed; existing large-chunk advisory remains. `git diff --check`: passed.

## CRUD/API persistence and boundaries

The topic and specialist journey tests use actual FastAPI handlers, signed fixture identities and an isolated SQLite database. Create/read: completed assistant replies retain signed, host-authored comparison data and exact safe references; later replies do not replace earlier cards. Update: manual exact-room review records the selected apartment rate, not the cheaper room; readiness stays researching until challenge + explicit confirmation. Readback verifies the preferred choice and reply card after confirmation. Earlier reply options remain selectable while fresh; expired acceptance is rejected and leaves preference unchanged. Changed attached room references cannot reuse a run identity. Existing remove-choice, shared lease cancellation, deletion/recovery/purge, invalid input, 401, cross-owner and missing-Plan tests passed. No unrelated user records were altered by tests.

Agent HTTP/runtime and auth gateway tests exercise opaque search references, same-owner/Plan/topic resolution, unknown room and expired-reference rejection, safe normalized projection (no checkout tokens/raw payloads), and transport parity. Oversized observations are explicitly truncated on both manual results and the reference registry so every displayed result can be discussed. No mock-only claim is used for CRUD persistence.

## Authenticated browser journeys

Canonical app: http://localhost:5174. Example account credentials read privately from its supplied local account file. The authorized sign-in retry succeeded. Normal Secrets Manager startup, health, sign-in/session/sign-out checker and checkout/container source hashes passed after rebuilding. Browser used the dedicated verification Plan “Focused travel verification · Lisbon” (12–17 May 2027, two adults, food/culture theme and Belém Tower). Existing verification records were retained for review.

Stays: manually searched Lisbon with Apartments filter, HU nationality, EUR and saved dates. 27 properties returned. Opened Lisbon Colours and attached the exact “Apartment, 1 Bedroom, Without Lift Access, Kitchenette (1 Queen Bed)” room. Existing typed question remained unchanged; selecting/attaching made no agent request. Sent the question explicitly. The live specialist discussed the exact 734.60 EUR room, labeled private-kitchen evidence unconfirmed, and attached that rate to its reply. View all results loaded its exact property-rate search with filters intact. Choosing the same room from manual details opened the shared exact confirmation, with no model request. Confirmed selected/unbooked and reloaded: exact room, price and reply card survived.

Flights: manually resolved BUD/LIS, searched return flights for saved dates/two adults, then selected Nuitée Air and Air France and clicked Compare in chat. The live specialist compared both exact references and returned two compact rows attached to the reply. It successfully rechecked Nuitée Air and explicitly reported the Air France recheck failure; it did not claim a successful verification. View all results imported that search into manual browsing. Manual Choose opened the shared exact return-fare confirmation; confirmed and reloaded, preserving selected/unbooked and the reply comparison.

Mobile: reopened the flight comparison after reload, expanded/attached the exact flight, verified typed draft preservation and context removal, and switched Browse/Chat without horizontal overflow. Desktop and mobile screenshots inspected. Empty manual state, loading, historical/stale cards and provider-inspection failure were observed.

Chrome DevTools console/network: affected search, handoff, topic, stream and choice requests succeeded; no feature console errors. Existing Lit development-mode and Google Maps event API warnings remain. A deliberate container rebuild interrupted the old tab (session 500/canvas 503 during restart); sign-in and Retry loading recovered once startup completed. This was not presented as successful feature execution. No passwords, tokens or provider payloads were saved to evidence.

## Limits

LiteAPI is configured in sandbox; all prices shown are test inventory and choices are not bookings. Two live specialist samples establish this connected journey, not the full Phase18 live-quality matrix. One supplier fare recheck failed and was labeled. The conditional actual-SSE fixture test was skipped in the frontend command; real browser SSE was exercised. Phase18 broader light/native-zoom acceptance and user UAT, and Phase15/17 acceptance, remain unchanged. Search references expire after ten minutes, process restart or bounded-registry eviction; durable summaries remain readable, but a fresh search is required to resume supplier inspection.
