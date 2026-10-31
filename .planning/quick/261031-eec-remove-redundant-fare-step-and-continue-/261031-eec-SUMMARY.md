---
status: complete
---
# Direct checkout from itinerary

User removed the extra fare-review step from approved C. Commit b93cc6f removes the step state/navigation and duplicate recap, exposes eligible checkout immediately, and retains optional fare disclosure plus explicit choose/discuss in the same itinerary view. Existing token, expiry, sandbox and booking guards remain.

244 travel tests passed; 12 external-fixture skips. Build and diff checks passed. Canonical Docker authentication/source hashes passed. Chrome DevTools verified real sandbox direct checkout with matching itinerary/price, collapsed/expanded conditions, desktop/mobile/dark layout, exact choice cancellation, discussion attachment, expired/tokenless recovery and Escape focus. Restored verification Plan was cleaned again. No booking/payment, merge or deployment.

Evidence: [verification](../../../artifacts/testing/2026-10-31-direct-flight-checkout/verification.md). Existing bundle warning, fixture skips and wider Phase18 acceptance unchanged.
