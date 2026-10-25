---
type: quick
status: planned
---
# Clickable travel summary cards

User requests the whole Flights container be clickable and the separate Explore row removed. Apply consistently to shared Flights/Accommodation cards. Prior session choice to skip prototype alternatives remains in force. A static layout sketch was captured before implementation.

1. Stretch the existing native button across the ready card; retain accessible name, disabled/provider gating, callbacks and focus-return selector. Remove visible Explore text/arrow/divider row. Add whole-card hover and focus treatment. Retain booking status and sandbox/provider note.
2. Run existing PlanningCanvas tests and build; rebuild local stack, verify authentication and source hashes.
3. Chrome DevTools: click card header/body/padding, open flights and stays, return focus, keyboard activation, mobile and provider state checks. Save and inspect screenshots and console/network evidence.

No backend or durable Plan changes. Evidence: artifacts/testing/2026-10-25-clickable-travel/.
