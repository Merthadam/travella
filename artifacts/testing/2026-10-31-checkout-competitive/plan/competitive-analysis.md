# Competitive analysis: flight checkout and seats

Researched 2026-10-31 for quick task `261031-ndb`. Scope: optional seat purchase, multiple travelers, return flights, and information hierarchy. Primary sources only. This is a comparison of documented airline behavior plus two inspected official agent-tool screenshots; it is **not** a claim that we completed or observed the current consumer checkout of these airlines.

## Evidence and comparison

| Competitor / source | Verified behavior or visible structure | Useful principle for Travella | Limitation |
| --- | --- | --- | --- |
| easyJet consumer seating policy | Choosing a seat costs extra unless included. Skipping selection results in allocation at check-in; nearby seats are attempted but not guaranteed. If buying seat selection, easyJet requires it for every passenger. | Make the optional allocation path explicit and explain its consequence. | This is policy evidence, not live UI. Do not import its all-passenger purchase requirement into a different provider. [Seating terms, section 9](https://www.easyjet.com/en/terms-and-conditions?webview=true), [choosing a seat](https://www.easyjet.com/en/help/booking-and-check-in/choosing-a-seat). |
| Ryanair consumer seat rules | Reserved seats have a variable fee. Random allocation is free at check-in. Companions may sit apart; current family rules have separate provisions for children. | Describe what “skip” means rather than implying no seat will be provided. Preserve provider-specific restrictions. | Policy page only. Do not generalize its check-in timing or family guarantee to Travella. [Seat rules](https://help.ryanair.com/hc/en-gb/categories/12489305702289-Seat-Rules). |
| British Airways consumer seating | Basic fares offer paid choice or free allocation at check-in. Other fares and status can change when selection is free. Seats/prices can be reviewed during booking. | Separate a seat being included in the flight from paying to choose its position. Price labels must reflect the returned fare. | Policy page, not a visual checkout study. [Choosing your seat](https://www.britishairways.com/content/information/seating/reserving-your-seat). |
| KLM consumer seating | Most fares allow standard-seat choice during check-in; Light passengers without advance purchase are assigned seats then. Prices depend on itinerary and other factors and appear in booking/My Trip. | Use real offered seat prices; do not invent a universal “from” price or promise every traveler free manual selection. | Text policy. No claim about current booking-page placement. [Economy seats](https://www.klm.com/information/travel-class-extra-options/economy-class-seats?showredirectnotice=us). |
| Lufthansa consumer seating and official group-booking manual | Consumer documentation scopes selections to individual travelers and each flight leg. The manual visually uses flight tabs above the map and traveler/seat/price rows; its instructions select a traveler, then a seat, and submit after selections. | Make flight and traveler the two clear selection dimensions, with assignments visible while using the map. | The inspected screenshots are SPRK group/agent tooling, **not** the current Lufthansa consumer checkout. Group fare rules are not applicable to Travella. [Seat reservations](https://www.lufthansa.com/gb/en/common/seatreservation-condtions/seat-reservations), [manual PDF pp.162–163, printed39–40/69](https://business.lufthansagroup.com/content/dam/b2b/experts/files/LHG_BaG_NDC_UserManual.pdf#page=162). |
| easyJet / Travelport official guide | Inspected screenshot places the map on the left and a compact segment/assignment rail on the right. It visibly includes an “Airline Assigned” checkbox. Selected-seat total and Apply sit together at the bottom; the legend explains states. | Keep selection workspace, assignment review, and optional allocation close. Put cost and the action that accepts it together. | Agent interface from March2023, not current easyJet consumer design. Use information architecture, not its styling or old prices. [Travelport EZYCARD, PDF p.5](https://www.easyjet.com/ejcms/cache/medialibrary/files/travel%20agent%20online%20guides/en/ezy-card-travelport.pdf#page=5). |

## Six supported findings

1. **Seat choice is an optional extra in the documented basic-fare examples.** Free airline allocation is a real alternative in easyJet, Ryanair, BA Basic and KLM Light policies above; the allocation timing and family rules vary. Travella should say “Let the airline assign seats” and “No seat-selection charge,” rather than promise a random assignment has already happened.
2. **The unit of selection is traveler × flight.** Lufthansa's consumer documentation and group-booking manual directly support this model. Return and connecting segments need distinct assignments, not a single seat label for the whole journey.
3. **A compact assignment list can live beside a map.** This is directly visible in the easyJet Travelport screenshot; Lufthansa's manual uses rows below instead. These are two verified layouts, not evidence that one is universally optimal.
4. **Cost belongs with selection and acceptance.** easyJet's guide identifies passenger seat/cost, aggregate selected-seat cost and Apply together. This supports proximity, but does not establish that a sticky footer is an observed competitor pattern.
5. **Visible seat states reduce ambiguity.** Both inspected manuals provide legends and distinguish selected/occupied/restricted or unavailable seats. Travella should keep text or accessible names as well as color and show which traveler owns a chosen seat.
6. **Airline policies are not interchangeable.** easyJet's all-traveler rule, BA fare/status benefits, KLM pricing conditions and Ryanair family provisions differ. Travella must derive availability and cost from its provider contract and avoid copying a carrier's promise.

## Recommended Travella direction — design inference

Use a focused **selection workspace** rather than another stack of full-width explanation cards:

- Compact checkout progress and one short route/date context line. Full outbound/return itinerary belongs in an on-demand details disclosure or the dedicated flight-review stage; the current task does not need a repeated journey poster.
- Desktop: flight switcher immediately over a primary seat map, with a compact traveler/assignment rail next to it. The selected traveler is unmistakable; selecting a seat advances to the next eligible unassigned traveler. A traveler row remains directly editable. Auto-advance is a Travella improvement, **not verified competitor behavior**.
- Place the no-charge airline-assignment action in the assignment area with one sentence about later allocation and no guarantee of sitting together. Avoid repeating the same explanation in a banner, card, empty state and footer.
- Keep seat-extra cost and Continue together. A persistent action area is a proposed remedy for Travella's long map, not a claim that the sampled consumer sites use one. Show the provider-confirmed trip total separately from unconfirmed seat-choice changes to avoid misleading totals.
- Mobile: flight and traveler controls precede the map; compact assignment chips/rows and an accessible action area replace a squeezed desktop rail. Verify scrolling and focus so sticky controls do not cover map rows or form fields.
- Preserve exact provider service IDs, per-person eligibility, physical-seat conflict prevention, baggage choices, reprice/recovery behavior and sandbox disclosure. Visual simplification must not change these contracts.

The recommendation about reducing repeated itinerary information is driven by the user's explicit feedback and the isolated seat-selection scope visible in the manuals. We did **not** establish that competitors never repeat itineraries across checkout stages. The proposed hierarchy must be validated in Travella's real desktop/mobile flow.

## Evidence files and research limits

Rendered and manually inspected original official PDF pages are available at:

- [easyJet guide screenshot](easyjet-seats-page5.png)
- [Lufthansa guide screenshot](lufthansa-162.png)

These source screenshots contain example data published by the airlines; no traveler account was used. Lufthansa PDF retrieval exceeded the web reader's size limit, so its public PDF was downloaded and rendered locally. No competitor booking, payment or reservation was submitted. Current consumer seat-stage visuals, transition animation, mobile behavior, action stickiness, and completion rates remain unverified; this research cannot claim measured conversion improvements.


Root browser checks: easyJet's public homepage returned Access Denied; no access-control bypass attempted. KLM's public Boeing 787-9 page loaded, but its interactive map did not appear in the rendered accessibility tree, so it supplies no additional checkout-layout evidence.

## Implemented design decisions

The [desktop sketch](layout-desktop.png) and [mobile sketch](layout-mobile.png) were captured and inspected with Chrome DevTools before production edits. The [HTML layout study](layout-study.html) contains explicitly simulated data and no persistence. The [previous desktop screen](before-seats-desktop.png) is preserved from the preceding verification run.

The implementation follows the side-by-side assignment/map hierarchy, flight tabs, compact context with disclosure, and a persistent price/action area. It uses Travella's existing visual tokens. A same-currency arithmetic preview is labeled Estimated total and is replaced by the provider-confirmed total on Continue; unavailable or mixed-currency amounts fall back to Last confirmed total. No airline's consumer fare or family policies were copied. On mobile, traveler rows scroll horizontally and the map scrolls in its own keyboard-focusable region. Prior-stage navigation remains in the progress control.
