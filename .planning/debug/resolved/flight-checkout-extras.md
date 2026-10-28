---
status: resolved
trigger: "Booking steps 3–5 lack seat/baggage choices; final booking also reported"
created: 2026-10-27
---

## Symptoms and scope

The user clarified that seats and baggage choices were missing. The approved prototype included these choices; the previous implementation deliberately left them disconnected. The user confirmed that the payment/card-entry experience was also missing. Keep the selected guided layout and sandbox-only boundary, with transient fictional passengers and useful saved receipts. No additional prototype decision is needed.

## Current focus

next_action: none; fix and verification complete.

## Acceptance

- Render actual available seats and bags per traveler/flight; no invented provider availability.
- Apply or clear selections through the scoped Connector; keep latest provider total and require consent after changes.
- Carry confirmed selections into the receipt without passenger personal data.
- Final booking must use the latest reservation/payment state, recover uncertainty and show confirmed status only after readback.
- Run focused regression and actual CRUD tests; authenticated Chrome DevTools desktop/mobile journey, screenshots, console/network, save/reload and cleanup.

## Evidence

- Prior implementation tests explicitly assert the absence of seat buttons/card fields. User now confirms these omissions are the reported problem.
- LiteAPI documents `servicesAttachable` on prebook and full-replacement `selectedServices` via POST `/flights/prebooks/{prebookId}/services`, returning updated total and payment intent.
- Run inline through gsd-debug; no subagent requested.

## Root cause and fix

The seat and baggage steps were explicit placeholders and prebooking used `usePaymentSdk: false`. The failing component regression reproduced missing choices from a supplied catalog; there was no ambiguous alternative cause to investigate.

Connected the provider's actual ancillary catalog and full-replacement service API, refreshed payment intents and prices, and hosted Stripe test-card entry. Scoped encrypted inventory stays in the connector journal; selection revision checks and a cross-process lock prevent stale-total booking. Card details never reach Travella APIs, storage, or saved receipts. Durable receipts contain only allowlisted ancillary summaries by passenger index.

Live testing exposed an additional provider behavior: attached seats disappear from the available catalog. Preserve their private service references until detached, so adding bags does not lose existing seats. Regression fixture now reproduces this behavior. Observed provider totals: 354.80 EUR base → 374.80 EUR for two seats → 409.80 EUR with a 23kg checked bag. Stripe declined-card flow showed an error and sent zero booking requests.

## Final verification

- Real hosted Stripe test-card decline: error displayed; no booking submitted.
- Real successful Stripe sandbox authorization followed by provider-confirmed booking; all three extras and EUR 409.80 persisted and survived reload/export.
- Refreshed inventory can reissue IDs for selected seats. Deduplicate by physical seat/segment while retaining attached identifiers; verified reopened highlight and disabled assignment to another passenger.
- 76 frontend tests passed; 12 existing optional fixture tests skipped. 84 backend/API/CRUD tests passed. Production build passed.
- Authenticated Chrome DevTools desktop and mobile interactions, reviewed screenshots and console/network checks complete. Both task-owned Plans soft-deleted and verified absent from active GETs.
- Evidence: `artifacts/testing/2026-10-27-flight-checkout-extras/verification.md`.
