# LiteAPI / Nuitee Connect capabilities

Researched: 2026-10-08. Scope: official documentation; no application implementation. Documented platform capability does not establish access for Travella's configured account. Live account observations belong in the separate section below.

## Documented inventory and access

| Area | Documented capability | Access / limitation |
| --- | --- | --- |
| Hotels | Property content, photos, amenities, location, live room offers, meal plans, cancellation policies, multi-room occupancy, booking and management. Search by hotel IDs, destination, coordinates, Place ID, IATA or semantic query. | Hotel sandbox supports simulated bookings; production requires activation/payment setup. [Rates](https://docs.liteapi.travel/reference/post_hotels-rates), [sandbox guide](https://docs.liteapi.travel/docs/booking-a-room). |
| Flights | Search, verify fares, seats/baggage, prebook, payment, booking and servicing across GDS/NDC/LCC content. | Same API key mechanism; sandbox enabled by default according to the access guide, with limited/inaccurate inventory. Production and white-label flights need separate approval. Nuitee recommends its E2E/Nuitee Air test provider. [Access](https://docs.liteapi.travel/docs/getting-access-to-flights). |
| Experiences | Tours/activities, localized details and reviews, dated availability, priced options/time slots, checkout, vouchers and cancellation quotes. | Same `X-API-Key`; experiences access must be enabled. Sandbox may need enablement; production and white-label require explicit approval. [Access](https://docs.liteapi.travel/docs/getting-access-to-experiences). |
| Rental cars / transfers | No dedicated car-rental or transfer inventory API found in the current official documentation index. | This is absence of documented evidence, not proof that no private offering exists. Uber vouchers are hotel checkout add-ons, not a priced transfer reservation API. [Index](https://docs.liteapi.travel/llms.txt), [add-ons](https://docs.liteapi.travel/docs/attaching-add-ons-to-user-payment). |
| Other extras | eSIM discovery, packages, carts, orders and top-ups; hotel add-ons include eSIMs and Uber vouchers. | Separate purchase side effects; outside Travella's current core planning modes. [Index](https://docs.liteapi.travel/llms.txt), [add-ons](https://docs.liteapi.travel/docs/attaching-add-ons-to-user-payment). |

## Hotel handoff can retain the selected rate

Nuitee provides a hosted, customizable white-label hotel site with its own or a custom domain. It handles guest payment and booking logistics, supports configurable commission, and provides guest support by default. Direct API bookings do not appear in the white-label dashboard. [White-label overview](https://docs.liteapi.travel/docs/whitelabel-booking-site).

The documented hotel routes differ materially:

- `/hotels?...` retains search criteria, then shows listings.
- `/hotels/{hotelId}?...` retains the property and stay criteria, then shows property/rate choices.
- `/booking?offerId=...` retains the actual selected offer; the hosted site fetches it, performs prebook and loads its room/rate details.
- `/booking?prebookId=...` uses an existing unexpired prebook, skipping that step.

Thus exact-offer checkout is documented; a handoff need not repeat a destination search. Revalidation can still change price/availability. The same page has an older-looking warning under `xData` saying checkout requires a preceding details-page session, conflicting with its explicit direct-checkout section. Verify direct offer handoff against the provisioned white-label before promising it. Avoid its optional guest/email-in-URL examples because Travella prohibits personal data in URLs. [Deep-link guide](https://docs.liteapi.travel/docs/deeplinking-to-whitelabel).

“External Checkout” means the reverse direction: Nuitee redirects guests to the partner's own payment experience, and the partner confirms payment/booking through a signed server callback. It is not the hosted-payment handoff Travella currently needs. [External Checkout](https://docs.liteapi.travel/docs/external-checkout-integration-guide).

No equivalent exact-offer flight/experience URL contract was established in this research. White-label availability for those modes does not itself prove compatible deep links.

## Transaction flow and side effects

**Hotels:** discover → rates → choose room/offer → prebook → payment → book → confirmation. Static property data can be cached; rates are live. The integration guide suggests broad requests of roughly 200 hotels and progressively richer single-hotel searches. Book timeouts mean unknown status, so retrieve booking state rather than blindly creating another transaction; persist a unique `clientReference`. Payment success and reservation success are distinct. [Integration guide](https://docs.liteapi.travel/docs/hotel-integration-guide).

Hotel prebook is a checkout-session mutation that validates final pricing/availability and returns a `prebookId`; SDK payment configuration is optional. Do not treat it as ordinary research. Available payment models include the Nuitee Payment SDK, account credit card, or a contracted enterprise credit line. [Prebook](https://docs.liteapi.travel/reference/post_rates-prebook), [integration guide](https://docs.liteapi.travel/docs/hotel-integration-guide).

**Flights:** search → verify current offer → prebook → optional seats/bags → payment → book → final status. Prebook creates a provider reservation and holds seats, not merely a price check; abandoned holds may incur agreement-dependent costs. Adding services can replace payment identifiers. This exploration must not invoke flight prebook. [Flight flow](https://docs.liteapi.travel/docs/build-a-flight-booking-experience), [prebook reference](https://docs.liteapi.travel/reference/post_flights-prebooks).

**Experiences:** search → details → availability → booking-options → prebook → Stripe → book → asynchronous confirmation. Use the selected slot's actual total and required participant/questions schema. Prebook creates a temporary inventory hold, typically about ten minutes, and a Stripe PaymentIntent. Booking commonly returns `PENDING_CONFIRMATION`; a webhook or retrieval supplies final status/voucher. HTTP success alone is insufficient. [Experience flow](https://docs.liteapi.travel/docs/build-an-experiences-booking-flow).

**Cancellation:** hotel refund eligibility follows rate policy and deadlines; canceling a nonrefundable rate can terminate the reservation without a refund. Flight cancellation quotes expose eligibility, penalties and confidence, but their potential maximum refund is not guaranteed. Experiences use cancel-preview before cancel, with final cancellation/refund potentially asynchronous. [Hotels](https://docs.liteapi.travel/docs/canceling-a-booking), [flights](https://docs.liteapi.travel/reference/get_flights-bookings-bookingid-cancellations), [experiences](https://docs.liteapi.travel/docs/experiences-async-confirmation-webhooks).

## Commercial details and Travella implications

Published standard pricing makes core rates/prebook/book requests free subject to terms and reasonable look-to-book ratios. Places are $0.01/request; price-index queries $0.05/request. Flights list a 1% ticketing fee, minimum €2/maximum €10, and €0.005 per excess search above a 1,500:1 ratio. The pricing page says €25 voluntary servicing, while the flight support page says US$25: obtain account-specific terms before quoting fees. [Pricing](https://docs.liteapi.travel/reference/api-pricing-usage-costs), [flight support](https://docs.liteapi.travel/docs/flights-support-billing-model).

A research-heavy planning app may produce many searches and few attributable bookings. Confirm that this usage and hosted-checkout attribution satisfy the account's look-to-book terms before relying on free search. This is particularly relevant to Travella's comparison workflow.

**Inference for Travella:** hotel research plus explicit saved-offer handoff to a verified hosted checkout is the clearest fit for the existing planning-only boundary. Direct API payment/booking would expand product responsibilities. Keep unavailable modes hidden, label sandbox/stale results, and require traveler confirmation when prices or conditions change. Before implementation, establish account mode access, a verified white-label host, compatible account/offer ownership, offer expiry behavior, and exact-offer handoff behavior. This is a research conclusion, not an approved product-scope change.

## Live account observations

The user added `LITE_API_KEY` to `travella/local-development` in AWS Secrets Manager, `eu-north-1`. The credential has the sandbox prefix. It was read into process memory for authenticated requests; its value was not printed or persisted. The following are actual remote sandbox observations on 2026-10-08, not production inventory validation.

Sample criteria: Rome, Italy; 2026-11-13 to 2026-11-16; one room, two adults; EUR; synthetic guest nationality HU. Flight criteria: BUD–FCO return on the same dates, two adults, economy, HU point of sale.

| Probe | Observed result |
| --- | --- |
| `GET /data/hotels`, Rome, limit 5 | HTTP 200 in 1.76s; five properties, including Hotel Artemide, The Hive Hotel, Hotel Nazionale, iQ Hotel Roma, and FH55 Grand Hotel Palatino. Coordinates and review ratings present. |
| `POST /hotels/rates`, same stay, five hotels, up to two rates each | HTTP 200 in 4.54s; five hotels returned. Sample offers contained room names, occupancy, meal plan, cancellation rules, payment types, taxes/fees, perks/promotions fields and an offer identifier. Presence of a field does not guarantee a nonempty benefit. |
| `GET /data/hotel`, Hotel Artemide | HTTP 200 in 0.30s; description, 48 images, 83 facility entries, eight rooms and nine points of interest. |
| Single-property rate search, Artemide, breakfast + refundable filters, room mapping | HTTP 200 in 2.78s with no returned hotel offers. This does not establish mapped-room behavior or availability under those filters. |
| `GET /experiences/tours`, Rome and sample dates | HTTP 403, provider error code 40301, in 0.23s. Experiences search is not usable with this key as tested; request account enablement. |
| `POST /flights/rates`, BUD–FCO return | Initial request timed out locally after 55.07s. One retry with a 110s client timeout returned HTTP 200 in 16.27s: one result group containing 218 journeys, with offers, cheapest-offer, segment, duration and timestamp fields. Flight sandbox search is accessible; latency and actual production inventory remain unproven. |

Example sandbox stay totals returned (three nights, two adults; **not bookable production quotes**):

| Property / room | Meal plan | API total | Additional excluded city tax | Cancellation tag |
| --- | --- | --- | --- | --- |
| The Hive Hotel / Superior Double | Room only | €457.69 | €44.76 | Nonrefundable |
| iQ Hotel Roma / Small Double | Room only | €537.50 | €45.01 | Nonrefundable |
| FH55 Grand Hotel Palatino / Classic Executive Room with City View | Breakfast | €726.88 | €44.97 | Refundable; returned penalty begins 2026-11-10 09:00 GMT |

These samples show why Travella must distinguish the returned rate total from excluded property charges and retain cancellation deadlines with time zones. Only selected public offer fields and aggregate counts were inspected; raw responses and offer identifiers were not saved to artifacts.

Production access, actual booking/payment behavior, and a provisioned white-label hostname remain unverified. No prebooking, payment, booking, cancellation, or account changes were performed by this exploration.

### Local integration follow-up

The current `scripts/local_secrets.py` allowlist does not include `LITE_API_KEY`; its `validate()` rejects unsupported setting names. Adding this key to the shared secret therefore needs a corresponding allowlist/routing change before the existing local credential-sync command will accept the secret. This research used direct in-memory credential retrieval and did not modify application configuration or implement the connector. Route the key only to the private Connector/MCP environment when integrating it.
