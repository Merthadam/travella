# US-005 — Search and compare travel options

## User story

As a traveler with a destination in my Plan, I can search for stays, return flights, and car rentals through conversational, validated A2UI-style components, refine the results, and compare a small curated set of options, so I can confidently choose an option to add to my Plan.

## Success outcome

Travella turns a traveler's request into a provider-backed search without treating a result as a saved Plan decision. The traveler can inspect compact option cards, adjust search criteria, compare options, and ask to see more. Choosing an exact-date option proceeds to the explicit add-to-Plan confirmation defined by [US-003](../option-selection-and-canvas/README.md); supplier booking and redirect remain outside this story.

## Confirmed interaction model

- The story covers provider-backed stay/apartment, return-flight, and car-rental searches after the traveler has chosen the Plan destination/city.
- The agent can use validated A2UI-style search controls, filters, result cards, detail panels, and comparisons. The final component schema and catalog remain open.
- A traveler may give flexible timing. The agent may propose and use a sensible provisional date range for exploratory research, but labels the assumption clearly and prompts the traveler to provide exact dates.
- Provisional-date results may be browsed and compared, but cannot become a Selected Option. Exact dates are required before the traveler can add a stay, flight, or car rental to the Plan.
- Travella presents one canonical option card. In the MVP, that card comes from the connected functional provider for that search mode; Travella does not aggregate comparable offers from several suppliers.
- A flight search requires a traveler-confirmed departure airport or city for the current Plan. Travella may suggest nearby airports, but never infers the departure location from device location or a profile.
- The MVP supports return flights only. One-way and multi-city searches are out of scope.
- Car rentals return to the same pick-up location in the MVP. One-way rentals are out of scope.
- Party size is captured separately as adults, children, and infants. A child's age is requested only when the connected provider requires it.
- Broad trip constraints entered during search, such as dates, party size, and overall budget, update the traveler's editable planning brief. Narrow filters, sort order, and other current-search refinements remain temporary to that search.
- Travella initially shows a curated set of roughly three to five result cards. The traveler can use **Show more** to request additional provider results.
- Travella initially ranks cards by best fit for the traveler's active planning brief and explains the material trade-off. The traveler can switch to an objective, mode-appropriate sort.
- Changing search criteria or filters does not silently replace the current set. The traveler uses an explicit **Refresh results** action. While it runs, the prior set remains visible with an **Updating** state and is replaced only by a complete result set.
- Each result card leads with the provider's total price for the current dates and party. Where the provider cannot supply all mandatory charges, Travella labels the amount as an **estimated total** and clearly disclaims the missing or unknown charges. Per-night or per-day cost is secondary context.
- Cards disclose their mode's decision-critical details: stay rating, location, and cancellation; flight times, duration, stops, and baggage; or car class, seats, transmission, mileage, and cancellation. Every card and comparison identifies the connected provider.
- Opening a result card shows fuller provider-backed details in a validated component within the Conversation or its relevant generated planning surface. The traveler may add it to a comparison or begin the separate add-to-Plan confirmation; it does not redirect to a supplier or save the option.
- A traveler can select up to three result cards for a side-by-side A2UI comparison. Comparison is transient: it neither selects nor saves an option.
- Before showing the add-to-Plan confirmation for an exact-date option, Travella rechecks its provider for current price and availability. An unavailable option cannot be added. Changed price or other material terms are shown and require the traveler to make a fresh choice before proceeding.
- A temporary provider failure or timeout keeps any last completed results visible, explains that current results could not be refreshed, and offers **Retry**. Travella does not invent fallback availability or prices. A backup provider is out of MVP scope.
- After refresh or reconnect, Travella restores the last compact completed result set and makes clear that the traveler can refresh it. It may discard incomplete searches and transient comparison selections.

## Initial search inputs

| Search mode | Required for an exact, selectable result | Provisional research allowance |
| --- | --- | --- |
| Stay/apartment | Plan destination, check-in and check-out dates, party details, and rooms when required | A proposed date range may support clearly labelled exploratory results. |
| Return flight | Traveler-confirmed departure airport/city, Plan destination airport/city, outbound and return dates, party details, and cabin when required | A proposed outbound/return range may support clearly labelled exploratory results. |
| Car rental | Pick-up location, pick-up and drop-off dates and times, driver age, and same return location | A proposed rental period may support clearly labelled exploratory results. |

