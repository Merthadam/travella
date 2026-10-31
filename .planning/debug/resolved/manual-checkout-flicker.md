---
status: resolved
trigger: "there is this small flicker when we go to the manual checkout flow"
created: 2026-10-31
updated: 2026-10-31
---

# Manual checkout transition flicker

## Symptoms

Expected: the approved flight review transitions smoothly into manual checkout.
Actual: user observes a brief flicker on entry after the direct-checkout refinement.
Reproduction: open a manual flight result and Continue to checkout. No reported error.

## Current Focus

Hypothesis: detail dismissal precedes asynchronous workspace shutdown, exposing results; checkout then paints an incomplete title/layout during verification. Need distinguish these with browser frame observations.
Next action: authenticated Chrome DevTools reproduction and render-frame capture before editing source.

## Acceptance

No intermediate results flash or incomplete checkout layout during entry. Provider verification, exact token, error/retry behavior and explicit booking boundary remain intact. Verify actual browser transition, responsive layout, relevant tests and production build; record evidence and clean the isolated verification Plan.

## Evidence and fix

- Real requestAnimationFrame sampling on baseline: at 32ms neither dialog nor checkout; at 66ms incomplete checkout title "Book your flights." and no grid; at 1037ms final title and itinerary grid. The results flash and subsequent layout replacement are both confirmed.
- Keep FlightDetails mounted during verification with an inline status and disabled duplicate actions. TravelSearch verifies the original offer token once, then passes the verified review in memory into checkout. The hook initializes from that response and avoids a duplicate verification request.
- Close/Escape aborts preparation; late responses cannot navigate. Failed verification stays on the itinerary with retry; 401 preserves auth expiry handling. PlanningCanvas waits for workspace shutdown and checks cancellation before changing screen/history.
- 272 frontend travel/canvas tests passed; 12 external-fixture skips. Build passed with existing chunk-size warning. Canonical rebuild/authentication/source hashes and real Chrome desktop/mobile frame verification passed.

## Resolution

The new browser capture goes from original dialog directly to populated checkout (1205ms), with exactly one verify request and no intermediate blank/results frame. Mobile retry likewise passed. Controlled cancellation/error checks passed, source hashes matched the container, and verification Plan was cleaned. Evidence: artifacts/testing/2026-10-31-checkout-flicker/verification.md. No booking/payment or merge performed.
