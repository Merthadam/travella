# Travella

Travella is a conversational travel-planning product. This glossary keeps the product language stable while the MVP is designed.

## Planning

**Traveler**:
An authenticated person using Travella to research and organize a holiday.
_Avoid_: Customer, client, account

**Plan**:
The saved travel-planning record for one holiday. In the MVP, a plan is centered on one destination or city.
_Avoid_: Trip, itinerary, project

**Draft Plan**:
A plan that the traveler has not finalized and may delete or restore during its recovery period.
_Avoid_: Temporary trip, session

**Planning Requirements**:
The traveler-confirmed core categories that a plan may need: flight, accommodation, and car rental. Each is `needed`, `not needed`, or `undecided`; a requirement is not a search result or a Selected Option.
_Avoid_: Booking requirements, selections

**Conversation**:
The one-to-one chat history associated with a single plan.
_Avoid_: Thread, chat session

**Planning Canvas**:
The editable view of a plan, including its permanent map, generated Planning Surfaces, and saved selections.
_Avoid_: Dashboard, board

**Planning Surface**:
An optional flight, accommodation, or car-rental workspace area generated from confirmed Planning Requirements. It begins empty/search-ready and is separate from a saved Selected Option.
_Avoid_: Booking panel, autonomous workflow

**Map Pin**:
A selected location displayed on a plan's map. MVP pin categories are stay, airport, car rental, restaurant, and activity.
_Avoid_: Marker, red dot

**Custom Map Pin**:
A lightweight, traveler-saved place on a plan's map. It is not a Selected Option and has no price, availability, or supplier link.
_Avoid_: Booking, unverified option

**Selected Option**:
A flight, car rental, place, or other result that the traveler has chosen for a plan. Search results are not selected options until the plan changes.
_Avoid_: Search result, booking

**Supplier Redirect**:
A handoff from Travella to an external supplier where the traveler completes a booking. A redirect does not confirm a booking.
_Avoid_: Booking, ticket issue

**Provider**:
An external source of travel inventory, places, routes, or booking links. Provider selection is deliberately unresolved until access is confirmed.
_Avoid_: Guaranteed integration, permanent dependency

**Recovery Period**:
The seven-day period during which a deleted draft plan can be restored before identifiable plan data is permanently removed.
_Avoid_: Archive, permanent deletion
