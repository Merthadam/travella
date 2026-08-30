# US-003 — Select options and maintain the planning canvas

## User story

As a traveler with a confirmed destination, I can review travel and place results, explicitly save the options that matter, and maintain them on a map-based Planning Canvas, so I can organize a useful single-destination plan without mistaking research results for bookings.

## Success outcome

After choosing a destination in [US-002](../agentic-plan-research/README.md), the traveler can use provider-backed results and direct map browsing to choose a small set of saved travel options and places. The map is the default Planning Canvas; it distinguishes saved Map Pins from temporary map-search results, exposes details from a selected pin, and can switch to a categorized list of the same saved items.

Every saved-plan mutation requires explicit traveler confirmation. A Supplier Redirect and a completed booking remain outside this story.

## Confirmed interaction model

- A search or recommendation result is not a Selected Option or Map Pin until the traveler explicitly confirms it.
- Adding a provider-backed result requires an explicit confirmation before Travella saves the Selected Option and any corresponding Map Pin.
- Removing a Selected Option, Map Pin, or Custom Map Pin also requires explicit confirmation.
- A Plan may contain at most one selected stay, flight, and car rental. It may contain multiple selected restaurants and activities.
- Confirming a new stay, flight, or car rental when one already exists shows a replacement confirmation that identifies the existing option and Map Pin that will be removed.
- The Planning Canvas is map-first. Selecting a saved Map Pin shows its details. The traveler can switch to a categorized list view of the same saved items.
- The Planning Canvas includes an option-search box for stays, flights, and car rentals, so the traveler can start those provider-backed searches without leaving the Canvas. A flight or car-rental search is not a map-place search.
- The traveler can search and browse places directly on the map when a functional map/place provider is available. These temporary result pins are visually distinct from saved Map Pins.
- Direct map browsing covers stays, restaurants, and activities only. Flights and car rentals remain separate provider-backed result flows.
- The traveler can save a Custom Map Pin from a place search. It must be categorized as a stay, restaurant, or activity, and is a lightweight personal saved place rather than a Selected Option: it has no price, availability, or supplier link.
- A traveler may change a Custom Map Pin's category or replace its searched location. Each change requires explicit confirmation.
- Provider-dependent result modes remain hidden until a real integration is functional. Demonstration data, if ever shown, must be labeled honestly.

## Happy-path flow

1. The traveler opens a Draft Plan with a confirmed destination and its linked Conversation.
2. Travella presents only the provider-backed result modes that are functional. The traveler can refine results in the Conversation or UI; start a stay, flight, or car-rental search from the Canvas search box; or search the map for a stay, restaurant, or activity.
3. The traveler inspects a result or temporary map-search pin. It remains unsaved.
4. The traveler chooses to add it. Travella presents the exact Selected Option or Custom Map Pin change for explicit confirmation.
5. After confirmation, the CRUD backend saves the change and the Planning Canvas displays the category-specific Map Pin.
6. The traveler selects a pin to view its details, or switches to the categorized list view.
7. The traveler can add more restaurants or activities; a new stay, flight, or car rental instead presents a replacement confirmation.
8. To remove a saved item or edit a Custom Map Pin, the traveler confirms the described change. Travella then updates the saved Plan and Canvas.

## In scope

- Explicitly adding and removing provider-backed Selected Options and their Map Pins.
- One selected stay, flight, and car rental, plus multiple selected restaurants and activities.
- Replacement confirmation for a single-choice option.
- A map-first Planning Canvas with category-specific saved Map Pins, pin details, and a categorized-list alternate view.
- A Canvas option-search box for provider-backed stay, flight, and car-rental results.
- Direct map searching/browsing for stays, restaurants, and activities when a functional map/place provider is available.
- Creating, editing, and removing categorized Custom Map Pins from map-place search.
- Clear distinction between temporary search results, saved Selected Options, and Custom Map Pins.

## Out of scope

- Booking in Travella, booking confirmation, payment, or a Supplier Redirect flow.
- Multi-destination plans, routes, or day/time itinerary assignments.
- Direct map searching/browsing for flights or car rentals.
- Dropping an arbitrary-coordinate pin, manually creating airport or car-rental pins, or manually adding a flight, car rental, or booking record.
- Price, availability, or supplier links for Custom Map Pins.
- Final provider set, provider access terms, map/search wireframes, and validated generative-UI schema.

## Acceptance criteria

