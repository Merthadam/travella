# US-006 — Handoff to an external supplier

## User story

As a traveler with a saved provider-backed option in my Plan, I can review its current offer and deliberately continue to the identified supplier, so I can complete booking externally without mistaking Travella's planning record for a booking confirmation.

## Success outcome

After saving an eligible Selected Option through [US-003](../option-selection-and-canvas/README.md), the traveler can request its current offer and, after a final successful recheck, explicitly leave Travella for the verified supplier site. The supplier opens in the same browser tab, so the traveler may use browser Back to return to their Plan.

Travella retains the Selected Option and a non-booking handoff record. Returning to the Plan shows **Opened provider; booking status unknown**. Travella never infers that the traveler booked, paid, received a ticket, or otherwise completed a supplier transaction.

## Confirmed interaction model

- A Supplier Redirect starts only from a saved, provider-backed Selected Option with a functional provider handoff. Search results, comparison entries, and Custom Map Pins cannot start one.
- The traveler may select **Refresh current offer**. Refresh is traveler-initiated; Travella does not perform periodic background availability or price refreshes in the MVP.
- A refresh presents current availability, price, and material terms without silently changing the saved Selected Option.
- Immediately before the traveler leaves Travella, it performs a mandatory final provider recheck.
- If the final recheck finds changed price, availability, or other material terms, Travella stops the handoff. The traveler must explicitly accept the new terms before Travella updates the Selected Option and lets them continue.
- If the option is unavailable, Travella does not redirect. The Selected Option remains in the Plan and is clearly marked unavailable until the traveler refreshes it, replaces it, or removes it.
- Before navigation, Travella presents a final handoff view with the provider name, verified destination domain, just-rechecked price and material terms, and a clear statement that Travella is not booking or confirming anything.
- The traveler explicitly chooses **Continue to [provider]** from that final view. The external supplier opens in the same browser tab.
- Travella uses only a server-generated handoff URL whose destination host is verified for the named provider. It never follows a browser-supplied or free-form supplier URL.
- When Travella successfully starts the browser handoff, it saves a handoff record with the provider, checked offer details, and time of handoff. Its only MVP status is **Opened provider; booking status unknown**.
- If Travella cannot create the verified handoff, it keeps the traveler in the Plan, states that no provider site was opened, offers **Retry**, and saves no handoff record.
- Returning with browser Back or reopening the Plan restores the saved Selected Option and handoff record. It does not establish a booking outcome; the traveler may refresh the offer.

## Happy-path flow

1. An authenticated traveler opens a Draft Plan with a saved, provider-backed Selected Option.
2. The traveler opens the option's details and chooses **Refresh current offer** when they want updated price, availability, or material terms.
3. Travella obtains the current offer from the connected provider and presents it without silently changing the saved selection.
4. The traveler chooses to book with the identified provider.
5. Travella performs a final provider recheck for that exact option.
6. Travella shows the final handoff view: provider identity, verified domain, current price and material terms, and the external-booking notice.
7. The traveler explicitly selects **Continue to [provider]**.
8. Travella saves the non-booking handoff record and opens the verified supplier site in the same browser tab.
9. The traveler completes, abandons, or otherwise continues the supplier process outside Travella.
10. On browser Back or later Plan reopening, Travella shows the saved selection and **Opened provider; booking status unknown**, with **Refresh current offer** available.

## In scope

- Starting an external supplier handoff only from an eligible saved Selected Option.
- Traveler-initiated offer refresh and a mandatory final provider recheck.
- Explicit acceptance of changed material terms before updating the saved Selected Option and proceeding.
- Blocking a handoff for unavailable options while retaining and marking the saved Selected Option as unavailable.
- A clear final handoff confirmation that identifies the provider and its verified domain and states Travella's non-booking role.
- Server-generated, provider-verified external handoff URLs.
- Same-tab supplier navigation, browser-Back return, and Plan reopening behavior.
- A durable, non-booking handoff record containing provider, checked offer details, time, and unknown booking status.
- Retry behavior when a verified handoff cannot be created.

## Out of scope

- Booking completion, payment, passenger or driver details, provider account login, tickets, receipts, and supplier booking confirmation.
- Cancellation, change, refund, loyalty, insurance, ancillary, or customer-support management for supplier bookings.
- Inferring or polling a booking outcome after redirect.
- Periodic or background offer rechecks.
- Redirects from unsaved search results, comparisons, Custom Map Pins, or browser-supplied URLs.
- In-app supplier checkout, including connector-powered or embedded checkout experiences. This is planned for a later release when provider access supports it.
- Importing booking emails, tickets, or attachments into a Plan. A later booking-document import and secure storage story will define that capability.
- Provider-specific integration mechanisms, URL formats, API schemas, access terms, retention rules, or domain-verification implementation.

## Acceptance criteria

