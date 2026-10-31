---
status: complete
---
# Direct checkout from flight itinerary

User explicitly removes the second fare-review step from approved C. Continue current design refinement without another prototype offer.

1. Keep C itinerary header, legs and persistent total footer. Remove step navigation/state and duplicate route recap. Make Continue to checkout immediately available when eligible. Retain optional expandable baggage/fare terms, choose/discuss and sandbox/observation labels in the same view. Preserve exact callbacks, expiry, missing token, booking and integration guards.
2. Adapt affected tests to one-step behavior; assert opening/expanding conditions does not mutate and direct checkout uses exact token. Run travel tests/build. Rebuild canonical stack with auth/source verification.
3. Authenticated Chrome DevTools: real sandbox search to direct checkout, terms expansion, secondary actions, responsive layout, expired/tokenless recovery and Escape. Capture and inspect evidence; clean only verification Plan. Commit source and records.
