---
status: complete
type: quick
---

# Implement approved flight review C

User selected C: “c is absolutely perfect lets implement it”. Prototype source is preserved on `prototype/flight-review-261030` at `4bdfdbf`; approved screenshots copied to `artifacts/testing/2026-10-30-guided-flight-review/plan/`. Implementation branch starts from the same main baseline, `3ca6c95`, without prototype code.

1. Replace FlightDetails with production two-step itinerary/fare review matching C. Use actual immutable offer data, retain provider/source/expiry/earlier-search labels, currency and excluded taxes, explicit choose/discuss callbacks, eligible sandbox checkout, booked and missing-token states. Keep native modal focus/Escape behavior, visible price/action footer, responsive and theme-aware styles. No backend or checkout transaction changes.
2. Update affected journey tests to review the fare before choose/discuss/checkout. Verify exact references/tokens, reversible step navigation without mutations, missing facts, live expiry, disabled actions, and focus restoration. Run affected travel tests and production build.
3. Rebuild the canonical local Docker stack, verify example-account authentication and source hashes, then use isolated Chrome DevTools MCP to exercise real search → details → fare → existing checkout review, secondary action confirmation, back/close, responsive layouts, and applicable unavailable states. Capture screenshots, console/network outcomes, and limitations. Commit implementation and GSD/evidence records.

Acceptance: C's two stages and hierarchy match the selected design; step changes perform no requests/mutations; only explicit actions use original offer references; stale offers cannot be chosen or checked out; long itinerary/fare content does not cover footer or close control; existing stay flow unaffected. No real booking/payment will be submitted during verification.
