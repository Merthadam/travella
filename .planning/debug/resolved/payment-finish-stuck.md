---
status: resolved
trigger: "Immediately after Pay, authorized payment remains on checkout with unchecked consent and disabled Finish test booking"
created: 2026-11-03
updated: 2026-11-03
---

# Payment authorization does not finish booking

## Symptoms
- Expected: Pay authorizes payment, finalizes the supplier booking, then displays saved confirmation.
- Actual: screenshot shows already-authorized message, unchecked consent, disabled Finish test booking.
- User confirmed this happens immediately after Pay, without refresh/reopen.
- Both checkout modes use LiteApiPayment; accommodation impact requires verification.

## Current Focus
hypothesis: Confirmed: a failed booking readback leaves flights ready_to_book with consent reset and no polling, even when the supplier has already confirmed it.
next_action: None. Fix and applicable verification complete.

## Evidence
- LiteApiPayment marks its callback completed and deletes the encrypted guest draft whenever onAuthorized resolves, regardless of booking outcome.
- Flight perform('book') resets consent before awaiting the request and catches errors by returning null. Flight finishPayment discards that result.
- Shared payment renders recovery immediately on authorization and uses consent as an initialization dependency, so starting flight booking replaces payment session state.
- A screenshot alone cannot establish whether provider redirect, booking failure or state-reset race occurred; checking runtime records next.
- Actual tab showed an error above the screenshot: “Couldn’t verify the mock booking.” Encrypted checkout journal already contained a booking ID; read-only supplier GET returned CONFIRMED with sandbox ticket metadata and the exact EUR185.27 total. No new booking/payment was submitted.
- Clicking existing “Check booking status” recovered the confirmation and saved it to the user's Plan. A separate authenticated browser reopened the saved document successfully.
- Exact original upstream error was not retained (access logging disabled). Missing metadata during asynchronous ticketing is plausible, not established. No backend sandbox/identity checks were relaxed.
- Official LiteAPI webhook documentation states flight confirmation is asynchronous. Fix tolerates any transient booking/readback response failure by checking the existing receipt.
- New regression cases fail on the original implementation; focused updated suite passes 52 tests. Flight recovery traverses book failure → status failure → confirmed with exactly one book call.
- Shared payment no longer reinitializes on internal consent reset, shows booking progress, and deletes recovery data only on confirmed outcome. Parent callbacks return booking outcomes and release busy state even after payment UI unmounts. Both hooks clear recovery data on confirmed status readback.

## Verification plan
Preserve screenshot, reproduce using isolated test fixtures/Plans, fix shared completion outcome contract, exercise flights and accommodation in Chrome DevTools as example account, run focused and relevant regressions, capture responsive success/recovery evidence, clean only created records. Existing no-prototype choice applies. Execute GSD debug inline under skill's no-automatic-agent fallback.

## Resolution

Flights now move to unresolved status after a book/readback failure and poll the original receipt through temporary status errors. Both parent callbacks return outcomes and release busy state after payment unmount. Shared payment initialization survives internal consent reset but rechecks authorization on renewed traveler consent; only confirmed outcomes delete recovery drafts. Confirmation readback in either hook also cleans up drafts.

Final 348 regression tests passed, 12 existing fixture skips; build passed. Real authenticated Chrome DevTools journeys for desktop flight and mobile accommodation each used one actual sandbox book request, dropped its HTTP200 response, failed one status attempt, then automatically displayed and saved the real confirmation. Stay recovery data survived failure and was cleared on confirmation. Both saved confirmations reopened; temporary Plan deleted with404 readback. Original user's EUR185.27 booking recovered and preserved. Rebuild readiness and changed-source hashes verified.

Evidence: `artifacts/testing/2026-11-03-payment-finish/verification.md`. Exact original supplier failure remains unknown; no backend verification was relaxed. Live wallets/3DS not exercised. No push or merge.
