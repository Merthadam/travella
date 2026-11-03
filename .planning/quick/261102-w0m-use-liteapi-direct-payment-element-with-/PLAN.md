---
status: complete
---
# LiteAPI direct Payment Element and searchable billing country

User approved LiteAPI's supported direct Stripe Elements integration. Existing no-prototype choice applies. Execute inline with GSD quick and mandatory Travella browser gates.

1. Replace the shared SDK iframe with Stripe Payment Element using LiteAPI's existing sandbox key/intent. Hide only its billing-country control; reuse SearchSelect with ten choices per page and search. Submit the selected ISO country directly to Stripe. Preserve provider-controlled amounts, consent, verified authorization, retry and return recovery.
2. Add focused tests for country selection/binding, duplicate and stale callbacks, declines/retry, authorization checks and redirect recovery. Run travel/canvas regression and build.
3. Rebuild canonical localhost:5174; authenticate example account with Chrome DevTools. Exercise flight/stay checkout, country search, keyboard/no-match states, desktop/mobile, payment/recovery where feasible. Capture screenshots, inspect console/network, clean only temporary records, document results and commit scoped files.

Acceptance: no native billing-country dropdown; no custom card inputs; selected country reaches confirmation; typing unselected text cannot change it; consent and payment verification remain required; country changes do not reset card entry; no horizontal overflow.

References: https://docs.liteapi.travel/docs/direct-stripe-integration-stripe-elements ; https://docs.stripe.com/js/elements_object/create_payment_element ; https://docs.stripe.com/js/payment_intents/confirm_payment
