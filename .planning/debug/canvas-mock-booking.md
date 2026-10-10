---
status: resolved
trigger: "with a booking being done the state of the canvas did not change we have states for those components"
created: 2026-10-10
updated: 2026-10-10
---

## Symptoms
Expected: confirmed sandbox stay checkout updates the accommodation canvas state.
Actual: checkout succeeds, canvas still says Not booked.
Reproduction: confirm a mock stay booking, return to canvas.

## Current Focus
Root cause: checkout had no completion callback, and CRUD only permitted not-booked.
Next action: completed; evidence in artifacts/testing/2026-10-10-canvas-mock-booking/verification.md.

## Evidence
- SandboxCheckout stores the recovery handle but never notifies PlanningCanvas.
- TravelEntry already has booked styling, but live CRUD rejects every booked status.
- Canvas save validates travel labels against trip context; booking details must be separate from those context labels.

## Acceptance
- Confirmed sandbox booking updates accommodation only; pending/errors never claim success.
- Clearly labeled Mock booked, hotel and dates visible, no real reservation claimed.
- Save plan remains explicit; saved state survives reload and regeneration.
- Existing card edits/chat remain usable; tokens and guest data are not persisted in canvas.
- Chrome DevTools example-account journey, screenshots, focused UI and actual CRUD HTTP tests.

## Resolution
Wired confirmed and recovered sandbox results through TravelSearch to the canvas hook. Added distinct mock-booked display and a bounded accommodation-only saved summary. Preserved explicit Save plan, trip labels, revision/authorization contracts, regeneration and concurrent-save safety. Verified provider-backed sandbox checkout in Chrome DevTools, save/reload/recovery/offline retry, desktop/mobile and both themes. 15 frontend tests and 46 Python tests passed; production build passed. No real booking claims or provider handles persisted in canvas.