## MVP filter catalog

Travella exposes only filters supported by the connected provider for that search mode. The catalog intentionally concentrates on the most decision-useful controls rather than duplicating every competitor filter.

| Search mode | MVP filters | Objective sorts |
| --- | --- | --- |
| Stay/apartment | Total price, property type, bedrooms/beds, rating, location/neighbourhood, key amenities, free cancellation, and accessibility | Lowest total price; highest rating |
| Return flight | Total price, stops, departure/arrival time, airline, duration, baggage, and refund/change flexibility | Lowest total price; shortest duration |
| Car rental | Total price, vehicle class, seats/luggage, transmission, provider, mileage/fuel, cancellation, and payment timing | Lowest total price |

## Happy-path flow

1. An authenticated traveler opens a Draft Plan with a chosen destination/city and its linked Conversation.
2. The traveler asks for a stay, return flight, or car rental through chat or from its relevant generated planning surface, or the agent offers the appropriate search after a relevant request.
3. The agent uses known active planning-brief context and asks only for any missing required input. It records broad trip constraints in the editable brief and keeps narrow refinements in the current search.
4. When timing is flexible, the agent proposes a labelled provisional range and may show exploratory results. It prompts the traveler for exact dates before they can add an option to the Plan.
5. Travella sends the complete current query only to the connected functional provider for that search mode and shows a concise search state.
6. Travella presents three to five provider-identified, best-fit result cards with total or clearly disclaimed estimated total prices, material trade-offs, and decision-critical details.
7. The traveler opens details, changes sort, adds up to three options to a side-by-side comparison, removes a comparison option, or requests more results. None of these actions save a Plan change.
8. The traveler edits criteria or filters and selects **Refresh results**. Travella preserves the completed cards in an Updating state until the replacement set is complete.
9. The traveler chooses an exact-date result to add. Travella rechecks it with the provider and shows the current result only if it remains available; a material change requires a new traveler choice.
10. The traveler proceeds to the explicit confirmation flow in US-003. Only that confirmed mutation can save a Selected Option and applicable Map Pin.

## In scope

- Provider-backed stay/apartment, return-flight, and same-location car-rental searches for a chosen Plan destination.
- Progressive collection of mode-specific inputs in the Conversation and validated search controls inside the relevant generated planning surface.
- Clearly labelled provisional-date research and exact-date gating before a saved selection.
- A compact, provider-capability-aware filter catalog and objective sorts.
- Best-fit ranking explained against active planning-brief context.
- Three-to-five-card initial results, Show more, detail panels, and up-to-three-option comparison.
- Transparent provider identity, total or estimated-total price treatment, material result details, and final availability/price recheck.
- Explicit result refresh, Updating state, retry after temporary provider failure, and restoration of a compact completed set after reconnect.
- Handoff to US-003 for explicit add-to-Plan confirmation.

## Out of scope

- Supplier redirect, booking completion, payment, or booking confirmation.
- Automatic selection, automatic addition to a Plan, or automatic Map Pin changes.
- One-way or multi-city flights, and car rentals with a different drop-off location.
- Multi-provider aggregation, price comparison across suppliers, or backup-provider failover.
- Device-location or profile-derived flight origin.
- Persisting raw provider results, temporary comparisons, or incomplete searches as durable Plan data.
- Final provider set and access terms, final A2UI schema/component catalog, provider-retention rules, or detailed API schemas.

## Acceptance criteria

