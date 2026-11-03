# Clear flight and stay confirmation actions

Implemented in **91e534d**. Both modes share a prominent **Return to my trip** action and explanatory destination copy. Download/print remain secondary. Actions precede the receipt on mobile; failed saving remains an alert and never claims persistence.

Recovered the screenshot's existing stay from its original scoped receipt via status-only lookup and the existing canvas save path. Reload/readback verified the stay and preserved flight. No new booking/payment; historical save-error root cause remains unproven.

LiteAPI booking GET returned two per-passenger ticket records in the inspected sandbox flight. No PDF URL in that response or public ticket-download endpoint found. Current Travella HTML still omits ticket records and is labeled as an itinerary, not an airline ticket. No supplier-document feature added.

Validation: 43 focused tests; 348 travel/canvas regression passes with 12 existing skips; build; source hashes; authenticated Chrome DevTools flight/stay navigation, downloads, saved-state reload, desktop/mobile, and explicitly simulated shared-component error state. Screenshots visually inspected. No relevant console/network errors; existing Lit warning and build chunk advisory remain. Physical print/PDF saving not tested.

Evidence: [verification](../../../artifacts/testing/2026-11-03-confirmation-actions/verification.md), [layout sketch](../../../artifacts/testing/2026-11-03-confirmation-actions/plan/actions-sketch.png), [stay desktop](../../../artifacts/testing/2026-11-03-confirmation-actions/implementation/stay-desktop.png), [flight mobile](../../../artifacts/testing/2026-11-03-confirmation-actions/implementation/flight-mobile.png).

Local app: http://localhost:5174. No merge/push/deployment for this task. Broader phase acceptance unchanged.
