# Flight checkout: seats, baggage and sandbox card payment

Verified 2026-10-28 on `feature/guided-flight-checkout`, using the isolated `travella-flight-checkout` Docker project at http://localhost:5197. The canonical 5174 stack was not changed. Continued the existing inline GSD debug session and the user's selected guided checkout + itinerary document design.

## Delivered behavior

- Real LiteAPI seat and baggage inventory per passenger and flight, optional selections, removal, provider repricing, and renewed final consent.
- Provider identifiers remain in the encrypted connector journal. Full replacement updates preserve attached seats even when LiteAPI removes them from its available inventory or reissues an ID for the same seat. Stale checkout revisions cannot book; uncertain service updates require readback. A cross-process lock serializes booking and ancillary mutations.
- LiteAPI prebooking requests a sandbox payment intent. Stripe hosts the card field and validates/authorizes test payment; Travella sends the provider transaction reference to finalize booking. Card details never enter Travella APIs or storage. Provider-confirmed status is required for a saved receipt.
- Saved/downloaded documents retain non-personal seat/bag summaries by passenger index, plus the provider's final total.

## Executed verification

| Check | Observed result |
| --- | --- |
| Original regression | New test failed because a returned seat had no selectable control. It now passes. |
| Frontend | `cd frontend && npm test -- src/features/plans/travel src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`: 76 passed, 12 existing external-fixture tests skipped. |
| Backend + actual CRUD | `uv run pytest services/mcps/tests/test_flight_checkout.py services/mcps/tests/test_liteapi.py services/agent/tests/test_travel_api.py services/crud/tests/test_canvas_mock_booking.py -q`: 84 passed. |
| Production build | `cd frontend && npm run build`: passed. Existing large-chunk advisory remains. |
| Source/runtime consistency | Changed frontend and connector file hashes match `/app/` in this dedicated stack after rebuild. |
| Example-account Chrome | Authenticated using the configured example account, through an isolated Chrome DevTools MCP session. Credentials were loaded privately. |
| Full desktop journey | Canvas Flights → provider search → Nuitée Air → dedicated checkout → test passengers → two seats (outbound + return) → one 23kg checked bag → card payment → provider confirmation → saved receipt. |
| Real provider repricing | EUR 354.80 base → EUR 374.80 for two EUR 10 seats → EUR 409.80 after a EUR 35 checked bag. |
| Card rejection | Test card ending 0002 produced “Your card has been declined.” No booking request was sent. |
| Card success | 4242 test card authorized; LiteAPI confirmed reference `01a18172-7670-7d43-9af5-e9e4d0c5d25c`. Receipt saved all three extras and EUR 409.80. |
| Persistence/export | Reloaded the saved receipt at 390px width, verified all extras and total via actual canvas GET, clicked Download itinerary, and checked the HTML includes seats/bags while excluding sensitive fields. |
| Mobile selection | Supplementary isolated mount of the actual FlightCheckout component inside the authenticated app, with a second task-owned Plan and real LiteAPI search/prebook/services. Assigned two passengers different seats, verified the first passenger's seat is disabled for the second, added a checked bag, and applied provider repricing. No mock provider responses. No second payment/booking. |
| Console/network | Investigated and fixed the initial seat-catalog/baggage failure. Final service calls succeeded. Final console contained only the existing Lit development-mode warning. Stripe validation/decline requests were expected test failures. |

The CRUD tests use the actual FastAPI handlers and database fixtures: challenge → create/save → GET persistence → update/read → clear/read, idempotent replay, stale revision 409, missing resource 404, unauthorized 401, foreign-owner 404, and invalid/sensitive payload 422. Added extras to the full persistence sequence and verified card fields in extras are rejected without writes.

The 12 skipped tests belong to the existing optional browser-fixture suite; they were not used as evidence for this change. Browser verification above was executed separately. Existing Python deprecation warnings and Vite chunk advisory do not affect these checks.

## Visual evidence

- [Approved design](plan/approved-guided-design.png)
- Before: [seats](plan/before-05-seats-desktop-dark.png), [payment](plan/before-06-payment-desktop-dark.png)
- [Desktop seats](implementation/01-seats-desktop.png), [desktop baggage](implementation/02-baggage-desktop.png)
- [Hosted card form](implementation/03-card-desktop.png), [declined card](implementation/04-card-declined.png)
- [Desktop confirmation](implementation/05-confirmation-desktop.png)
- [Saved Plan](implementation/11-saved-plan.png)
- [Mobile confirmation](implementation/06-confirmation-mobile.png), [saved extras](implementation/07-receipt-extras-mobile.png)
- [Mobile seat selection](implementation/08-seats-mobile.png), [mobile baggage](implementation/09-baggage-mobile.png), [mobile card form](implementation/10-card-mobile.png)

Screenshots were opened and visually inspected. The receipt and picker layouts had no horizontal page overflow at 390px. Fields and controls remained readable. The final seat styling overrides inherited pill-button styling to retain distinct seat outlines. Reopened selections stayed highlighted after provider inventory IDs changed (one matching control, `aria-pressed=true`). The temporary browser harness initially imported a second React copy after a rebuild; importing the exact Vite-resolved modules fixed that harness-only error before the final checks.

## Test records and cleanup

Task-owned Plans: `9d51ca02-7e97-48ac-b68d-c7171275c94e` (confirmed desktop journey), `bc3c95da-8bf6-490a-98d6-b2221ffb26e0` (mobile selection only). Both were soft-deleted through challenge/commit; subsequent active GETs returned 404 and deleted-view GETs returned lifecycle `deleted`. Temporary checkout/fixture session keys were removed. Sandbox provider records remain test-only; the second prebook was never paid or booked. No unrelated Plans, containers, volumes, or worktrees were deleted.

## Provider references

- [LiteAPI prebook services](https://docs.liteapi.travel/reference/post_flights-prebooks-prebookid-services): full replacement selections and refreshed payment intent.
- [LiteAPI flight booking](https://docs.liteapi.travel/reference/post_flights-bookings): transaction payment and final booking semantics.
- [LiteAPI sandbox payment configuration](https://docs.liteapi.travel/docs/user-payment)
- [Stripe hosted card confirmation](https://docs.stripe.com/js/payment_intents/confirm_card_payment)
