# Three accommodation payment layouts

User wants step 3 to feel like a normal card checkout and explicitly chose three interactive layouts before implementation. Use the prototype and Travella testing skills; production checkout remains unchanged until selection.

Design question: how should card entry, total, booking review and consent be arranged in step 3?

- A: conventional two-column payment form with compact price/review sidebar.
- B: focused single-column payment form, inline total and collapsible booking details.
- C: concise review document opening a payment drawer, separating final review from card entry.

Build on the authenticated /plans host in isolated prototype/stay-payment-20261101, port 5200. Keep real header/auth, fictional stay context, memory-only form state, switcher/URL variants and a clear simulation label. Card fields accept documented test fixtures only. Simulate loading, decline/retry, authentication and successful completion; never call payment or booking providers.

Inspect all three in Chrome DevTools using the example account at desktop and narrow mobile widths. Verify keyboard switching, form validation, billing fields, review disclosure, successful/declined/authentication states, responsive controls and no booking/payment mutations. Capture plan screenshots under artifacts/testing/2026-11-01-stay-payment-prototypes/plan, inspect console/network, build, commit prototype branch and root evidence. Ask user to select after presenting working links.

Integration finding: current stays use ACC_CREDIT_CARD with usePaymentSdk false; existing FlightPayment uses hosted Stripe test-card fields. LiteAPI officially supports usePaymentSdk true with paired prebook/transaction IDs and TRANSACTION_ID booking. Reuse that proven boundary in eventual production work; no provider integration is part of these throwaway variants.

Sources: https://docs.liteapi.travel/docs/user-payment and https://docs.liteapi.travel/docs/direct-stripe-integration-stripe-elements (read 2026-11-01). Direct Stripe keys require provider access; current flight wrapper configuration already handles sandbox setup. Requests/guest form from selected A remain separate step 2.
