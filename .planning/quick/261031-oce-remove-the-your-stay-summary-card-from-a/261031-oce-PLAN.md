---
status: complete
---

# Remove the accommodation checkout summary card

User requested removal of the entire pictured YOUR STAY card. Prototype alternatives were offered; the user explicitly selected direct removal.

1. Remove the Summary component and render from StayCheckout, and use a single-column checkout layout. Preserve room terms, guest entry, review total, consent and confirmed receipt.
2. Run existing stay/flight checkout tests and frontend build. Rebuild canonical Docker stack, verify auth and source hashes.
3. Verify the example-account stay journey through review, guests, and payment review in Chrome DevTools on desktop/mobile, including navigation, loading/error states where feasible. Save before/plan/implementation evidence and sanitized console/network outcomes. Do not submit a reservation.

Scope: frontend/src/features/plans/travel/StayCheckout.jsx and stay-checkout.css.
Acceptance: no YOUR STAY summary aside or vacant column; all three checkout steps usable; total and exact consent still visible before confirmation.
