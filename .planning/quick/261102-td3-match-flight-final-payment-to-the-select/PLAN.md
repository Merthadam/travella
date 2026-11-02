---
status: complete
---
# Match flight final payment to accommodation B

User selected a direct match to accommodation, declining additional prototypes on 2026-11-02. GSD quick initialized; inline execution in existing worktree. Preserve pending accommodation changes.

1. Use accommodation B screenshot as visual plan: centered total/route/dates, expandable booking details and a bordered card-payment form with hosted number/expiry/CVC and billing details. Keep existing flight reservation, extras, consent, provider authorization and recovery contracts.
2. Implement in FlightCheckout, FlightPayment and scoped flight-payment CSS. Shared Stripe loader already exists in pending work; include that prerequisite without shipping unrelated accommodation/backend edits. Update focused regression coverage for hosted fields, declines, recovery and exact confirmation.
3. Verify frontend regressions/build and real example-account Chrome DevTools desktop/mobile flight checkout, expandable review, validation, decline/retry, console/network and screenshots. Use sandbox only. Record any provider/environment blockers honestly.

Evidence: artifacts/testing/2026-11-02-flight-payment/. Existing accommodation B screenshot is the approved design reference. No merge or deployment requested.
