# Replace flight booking with selected guided checkout

Selected design: user explicitly chose A's guided checkout with C's itinerary-style confirmation, and authorized replacing the old booking UI. Prototype source is `prototype/flight-checkout-20261027` / `faf9a05`.

## Tasks
1. Replace the legacy inline flight checkout with a dedicated full-page view from Flights, preserving real scoped verification, at-most-once prebooking, final fare confirmation, sandbox booking/readback and interruption recovery. Add transient fictional passenger/contact forms; do not store them in profiles, Plan snapshots, URLs or technical checkout receipts. Use the current sandbox payment method. Seat/bag purchases and payment SDK are not integrated: show actual allowance and explicit unavailable states, never fake selectable inventory or charge fake extras.
2. Implement a document-style confirmed itinerary with offline download and print, backed by bounded non-personal flight details in the existing CRUD-owned Plan snapshot. Reopen saved receipts even without a checkout token. Prevent a second flight booking through the UI when the Plan already holds one. Keep existing stay checkout. Remove flight prototype runtime wiring and the superseded flight component, preserving source on its branch.
3. Verify focused frontend and connector tests, actual CRUD HTTP save/read/update/clear and access/validation boundaries, build, and example-account Chrome DevTools full journey from the Flights component. Inspect desktop/mobile screenshots, recovery, errors, console/network and actual sandbox outcome. Keep truthful evidence and record any provider blocker.

## Acceptance and evidence
- Clear steps: flight review, passengers, seats, baggage, final review/payment; a separate confirmed document and Back to Plan.
- Actual itinerary and price come from verified/provider results; never claim success before provider readback.
- Passenger details remain transient; durable itinerary excludes names, contacts, documents, cards, handles and raw payloads.
- One saved flight booking per Plan; old summaries still readable. Saving retains existing revision/authorization/idempotency checks.
- Design evidence: `artifacts/testing/2026-10-27-flight-checkout-prototypes/plan/`. Implementation: `artifacts/testing/2026-10-27-guided-flight-checkout/`.
- No production merge or deployment is requested. Implement on `feature/guided-flight-checkout`.
