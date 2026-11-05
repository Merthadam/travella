---
status: resolved
trigger: "when i mock booked a hotel it did not get put into the global google maps"
created: 2026-11-05
updated: 2026-11-05
---

## Symptoms

Confirmed mock hotel booking appears in accommodation state but not the main Planning Canvas Google map. Expected: the confirmed hotel's actual location appears and remains after reload.

## Current focus

Resolved and verified in the canonical local runtime. Existing booked hotel recovered and persisted on the main map.

## Evidence

- `usePlanningCanvas.updateMockBooking` updates the accommodation summary only.
- Saved stay reservation schema contains hotel ID and address, but no geographic coordinates.
- Main map renders saved map pins, independent of accommodation booking summary.
- Existing example Plan confirms Internacional Design Hotel, while the main map contains only three activity/food places. The stored reservation has an exact LiteAPI hotel ID but no coordinates.

## Resolution

Preserve validated provider coordinates through encrypted offers, prebook receipts and the saved reservation. On confirmation, add one stay-category map pin through the existing canvas autosave. Preserve activity pins and explicit traveler edits/removal; matching cancellation removes the managed hotel pin. For legacy confirmations, retrieve location by the exact hotel ID and discard stale, mismatched or missing results. Preserve recovered coordinates when older status receipts arrive.

## Checks so far

- 85 frontend tests passed (PlanningCanvas, StayCheckout, useBookingSync).
- 86 backend tests passed (provider checkout/confirmation, CRUD reservation and mock booking, authenticated body limits).
- Production build passed; existing bundle-size warning remains.
- Corrected an outdated proxy test expectation to include existing normalized guest/contact defaults; no proxy production behavior changed.
- Authenticated Chrome confirmed exact provider lookup, autosave, four global pins including one hotel, matching marker/list selection, reload persistence and narrow layout. No post-reload console errors or failed network requests. App and connector source hashes match. Startup auth 503 resolved; browser sign-in and independent auth checker passed.
- Evidence: `artifacts/testing/2026-11-05-booked-hotel-map-pin/verification.md`.

## Verification plan

Add focused regression coverage, exercise affected real HTTP handlers if the saved schema changes, and confirm booking/map/reload in authenticated Chrome DevTools. Capture before and after screenshots under `artifacts/testing/2026-11-05-booked-hotel-map-pin`.