1. A traveler with a chosen Plan destination can initiate a stay, return-flight, or car-rental search only when the relevant provider integration is functional; unavailable modes remain hidden.
2. A search may use active planning-brief context, but the traveler can edit every proposed criterion before refreshing results.
3. Dates, party size, and overall budget entered through search update the editable planning brief; narrow filters and sort order remain search-scoped.
4. A traveler can use a clearly labelled provisional date range to browse and compare exploratory results.
5. A provisional-date result cannot become a Selected Option; Travella asks for exact dates before the add-to-Plan flow can begin.
6. A flight search requires a traveler-confirmed departure airport/city and supports return flights only; it never infers the origin from device location or a profile.
7. A car-rental search requires a pick-up location, pick-up/drop-off dates and times, driver age, and the same return location.
8. Party input distinguishes adults, children, and infants, and asks for a child's age only when the connected provider requires it.
9. Result cards come from one connected provider per search mode and identify that provider; Travella does not represent separate supplier offers as one MVP comparison.
10. The initial completed result set contains approximately three to five best-fit cards and lets the traveler request more provider results.
11. Each card leads with the total price for the current criteria, or an estimated total accompanied by a clear disclaimer of missing or unknown mandatory charges.
12. Each result card exposes the mode-specific details needed to compare it, including the policy and baggage, cancellation, or mileage details relevant to that mode.
13. A traveler can open an in-conversation detail panel and compare up to three options side by side without saving or selecting an option.
14. The traveler can change to the approved mode-specific filters and objective sorts that the connected provider supports.
15. Changing criteria, filters, or sort order does not silently replace results. The traveler must choose Refresh results.
16. During a refresh, the prior complete set remains visible with an Updating state until a complete replacement is available.
17. A temporary provider failure retains any previous complete set, explains the issue, and offers Retry; Travella does not fabricate availability, prices, or a backup-provider result.
18. Before an exact-date option enters US-003's add-to-Plan confirmation, Travella rechecks provider availability and material terms.
19. An unavailable option cannot enter confirmation. A changed price or material term requires the traveler to make a fresh choice.
20. After refresh or reconnect, Travella restores a compact completed result set and offers Refresh results; incomplete work and comparison selections may be discarded.
21. No outcome of this story presents a search result, Selected Option, or supplier link as a completed booking.
22. A chat request may navigate to or populate the relevant existing planning surface with a validated result component, but it cannot create a surface, start a provider search, or save a selection without the applicable traveler action and confirmation.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Date flexibility | The agent may use a clearly labelled provisional date range for exploration, but exact dates are required to save an option. | The traveler can research early without mistaking tentative availability or pricing for a plan choice. |
| Provider offers | Present one canonical card from the functional connected provider; do not aggregate offers across suppliers in the MVP. | Avoids duplicate or falsely comparable cards while provider coverage is still being established. |
| Flight origin | The traveler confirms the departure airport/city; nearby airports may be suggested, but location is never inferred. | Flight availability depends on a clear origin and the traveler retains control over location data. |
| Flight shape | Return flights only. | Covers the initial holiday-planning use case without multi-leg complexity. |
| Car-rental shape | Same pick-up and return location. | Covers the common rental use case without one-way pricing and logistics. |
| Party size | Adults, children, and infants are separate inputs; child age is on demand. | Enables accurate availability and pricing without collecting unnecessary detail. |
| Search context | Broad dates, party size, and overall budget update the planning brief; narrow filters and sort order are search-scoped. | Preserves durable trip context without mistaking every temporary refinement for a lasting preference. |
| Filter catalog | Offer compact, mode-specific filters only when the connected provider supports them. | Preserves useful choice controls without inheriting every competitor's complexity or promising unavailable data. |
| Result reveal | Start with approximately three to five curated cards and let the traveler request more. | Keeps the conversation scannable while preserving direct-search control. |
| Ranking and sorting | Start with explained best-fit ranking from the active brief and allow the traveler to switch to objective mode-specific sorts. | Combines conversational guidance with direct control over the trade-off the traveler values. |
| Result refresh | The traveler explicitly refreshes after changing criteria or filters; the prior complete set stays visible and marked Updating until a replacement is complete. | Keeps cost- and rate-sensitive provider calls intentional while avoiding a blank or flickering comparison view. |
| Result disclosure | Cards lead with total current-search price and only their mode's decision-critical details. | Enables meaningful comparison without concealing the total cost or overwhelming the traveler. |
| Estimated total | When the provider lacks all mandatory charges, present the price as an estimated total with a clear disclaimer. | Comparisons remain useful without overstating price certainty. |
| Comparison | A traveler may compare up to three transient options side by side; saving remains a separate confirmed action. | Makes trade-offs easy to inspect without compromising traveler control over the Plan. |
| Detail view | Opening a card uses an in-conversation detail panel with an optional Compare action; it neither redirects nor saves. | Lets the traveler inspect and compare an option while retaining planning context and control. |
| Generated-surface delivery | Search controls and tool-backed cards may appear in the Conversation or in the relevant generated planning surface. | The traveler can search and act through chat while keeping the resulting data in the part of the Plan it belongs to. |
| Confirmation recheck | Recheck an exact-date option before add-to-Plan confirmation; unavailability stops the flow and changed material terms require a fresh choice. | Prevents stale availability or price from becoming a saved planning decision. |
| Provider error | Keep prior complete results, explain a temporary provider failure, and offer Retry; do not use a backup provider or invent results. | Maintains honest availability and price information while keeping the MVP integration model focused. |
| Recovery | Restore the latest compact completed set and offer refresh; discard unfinished searches and comparisons. | Restores useful context without presenting temporary work as current inventory. |
| Provider visibility | Identify the connected provider, but communicate freshness through actionable states instead of a timestamp. | Gives the traveler source context without adding passive, easily misinterpreted freshness metadata. |
| User-flow model | [Search and comparison flow](search-comparison-flow.drawio) documents provisional research, refresh/retry, comparison, final recheck, and the US-003 handoff. | These branching outcomes are easier to review visually than in the happy-path narrative alone. |

