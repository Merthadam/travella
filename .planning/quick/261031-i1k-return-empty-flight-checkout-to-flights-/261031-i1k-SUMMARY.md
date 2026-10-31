---
status: complete
---

# Remove empty flight checkout

Implemented in `6dbeb32`. Missing checkout context now returns to Flights with a brief notice and clears the checkout URL/history marker. No empty checkout content renders. Prepared offers, saved itineraries, receipt recovery and error states remain intact.

291 tests passed, 12 existing fixture/SSE skips; build/diff checks passed. Rebuilt canonical stack and checked source hashes. Actual Chrome authenticated desktop/mobile direct entry and checkout refresh returned to Flights; existing sandbox reservation reopened at Review & pay. Fresh View flight cleared the notice. No payment/final booking submitted. Test-owned Plan cleaned up.

[Verification and screenshots](../../../artifacts/testing/2026-10-31-empty-checkout/verification.md). No push/merge/deploy; wider phase acceptance unchanged.
