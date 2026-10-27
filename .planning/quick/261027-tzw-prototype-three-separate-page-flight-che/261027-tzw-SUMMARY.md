---
quick_id: 261027-tzw
status: complete
date: 2026-10-27
scope: prototype creation and browser verification
production_selection: pending
---

# Three separate-page flight checkout prototypes

Built three dev-only structures under the authenticated Plans route: A guided steps and summary, B expandable worksheet and compact total, C itinerary document and editor. Each simulates flight review, passenger/contact forms, seat selection, baggage, final review, payment, confirmation and return to a mock Plan. Downloadable HTML itinerary and browser print action provide a useful sample takeaway.

Confirmed user answers: no reusable passenger profiles/remember-me; useful receipt/itinerary now, complete Plan export later. This records a product preference, not a legal ruling. The user explicitly requested prototypes; no variant has been selected.

Build and required Chrome DevTools desktop/mobile gates passed. Checked all three full flows, payment decline/retry, pending confirmation, validation, price re-consent, selected-seat pricing, download contents, Plan receipt reopening, variant keyboard controls and reload reset. Native PDF output was not exercised. Provider/payment calls and durable mutations are deliberately stubbed.

Evidence: `artifacts/testing/2026-10-27-flight-checkout-prototypes/verification.md` and its linked screenshots. Preview: `http://localhost:5196/plans?prototype=flight-checkout&variant=A` (B/C through query or bottom switcher). Run: `npm --prefix frontend run prototype:checkout`.

Primary-source branch: `prototype/flight-checkout-20261027`. No merge/push/deployment. The question remains open: which layout or combination should guide the production implementation? Preserve the prototype branch; record the user's choice here before rewriting the selected design for production.