## Diagram

Open [search-comparison-flow.drawio](search-comparison-flow.drawio) in Draw.io / diagrams.net to edit the user flow. An [SVG preview](search-comparison-flow-preview.svg) is included for quick review.

## Initial state and event contract

This is a product-facing contract, not a final database, A2UI, or provider schema.

| Area | Authoritative saved Plan data | Transient or resumable context | Allowed browser projection |
| --- | --- | --- | --- |
| Planning brief | Traveler-confirmed and active broad trip constraints, including dates, party size, and overall budget | Tentative agent interpretation awaiting traveler confirmation | Editable brief fields and tentative prompts |
| Search criteria | None beyond qualifying active brief entries | Current search mode, exact or provisional dates, locations, rooms/cabin/driver age, filters, sort, and query version | Validated controls, current criteria, and Refresh results state |
| Surface delivery | No change | Target generated surface, active navigation focus, and component revision | The matching search surface may receive a validated loading, result, error, or comparison component |
| Provider results | No raw provider result bundle is durable Plan data | Compact latest completed result cards, provider identity, estimated-total disclaimer where needed, and pagination/Show more context | Compact cards, detail-panel fields, comparison fields, provider identity, and Updating/Retry states |
| Comparison | None | Up to three current result references | Side-by-side comparison projection |
| Add-to-Plan handoff | No change until US-003 confirmation succeeds | Exact result reference and successful recheck outcome | A clear next action to begin US-003 confirmation, never a saved mutation |

- The CRUD backend remains the authoritative owner of the Plan, linked Conversation, planning brief, Selected Options, and Map Pins. The connector service owns provider requests, credentials, validation, rate limiting, and response normalization.
- The browser may request a search or a refresh, but cannot establish the traveler identity, Plan authorization, connected provider, provider option identity, price, availability, or a saved Plan mutation.
- Search, Refresh results, Show more, detail, comparison, sort, and surface-delivery events are bound to the authenticated traveler, authorized Plan, and current query version. A late result from a superseded query must not replace the newer completed set or populate the wrong surface.
- A selected add-to-Plan action uses an exact current query and must be rechecked before the browser receives a US-003 confirmation request. Repeated delivery cannot create a duplicate Selected Option or Map Pin.
- Raw provider response retention, attribution, and caching rules remain integration-design decisions. Restored compact cards must never be represented as a guaranteed current offer without Refresh results or the final recheck.

## Open implementation decisions

- Exact provider set, provider access terms, coverage, attribution, data retention, and supported filter capabilities.
- Final validated A2UI schema and component catalog for criteria, filters, cards, detail panels, comparisons, errors, and confirmation handoff.
- Exact provider-result normalization, best-fit ranking signals, explanation wording, search pagination, and rate-limit behaviour.
- Exact treatment of currencies, taxes, fees, optional extras, insurance, and changes to provider terms.
- API/event schemas, query/version token lifetime, reconnect timing, and idempotency implementation.
- Whether a user-flow diagram would add clarity once the story prose is approved.

## Related artifacts

- [Travella overview](../../overview.md)
- [Domain glossary](../../../CONTEXT.md)
- [Architecture foundations](../../planning/architecture-foundations.md)
- [US-002 — Research and shape a plan through conversation](../agentic-plan-research/README.md)
- [US-003 — Select options and maintain the planning canvas](../option-selection-and-canvas/README.md)
- [Search and comparison flow](search-comparison-flow.drawio)
