---
status: passed
threats_open: 0
reviewed_commit: 218f740
---
# Scoped shipment review

Reviewed the committed frontend diff from main (7741914) through 218f740, including FlightCheckout, FlightPayment, their tests, flight-payment.css and stripeSandbox.js. Reviewed the unchanged useFlightCheckout and provider flight booking boundary for compatibility. No open security finding was identified in this change; this is not a whole-product audit.

- Card number, expiry and CVC remain in Stripe-hosted iframes. Billing details are passed directly to Stripe, never to the Travella booking request or browser recovery storage.
- Shared loader retains the existing fixed HTTPS SDK/config URLs and requires a pk_test_ key. Intent retrieval and authorization require livemode === false. Processing, unknown and live intents cannot be accepted as authorized.
- Explicit consent, field readiness, in-flight submission locks and existing server receipt/revision checks remain. Already-authorized and lost-response recovery reconcile the same intent before attempting another confirmation.
- No server authentication, authorization, persistence schema or supplier-handoff boundary changed. The provider booking API continues to consume its bound transaction ID.
- Existing focused payment tests and real sandbox browser evidence cover decline/retry, consent and saved confirmation recovery. Saved-canvas inspection found no billing or card data.
- Known local UX limitation: Chrome blocks saved-card autofill on the HTTP development origin. The user was informed and subsequently requested this merge. No change to TLS or browser security settings is included.
