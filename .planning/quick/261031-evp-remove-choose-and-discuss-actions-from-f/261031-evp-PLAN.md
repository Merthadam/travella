---
status: complete
---
# Remove secondary actions from flight review

User explicitly removes Choose for trip and Discuss flight from the current approved flight-review view. Keep the existing itinerary, optional fare conditions and direct checkout design. No new prototype exploration needed for this same-session refinement.

1. Remove the two controls, obsolete callbacks/helpers and their unused CSS from FlightDetails; stop passing those callbacks to FlightDetails. Keep choice/discussion flows elsewhere intact. Update existing regression tests to use retained comparison entry points where they test choice contracts.
2. Run affected travel tests/build. Rebuild canonical Docker app and verify auth/source hashes. Inspect desktop/mobile flight review and checkout transition through authenticated Chrome DevTools. Preserve before/after evidence and clean the isolated verification Plan.
3. Commit source and evidence; update STATE. No booking/payment, merge or deployment.
