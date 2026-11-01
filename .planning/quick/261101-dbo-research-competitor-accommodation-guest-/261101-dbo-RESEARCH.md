# Accommodation guest-details competitor research

Researched: 2026-11-01. Primary sources only. This is documentation research, not a live consumer-checkout inspection. No reservations were made and no personal data was submitted.

## Finding

First and last name alone are insufficient as a model for a real accommodation checkout. The competitors distinguish the person receiving booking communications from the person checking in, and collect usable contact information. One named primary guest per room can be sufficient: the evidence does **not** justify requiring a separate identity form for every occupant in every booking.

## Evidence

| Competitor | Source type | Documented collection/behavior | Pattern to adapt |
|---|---|---|---|
| Booking.com | Demand API v3.2 creation guide; not proof of retail checkout UI | Booker name, email, telephone and address are required. Each room product carries guest entries with name and email. Estimated arrival and special requests are optional remarks. | Separate booking contact from room guests; optional requests do not belong among mandatory identity fields. [Create orders](https://developers.booking.com/demand/docs/orders-api/order-preview-create) |
| Expedia Group | Rapid API integration launch requirements; not Expedia.com/Hotels.com retail UI | The itinerary needs a traveler email or a monitored integration mailbox, plus a viable traveler phone number. Each room's first/last name must identify the main guest actually checking in. | Name the main guest per room and collect one reliable booking contact; do not duplicate the booker automatically across all rooms. [Lodging launch requirements, TR4–TR6](https://developers.expediagroup.com/rapid/setup/launch-requirements/lodging-launch-reqs) |
| Airbnb | Consumer Help Center | Booking requires full name, email, confirmed phone and payment information. Identity verification can introduce further information depending on circumstances. | Account identity/contact can provide a starting point; extra identity checks need a concrete reason rather than blanket fields. [Booking requirements](https://www.airbnb.com/help/article/1170) |
| Airbnb | Consumer Help Center with desktop steps | Booking for another person is a supported permission-based flow: the other guest accepts an invitation, then the booker selects them in the checkout's “Who you’re booking for” section. | Explicitly distinguish booker from guest. This is an Airbnb-specific authorization model, not a requirement to reproduce an invitation system in Travella. [Booking for someone else](https://www.airbnb.com/help/article/4134) |
| Agoda | Consumer Help Center (search-indexed article; direct opening returned only input controls) | Its help article describes entering guest names/nationality on the room-details page, then opening “Special Requests (Optional).” Requests depend on availability and are confirmed on arrival. | Progressive disclosure for optional requests, with clear non-guarantee wording. UI wording is documented, but no live checkout was inspected. [Special requests](https://www.agoda.com/en-in/info/how-can-i-make-a-special-request.html) |
| Agoda | Demand Book API contract | Customer first/last name, email and phone are marked required. Which email to send depends on the fulfillment model: a partner mailbox can be appropriate in some merchant flows, whereas others use customer email. | Contact collection and routing must follow the actual supplier integration; a test email is not a production contact strategy. [Book API](https://developer.agoda.com/demand/docs/json-book-api) |

Booking.com's guide requires fields on guest entries but does not establish from this page alone that every occupant needs an entry. Expedia explicitly describes a main guest per room. Do not turn guest count into a presumed all-occupant-name requirement.

Airbnb separately documents inviting companions to an existing group reservation so they can access trip information and host messages; guest identities and booked guest count are distinct concerns. [Changing a reservation](https://www.airbnb.com/help/topic/1361)

## Recommendation for Travella

These are design inferences from the evidence, constrained by Travella's provider contract—not claims about identical competitor screens.

1. **Contact details:** show first name, last name and a usable email. Offer authenticated profile values when available and let the traveler explicitly review them. Add a phone field only when there is a supported operational or provider purpose; do not collect it merely to resemble another brand.
2. **Who is staying:** show a clear choice between the booking contact staying and booking for someone else. When they differ, reveal lead-guest name fields rather than silently treating the contact as the guest.
3. **One lead guest per booked room/unit:** identify the room/unit with its selected type and occupant count. Label fields “Main guest checking in,” and explain that the name should match the identification used at check-in. Keep contact reuse explicit. Show a per-room email only if the provider genuinely requires separate contacts; otherwise reuse the confirmed booking contact.
4. **Optional requests:** use a collapsed “Arrival and special requests” section only after backend/provider support is established. Do not render a field that is discarded. State that special requests are not guaranteed. Apartment access instructions and arrival arrangements deserve attention, but property-specific data should drive the fields.
5. **Avoid blanket data collection:** nationality, address, date of birth, passport and every companion's details should be conditional on an actual provider/property requirement. Competitor API contracts differ; the strictest competitor's form is not Travella's universal schema.
6. **Retain the sandbox distinction:** a fuller guest form does not turn the current test flow into real booking. Keep the test confirmation action and sandbox explanation accurate.

## Current implementation context

The parent investigation reports that Travella's current `TestGuest` contract contains `first_name` and `last_name`; the connector derives the holder from room 1 and substitutes a sandbox email. Those are adequate test conveniences but do not establish a complete customer-facing contact flow. The parent is recording the exact code references and LiteAPI contract separately.

## Limits and open questions

- No live checkout screenshots were captured. API contracts support field semantics, not assertions about competitors' visual layout or current form order.
- Expedia Group documentation should not be described as a direct inspection of Expedia.com or Hotels.com.
- Country-, property-, payment- and account-dependent variations remain possible. Ask only for data needed by Travella's active contract and supported workflow.
- Confirm the provider's holder-versus-per-room-contact mapping and whether phone, arrival time and requests are transmitted before implementing those inputs.
- A complete real booking design also needs price, cancellation, payment and property/check-in disclosures; this note evaluates guest details only.

## LiteAPI contract checked against the current implementation

[Adding guests during booking](https://docs.liteapi.travel/docs/adding-guests-during-the-booking-step) explicitly requires one primary contact per room, with first name, last name and email. `occupancyNumber` associates that contact with a booked room; it is not a guest headcount. The holder can be different from the room leads. [Book API](https://docs.liteapi.travel/reference/post_rates-book) describes the holder as the person responsible for payment, who may not travel. The detailed room guide is more precise than the generic endpoint wording about all guests.

Current source: StayCheckout.jsx supplies fictional names; services/agent/travel_contracts.py TestGuest accepts names only; services/mcps/sandbox_checkout.py derives holder from the first room and injects a sandbox mailbox. These are test conveniences, not a production contact solution.

## Prototype decision

User selected three interactive layouts. A continuous form, B guided contact/guest steps, C inline editable review. Recommendation: A for the short current guest flow; B for gradual guidance; C when prefilled details are reliable. No winner selected. All proposed contact/arrival/request behavior is simulated; production must explicitly extend contracts and map supported fields before displaying them as submitted.
