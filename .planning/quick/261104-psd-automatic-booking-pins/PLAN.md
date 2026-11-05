---
status: complete
date: 2026-11-04
---
# Automatically save confirmed booking locations

User explicitly replaces the earlier separate map-confirmation requirement: remove all checkout map controls and automatically place confirmed accommodation and destination airports in the Plan. Existing no-prototype choice remains applicable. Execute inline through GSD quick.

1. Remove confirmation map actions, review UI and dedicated View navigation plumbing.
2. Resolve confirmed booking locations in the canvas lifecycle, reuse exact identities and unambiguous same-name nearby existing pins, and save through existing revision-aware autosave. Persist an optional synchronization marker with each booking so reload/status recovery does not undo a later manual pin removal. Backfill older confirmed bookings once; never invent missing coordinates or exceed the pin limit.
3. Test automatic add/reuse/reload/removal, Plan switching, asynchronous lookup and failed-save retry; test the new summary field through real FastAPI persistence. Verify actual example-account confirmation and map in Chrome DevTools, including the user's already-booked Geneva demo. Preserve unrelated debugging artifacts and user data.

Evidence: artifacts/testing/2026-11-04-automatic-booking-pins/. No new booking/payment is required to exercise saved-confirmation reconciliation.
