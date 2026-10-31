---
status: complete
---
# Remove flight review secondary actions

Implemented in 1d75f77. Removed Choose for trip and Discuss flight from FlightDetails and cleaned unused helper/callback/CSS code. Comparison action contracts remain covered through their retained entry point.

250 travel tests passed, 12 fixture skips; build, canonical Docker auth/source hashes and authenticated Chrome desktop/mobile review → checkout checks passed. No flash regression. Test Plan cleaned; no booking/payment or merge.

Evidence: [verification](../../../artifacts/testing/2026-10-31-flight-review-actions/verification.md).
