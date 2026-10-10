---
status: resolved
trigger: Flight mock booking does not change the Plan card like accommodation.
---

## Evidence
- User's open Plan shows accommodation Mock booked and flights Not booked.
- Flight confirmation is forwarded only by the mounted checkout component. Closing its detail dialog stops pending polling; loading a Plan does not reconcile its existing checkout receipt. The receipt survives in session storage, but the card stays Not booked until checkout is manually reopened.
- Immediate confirmed checkout already has the correct callback and shared booked card styling.

## Plan / acceptance
Keep confirmed-only semantics and explicit Save plan. Reconcile the Plan-scoped flight receipt when returning to or loading the canvas, independently of the checkout dialog. Continue polling a pending receipt, stop on terminal status, ignore stale Plan responses, and never submit a booking during recovery. Verify closed-checkout/reload recovery and persistence, plus existing accommodation behavior. Use the selected prototype A layout; no new design choice needed.

## Resolution
Flight checkout now delivers a submitted result after its dialog unmounts. Plan-level receipt reconciliation handles return/reload/focus, pending polling and late receipt updates without submitting a second booking. Confirmed-only sandbox state and explicit Save plan are preserved.

## Verification
28 relevant frontend tests pass; production build passes. Chrome DevTools exercised actual sandbox verify/prebook/book, immediate checkout closure, automatic receipt recovery on Plan load, Save plan and reload with the receipt removed. Desktop/mobile screenshots inspected; source hashes match the healthy rebuilt container. Evidence: artifacts/testing/2026-10-10-flight-booked-state/verification.md.
