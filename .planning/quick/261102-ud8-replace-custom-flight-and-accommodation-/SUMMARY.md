---
status: complete
---
# LiteAPI SDK checkout

Implementation: aedf4ae.

Replaced custom flight/stay payment forms with shared LiteApiPayment, using the actual LiteAPI SDK unchanged. It owns payment fields, validation and Pay. Existing consent, final total and expandable details remain. The provider's whole-page redirect returns to the correct checkout; original sandbox intent is verified before final booking. Guests/requests survive with an AES-GCM encrypted15-minute draft, bound to Plan/mode/intent and removed after submission. No plaintext payment/contact recovery data.

Incorporates the prior uncommitted accommodation payment prerequisite (sandbox intent/prebook binding, encrypted receipt reuse and layout B). Old split-card implementation superseded. Unrelated prior planning/evidence artifacts remain unstaged.

Chrome DevTools actual sandbox flight decline/retry/confirmation and stay redirect/recovery/confirmation/reopen passed at desktop/mobile. Temporary Plan cleaned.343 regression tests passed,12 existing skips;8 final focused tests;33 backend/API tests; build passed. Evidence: artifacts/testing/2026-11-02-liteapi-payment/verification.md.

Provider limitation: redirect temporarily includes provider parameters; callback scrubs before assets/referrers, never forwards them. Live wallets/3DS not verified. Sandbox only. No main merge requested for this new task; prior PR33 shipment remains complete.