1. Only a saved provider-backed Selected Option with a functional supplier handoff can start a Supplier Redirect.
2. A search result, comparison entry, Custom Map Pin, or arbitrary browser-supplied link cannot start a Supplier Redirect.
3. A traveler can explicitly request **Refresh current offer**; Travella performs no periodic background refresh in the MVP.
4. Refresh results do not silently change the saved Selected Option.
5. Travella rechecks the exact option immediately before displaying the final handoff confirmation.
6. If price, availability, or other material terms have changed, Travella prevents handoff until the traveler explicitly accepts the revised offer.
7. Accepting the revised offer updates the saved Selected Option to the accepted terms before the traveler can continue.
8. If the final recheck reports the option unavailable, Travella does not redirect and leaves the Selected Option saved and visibly unavailable.
9. The final handoff confirmation identifies the provider, shows its verified destination domain and the just-rechecked terms, and says that Travella is not completing or confirming the booking.
10. Leaving Travella requires a separate explicit **Continue to [provider]** action after the final recheck.
11. Travella opens only a server-generated handoff URL whose host is verified for the named provider.
12. The supplier site opens in the same browser tab.
13. Once Travella starts the handoff, it saves a record with the provider, checked offer details, handoff time, and the status **Opened provider; booking status unknown**.
14. Browser Back and later Plan reopening restore the saved selection and handoff record but never imply a booking outcome.
15. If creating the verified handoff fails, Travella keeps the traveler in the Plan, says no provider site was opened, offers Retry, and creates no handoff record.
16. No UI, saved record, or recovery path describes a redirect as a booking confirmation or promises a ticket, receipt, or other supplier outcome.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Entry point | Start a handoff only from a saved Selected Option. | Booking handoff follows an intentional Plan choice, not transient research. |
| Offer freshness | Refresh only on traveler request, plus one mandatory recheck before handoff. | Keeps provider calls intentional while ensuring the offered handoff is current. |
| Changed offer | Require explicit traveler acceptance before updating the saved option and continuing. | A changed offer must not silently become a new Plan decision. |
| Unavailability | Retain the Selected Option but mark it unavailable and block redirect. | The Plan preserves the traveler's context without overstating inventory. |
| Final confirmation | Show provider, verified domain, current terms, and Travella's non-booking role before a separate Continue action. | The traveler knows where they are going and that supplier checkout remains external. |
| Redirect safety | Use only server-generated URLs for verified provider hosts. | Prevents a handoff from being redirected to a tampered or lookalike destination. |
| Navigation | Open supplier checkout in the same browser tab. | Browser Back gives the traveler a simple path back to their Plan. |
| Handoff record | Save provider, checked offer details, and time with an unknown booking status. | Preserves useful context without claiming knowledge Travella does not have. |
| Booking status | Never infer a booking, payment, ticket, or receipt from the redirect. | The supplier, not Travella, owns the external transaction. |
| Future expansion | Plan in-app checkout and booking-document import separately. | Both require provider access and materially different data, security, and consent decisions. |

## Initial state and event contract

This is a product-facing contract, not a final provider or API schema.

| Area | Authoritative saved Plan data | Transient or resumable context | Allowed browser projection |
| --- | --- | --- | --- |
| Selected Option | Traveler-confirmed provider-backed option and accepted material terms | Latest refreshed offer and final-recheck result awaiting acceptance | Option details, current/unavailable state, and refresh/final-recheck prompts |
| Handoff record | Provider identity, checked offer details, handoff time, and `opened_provider_booking_status_unknown` status | Pending final confirmation and verified handoff creation | Provider identity, unknown booking status, and Refresh current offer action |
| Redirect authorization | None until a handoff starts | Exact authorized option, authenticated traveler and Plan, final-recheck result, and verified provider destination | Final confirmation only; no raw or browser-authored supplier URL |
| Handoff failure | No record when creation fails | Failure reason safe to show and Retry state | No-navigation message and Retry action |

- The CRUD backend is the sole durable-data owner for Selected Options and handoff records. The connector service owns provider requests, final rechecks, provider credentials, and verified handoff generation.
- The browser may request refresh, recheck, confirmation, or retry, but cannot establish the traveler identity, Plan authorization, provider identity, option identity, price, availability, material terms, or redirect destination.
- A final confirmation is bound to the authenticated traveler, authorized Plan, exact Selected Option, successful recheck, and verified provider destination. Replaying it must not produce duplicate handoff records or broaden the redirect destination.
- A returned browser session, refresh, reconnect, or reopened Plan restores the latest consistent saved selection and handoff record. It must continue to state that the supplier booking status is unknown.
- No supplier booking result is written through this story. Future provider-enabled in-app checkout and booking-document import require separate contracts and explicit traveler consent.

## Open implementation decisions

- Exact provider set, handoff capabilities, access terms, and verified-domain registry.
- Exact UI wording, wireframes, recheck timeout handling, and whether a supplier supports a deep link that carries the checked offer.
- Final record schema, offer snapshot fields, retention rules, audit needs, and idempotency-token lifetime.
- Provider-specific handling of currencies, taxes, fees, optional extras, and changes to material terms.
- Future in-app checkout eligibility and the consent, security, and transaction boundaries it would require.
- Future booking-email/document import, including email authorization, document parsing, storage, retention, and deletion rules.

## Related artifacts

- [Travella overview](../../overview.md)
- [Domain glossary](../../../CONTEXT.md)
- [Architecture foundations](../../planning/architecture-foundations.md)
- [US-003 — Select options and maintain the planning canvas](../option-selection-and-canvas/README.md)
- [US-004 — Create, resume, and recover Plans](../plan-lifecycle/README.md)
- [US-005 — Search and compare travel options](../search-and-compare-travel-options/README.md)
