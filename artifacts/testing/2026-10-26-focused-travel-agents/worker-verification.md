# Specialist worker and provider-tool verification

Verified locally on 2026-10-26. This record covers the worker and connector changes,
not the full browser, CRUD persistence, or live-model acceptance gates.

## Executed checks

`uv run --locked pytest -q services/agent/tests/test_specialist_worker.py services/agent/tests/test_specialist_tools.py services/mcps/tests/test_stay_filters.py services/agent/tests/test_travel_research_tools.py services/mcps/tests/test_travel_research.py services/mcps/tests/test_liteapi.py`

Result: **63 passed**. Real Claude SDK tool registration and runtime consume are
exercised with scripted model output and deterministic supplier HTTP responses.
No live model calls or live supplier inventory requests were made by this test run.

`uv run --locked pytest -q services/agent/tests/test_canvas_travel.py services/agent/tests/test_specialist_worker.py services/agent/tests/test_specialist_tools.py`

Result: **210 passed** at the earlier worker revision, before adding three more
focused regression tests (canonical dates, combined call budget, expired offer).
The final focused suite above covers those additions. Existing deprecation
warnings concern LangGraph/asyncio, not test failures.

## Covered behavior

- Separate disposable SDK workers use topic-specific skills, catalogs and host
  invocation allowlists; opposite-topic, shell, arbitrary-web and checkout tools
  are denied.
- Payloads contain the server brief, at most12 own completed messages, bounded
  attributed notes and bounded historical research. Pending current messages are
  supplied once with their attribution ID. Foreign-topic text and access tokens
  do not enter prompts.
- Safe comparison fields are assembled by the host from observed normalized
  options. Invented references fail closed. Ranked comparisons contain at most
  three options. Historical choice IDs cannot be used as provider references.
- Notes accept exact user quotations with known source IDs; old attribution is
  preserved alongside newer corrections, with a real sequence cutoff and an
  explicit incomplete flag. Notes remain advisory.
- Independent refinement permits three rate requests, six inspections, and ten
  total calls within one deadline. Room-rate inspection consumes both the rate
  and inspection budgets. Identical successful calls are cached. The general
  Trip agent retains its one-criteria-per-mode restriction.
- Hotel and flight inspection requires an option observed in the current turn.
  Verified fares update visible evidence; expired offers cannot be selected.
- Catalog IDs are resolved from provider data and checked again before filtering.
  Cache entries are scoped by provider endpoint and credential hash, bounded and
  expiring. Catalog retrieval is explicit, with no hidden provider requests when
  checking search filters. Property-type, facility all/any, and refundable-only
  fields reach the rates request unchanged.
- Canonical shared-brief dates supersede old persisted Canvas dates for search
  validation. A missing saved Canvas still permits preference discussion, with
  inventory tools disabled.

## Documentation consulted

- [Claude SDK custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools)
- [LiteAPI hotel types](https://docs.liteapi.travel/reference/get_data-hoteltypes)
- [LiteAPI facilities](https://docs.liteapi.travel/reference/get_data-facilities)
- [LiteAPI rates](https://docs.liteapi.travel/reference/post_hotels-rates)
- [LiteAPI facility all/any filtering](https://docs.liteapi.travel/docs/rate-request-parameters-guide)

Context7 tooling and the `ctx7` CLI were unavailable, so official web
documentation and the pinned installed SDK source were used. Live catalog
response compatibility and real model recommendation quality remain part of
the full phase's live acceptance work; scripted tests do not prove them.

## Live provider diagnostic follow-up

After the first browser SDK turns reported catalog/search errors, read-only
diagnostics were executed inside the running local containers using their existing
environment credentials (no keys, access tokens or raw provider payloads printed).

- Initial direct adapter calls returned the sanitized `provider_unavailable`
  category. The underlying initial cause was not captured; this alone does not
  establish a DNS problem or provider outage.
- Subsequent direct HTTP catalog calls both returned200. Actual hotel types have
  `id`/`name` fields (52 entries); actual facilities have `facility_id`/`facility`
  fields (820 entries). Both shapes are already supported by the implementation.
- App `TravelClient` → authenticated private MCP → LiteAPI succeeded for
  capabilities and both catalogs. Apartment-name query returned two supported
  types; kitchen-name query returned one facility.
- `SpecialistTravelTools.invoke` through the same real transport then searched
  Lisbon for12–17May2027, one room/two adults, Hungarian nationality, EUR, using
  those actual apartment and kitchen filter IDs: **nine observed stay results**.
- A separate Flights tool instance searched BUD→LIS return12–17May2027, two adults,
  Hungarian pricing country, EUR: **90 observed flight results**.

No model calls, booking actions or Plan mutations were made by this diagnostic.
The successful end-to-end tool calls found no catalog shape/dispatch defect; the
earlier failure was transient, with its precise cause unproven. This verifies live
catalog/transport compatibility, while browser recommendation quality and
traveler choice persistence remain covered by the root phase verification.

## Room/rate consistency regression

Browser acceptance found a real mismatch: the answer recommended a kitchenette
apartment at EUR734.60 while the comparison card selected the property's first
loft rate at EUR663.21. The worker now requires an observed `room_id` for Stays
structured comparisons and rejects ambiguous or foreign room references. Host
projection derives price, room name, meals, cancellation, refundability and
excluded taxes from that exact room/rate. Ephemeral previews use the same rate.
The `get_stay_rates` evidence registry retains the inspected room IDs and terms.

The full focused command above was rerun after this fix: **67 passed**. Added
regressions cover the exact loft/apartment price mismatch, missing and fabricated
room selection, and retention of an inspected room's updated price/terms.
This fix still requires the root's subsequent rebuilt-browser acceptance check.

## Refinement evidence-budget regression

A subsequent live turn exposed the inherited24KiB tool-text ceiling during its
second search. Specialists now have a96KiB per-turn evidence ceiling at every
base/enrichment/lookup gate; general Trip tools retain24KiB. Stay search previews
show at most three rooms and12 facilities per property with explicit omission
counts. Room inspections still show up to six rates, and full normalized evidence
stays in the run-local registry.

The focused command above now reports **68 passed**. The new regression supplies
ten properties with eight detailed rates each, verifies three refined searches
or two searches plus room inspection beyond24KiB, checks the96KiB hard stop, and
asserts the ordinary Trip24KiB limit remains unchanged. No live calls or rebuild
were performed during this correction; root owns subsequent browser acceptance.

## Specialist evidence ceiling

A later live rich refinement exposed the inherited24KiB cap. Specialists now have96KiB, with10property previews,3rooms/12facilities per property and explicit omissions; generalTrip retains24KiB. All gates use the per-instance ceiling. A realistic regression proves3rich refinements or2searches+roominspection and the96KiB hardstop. The focused suite now passes68tests. The rebuilt live room-binding check succeeded; see the root verification report.
