---
quick_id: 261027-tzw
status: complete
date: 2026-10-27
scope: prototype creation and browser verification
production_selection: A guided checkout with C itinerary confirmation
---

# Three separate-page flight checkout prototypes

Built three dev-only structures under the authenticated Plans route: A guided steps and summary, B expandable worksheet and compact total, C itinerary document and editor. Each simulates flight review, passenger/contact forms, seat selection, baggage, final review, payment, confirmation and return to a mock Plan. Downloadable HTML itinerary and browser print action provide a useful sample takeaway.

Confirmed user answers: no reusable passenger profiles/remember-me; useful receipt/itinerary now, complete Plan export later. This records a product preference, not a legal ruling. The user subsequently approved A's guided flow with C's itinerary confirmation and requested replacement of the old booking; see `DECISION.md`.

Build and required Chrome DevTools desktop/mobile gates passed. Checked all three full flows, payment decline/retry, pending confirmation, validation, price re-consent, selected-seat pricing, download contents, Plan receipt reopening, variant keyboard controls and reload reset. Native PDF output was not exercised. Provider/payment calls and durable mutations are deliberately stubbed.

Evidence: `artifacts/testing/2026-10-27-flight-checkout-prototypes/verification.md` and its linked screenshots. The original prototype preview at port 5196 is stopped; its source and run command remain on the prototype branch.

Primary-source branch: `prototype/flight-checkout-20261027`. No merge/push/deployment. The selected design was rewritten and verified in quick task `261027-uhp` on `feature/guided-flight-checkout`; the prototype branch remains preserved.
