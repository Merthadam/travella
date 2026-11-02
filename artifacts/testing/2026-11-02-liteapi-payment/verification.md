# LiteAPI SDK payment verification — 2 November 2026

Implementation commit: aedf4ae.

User selected LiteAPI's payment SDK, continuing the direct implementation choice. Replaces custom card/billing controls for flights and accommodation with the actual provider SDK's form, country selection, validation and Pay button. Existing totals and expandable booking details remain.

## Design and implementation evidence

Before: [flight form](plan/before-flight-payment.png), [accommodation reference](plan/before-stay-payment.png).

Actual authenticated Chrome DevTools MCP, isolated Chrome, example account, canonical Docker app at http://localhost:5174:
- [Flight desktop](implementation/flight-sdk-desktop.png), [mobile](implementation/flight-sdk-mobile.png), [decline](implementation/flight-sdk-declined.png), [confirmation](implementation/flight-confirmation-mobile.png).
- [Accommodation desktop](implementation/stay-sdk-desktop.png), [mobile](implementation/stay-sdk-mobile.png), [confirmation](implementation/stay-confirmation-mobile.png), [reopened saved confirmation](implementation/stay-confirmation-reopened.png).

All implementation screenshots were visually inspected. Both SDK frames measured320px at390px viewport and had no horizontal overflow. Desktop frame width586px. Provider-managed country, expiry and security-code controls align. Test card data in the decline screenshot is Stripe's public sandbox fixture.

## Executed browser journeys

1. Created temporary Plan, set Lisbon12–17May2027, one traveler, copied the known test canvas without prior bookings. Actual APIs and confirmation challenges used. Two initial fixture setup attempts were rejected because the changes payload/candidate operation was invalid; corrected to the application contract before continuing.
2. Flights: actual BUD–LIS search,58 results; chose Nuitee Air; reviewed fictional passengers, consented to sandbox reservation, continued through seats and baggage. Payment form absent until consent. Actual SDK loaded; card4000000000000002 declined with provider validation. Parent became available for retry, with no booking submission. Reload/mobile recovery reused the same intent. Card4242 authorized€401.47. Already-authorized recovery verified the original sandbox intent, required explicit final consent and finished the same booking. Confirmation saved in Flights.
3. Live testing exposed Stripe's SDK redirect escaping the frame to the top-level page. Fixed the return handler to immediately scrub provider-added query values and recover an allow-listed checkout route. Added encrypted accommodation draft recovery. The corrected redirect was subsequently exercised end to end in the stay journey below; no SDK internals or confirmation methods were patched.
4. Stays: actual Lisbon search,28 results; Melia Lisboa Aeroporto room prebook€835.03. Changed fictional contact/guest to Robin Booker and requested a quiet room. SDK consent saved an AES-GCM encrypted,15-minute recovery draft; storage contained no plaintext name/contact/request or payment secret. Mobile reload restored the exact name and request. Actual4242 payment redirected through the dedicated callback and back to the correct stay checkout. Guest/request data survived; payment showed already authorized. Explicit final consent and Finish test booking produced the provider-confirmed stay. Recovery ciphertext was removed.
5. Both canvas components read back as mock-booked. Saved canvas contained no payment secret, card, billing, contact email or room request. Stay confirmation reopened in a fresh authenticated browser session with its confirmed guest. The first post-booking audit encountered an expired example-account session (401); reauthenticated once and repeated read-back successfully. Final console had only the existing Lit development warning, and final session/Plan/canvas/provider-capability requests returned200. Earlier Stripe local-HTTP warning is expected in sandbox.
6. Deleted only temporary Plan25b17aba-9257-4ee8-9976-172a5d037e4a; subsequent GET returned404. Original fixture Plan untouched.

## Automated checks

- Travel components + PlanningCanvas regression:343 passed,12 existing external-fixture skips. Final additional storage-disabled recovery case and payment tests:8 passed. (An earlier run included a subsequently removed redundant alias-only test.)
- SDK bridge tests verify actual documented constructor options, single initialization, same-origin parent messages, callback query scrubbing and allow-listed top-level returns. Recovery tests cover ciphertext-only storage, wrong-key rejection, expiry, cleanup and disabled storage. Component tests cover consent gating, forged messages, unconfirmed/live intents, retry, decline and resize bounds.
- `uv run --locked pytest services/mcps/tests/test_sandbox_checkout.py -q`:26 passed. Exercises real connector handlers with isolated SQLite and mocked supplier transport: SDK prebook, transaction binding, reuse, expired/invalid responses, idempotency and private-data projection.
- `uv run --locked pytest services/agent/tests/test_travel_api.py -q`:7 passed. FastAPI TestClient flow covers authentication/ownership, validation, create/read-back and supplier submission count. These verify the existing pending accommodation backend prerequisite included with this SDK change. No CRUD service implementation changed.
- Production build passed; existing large-chunk advisory remains. `git diff --check` passed. Canonical Docker rebuild/auth check and source hash comparisons passed.

## Scope and provider limitations

Actual SDK entry: https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1 ; official guide: https://docs.liteapi.travel/docs/user-payment . Inspected the live SDK/provider source: it owns the nested form, wallet elements, Pay button and redirect; exposes no completion callback or destruction API. Unmounting its isolated document cleans up the provider form. Parent uses Stripe only to verify the original intent, never to create/capture a payment or render custom fields.

Sandbox cards only were exercised; live payments, wallet eligibility and issuer3DS challenges were not claimed verified. The provider appends payment parameters to its return URL. The dedicated callback removes them before loading assets, sends no values to the parent, and uses no-referrer; the application does not log them. Any production edge/access logging must also exclude callback query strings. Return recovery expires after15minutes; after redirect the user confirms the details and finishes the already-authorized booking without another charge.

No push, main merge or production deployment performed for this new SDK task.