1. A result remains unsaved until the traveler explicitly confirms the proposed Plan change.
2. Confirming a provider-backed result saves the Selected Option and its applicable category-specific Map Pin together.
3. Removing a Selected Option, Map Pin, or Custom Map Pin requires explicit confirmation before the saved Plan changes.
4. A Plan permits no more than one selected stay, flight, and car rental, and permits multiple selected restaurants and activities.
5. Selecting another single-choice option identifies and requires confirmation to remove the existing option and Map Pin before replacement.
6. The default Planning Canvas presents a map. Selecting a saved Map Pin reveals its details, and the traveler can switch to a categorized list that represents the same saved items.
7. The Planning Canvas provides an option-search box for provider-backed stays, flights, and car rentals without requiring the traveler to leave the Canvas.
8. Direct map search shows temporary result pins distinctly from saved Map Pins and supports stays, restaurants, and activities only.
9. A traveler can save a map-search result as a Custom Map Pin only after choosing an allowed category and explicitly confirming the change.
10. A Custom Map Pin has no price, availability, or supplier link, and is not represented as a Selected Option.
11. A traveler can change a Custom Map Pin's category or searched location only through an explicit confirmation.
12. Flights and car rentals are available only through functional provider-backed result flows; unavailable modes are hidden and any demonstration data is labeled honestly.
13. No flow in this story represents a Selected Option, Custom Map Pin, or supplier link as a confirmed booking.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Addition authority | Adding an option or custom pin requires a separate explicit confirmation. | Search and recommendation results must never silently alter a Plan. |
| Removal authority | Removing a saved item also requires explicit confirmation. | The traveler remains in control of saved planning choices. |
| Single-choice categories | A Plan holds one selected stay, flight, and car rental. | These are primary travel choices in the MVP. |
| Multiple-choice categories | A Plan may hold multiple restaurants and activities. | Travelers commonly want several possible places in a destination. |
| Replacement | Replacing a single-choice option identifies the existing option and Map Pin that will be removed. | Avoids accidental loss of a current choice. |
| Canvas view | The Canvas defaults to a map, with pin details and a categorized-list alternate view. | The map is the planning surface; the list supports scanning and management. |
| Canvas option search | The Canvas includes a search box for provider-backed stay, flight, and car-rental searches. | The traveler can compare and save core travel options in the same planning surface. |
| Map search | The map supports direct browsing/search for stays, restaurants, and activities when a functional provider exists. | Travelers can discover places spatially as well as conversationally. |
| Map-search boundary | Flights and car rentals are not searched directly on the map. | They require distinct provider-result experiences. |
| Temporary results | Map-search pins are visually distinct from saved Map Pins. | Browsing must not be mistaken for a Plan change. |
| Custom pin | A traveler can save a categorized custom pin from place search. | Supports personally meaningful places beyond the normal option flows. |
| Custom-pin boundary | A Custom Map Pin is lightweight and has no price, availability, or supplier link. | It supports planning without implying inventory or a booking. |
| Custom-pin editing | Category and searched location can be changed only by explicit confirmation. | Keeps the Canvas accurate and traveler-controlled. |

## Initial state and event contract

This is a product-facing contract, not a final database or protocol schema.

| Area | Authoritative saved Plan data | Transient or resumable context | Allowed browser projection |
| --- | --- | --- | --- |
| Selected Options | Confirmed provider-backed option, category, and provider reference | Unsaved result currently being inspected | Compact result details and proposed confirmation |
| Map Pins | Confirmed pin category, location reference, and relationship to its saved item | Temporary map-search results | Saved versus temporary pin state and selected-pin details |
| Custom Map Pins | Confirmed category, location reference, and lightweight label/details | Proposed category or replacement location | Custom-pin confirmation and rendered pin details |
| Canvas view | Traveler's current map or list preference, if retained | Current map bounds, map-place query, option-search query, and temporary results | Map/list view and compact search-result projection |
| Plan mutation | Confirmed version of the Plan | Exact proposed addition, removal, replacement, or edit | A single, clear confirmation request |

- The browser may request searches and propose a change, but cannot author the traveler identity, Plan identity, or saved mutation.
- A confirmation is bound to the exact traveler, Plan, and proposed change. The CRUD backend remains the sole durable-data owner and applies the change only after verification.
- Search results and temporary map pins are not saved as Plan data merely because they were displayed. Provider-retention and attribution rules remain an integration-design concern.
- Repeated delivery of a traveler action or confirmation must not create duplicate saved options or pins.
- On refresh or reconnect, Travella restores the latest consistent saved Plan and Canvas projection; unfinished search results may be discarded rather than presented as saved.

## Open implementation decisions

- Exact map/search, pin-details, categorized-list, and confirmation wireframes.
- The provider set, access terms, pricing model, attribution, and retention rules for map/place and travel-result data.
- The final data model for relationships between Selected Options, Map Pins, and Custom Map Pins.
- API/event schemas, including search pagination, error handling, and confirmation-token lifetime.
- How the map state and result searches interact with the agent's validated UI events.

## Diagram

Open [canvas-selection-flow.drawio](canvas-selection-flow.drawio) in Draw.io / diagrams.net to edit the user flow. A [rendered preview](canvas-selection-flow-preview.svg) is included for quick review.

## Related artifacts

- [Domain glossary](../../../CONTEXT.md)
- [Travella overview](../../overview.md)
- [Architecture foundations](../../planning/architecture-foundations.md)
- [US-002 — Research and shape a plan through conversation](../agentic-plan-research/README.md)
- [Canvas selection flow](canvas-selection-flow.drawio)
