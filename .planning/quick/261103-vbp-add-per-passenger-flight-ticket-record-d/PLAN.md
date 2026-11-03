---
status: complete
---
# Per-passenger ticket record downloads

Prior direct implementation choice applies; GSD quick executed inline.

1. Add a read-only, Plan/subject-scoped flight ticket lookup backed by the encrypted checkout journal. Only fetch an existing owned booking; project passenger index/name, ticket number/status and issue time. Validate sandbox/booking identity and expose no passport, contact, payment or provider payload fields. Do not persist passenger data to Plans or journals.
2. Add a Passenger tickets section to the flight confirmation with explicit load/retry, one download per available passenger ticket and truthful missing/not-issued/error states. Reuse offline HTML document format, printable as PDF, clearly labeled Travella-generated sandbox ticket record, not airline original or boarding pass. Keep main return and itinerary actions.
3. Verify connector isolation/projection, authenticated HTTP ownership/validation, documents escaping and per-passenger isolation, frontend states, real Chrome DevTools desktop/mobile and existing booking reload. Capture plan/before/after evidence, rebuild local stack and compare source hashes. Preserve user Plans; no rebooking/payments.

Acceptance: existing confirmed bookings can load ticket records without a browser receipt; each download contains only its named passenger/ticket plus booking route/reference; absent ticket records never produce invented downloads. No new CRUD mutation path or raw personal payload persistence.

Evidence: artifacts/testing/2026-11-03-passenger-tickets/
