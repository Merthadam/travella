# Sandbox hotel checkout verification — 2026-10-09

Implemented and verified at http://localhost:5474 on `successful-fontina`.

## Scope and design

User explicitly requested mock bookings using the equipped sandbox key. Extended the previously selected design A. The [checkout sketch](plan/checkout-sketch.png) was captured in Chrome before implementation; the encoding was corrected and recaptured. No production reservation flow or durable Plan mutations were added. Flights remain search-only.

Private connector accepts sandbox keys only, encrypts supplier handles with authenticated encryption, and binds them to the verified subject and Plan. Browser checkout requires explicit confirmation; fixed test email and fictional guest names are used. There are no card fields. Prebook refreshes price and room terms. Provider clientReference remains stable for the selected offer and owner/Plan; retries reconcile through the provider instead of generating another reference.

## Executed checks

- `uv run --locked pytest services/mcps/tests/test_sandbox_checkout.py services/mcps/tests/test_liteapi.py services/mcps/tests/test_travel_security.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py -q`: **41 passed**. Covers live-key rejection before upstream calls, altered/expired handles, subject and Plan boundaries, required confirmation, price refresh, provider projection, duplicate and lost-response recovery, ski resort lookup, authenticated FastAPI create/read routes, missing Plan, invalid input, POST-only routes and CSRF.
- Frontend `npm test -- --run src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/StayDestination.test.jsx`: **9 passed**. Explicit consent, refreshed terms, confirmed vs unknown outcome, status-only recovery, tab storage without guest data, expired checkout and existing search regressions.
- Frontend `npm run build`: **passed**; existing bundle-size warning remains.
- `git diff --check`: passed.
- Local startup skill: read-only default/eu-north-1 Cognito precheck passed; rebuilt `travella-liteapi-fresh`, preserving database volumes. Health, example-account sign-in/session/sign-out passed. Five changed source hashes matched the running app and travel connector containers.

## Actual browser / provider journey

Used installed Chrome DevTools MCP in an isolated headless browser, authenticated as the mandatory example account with credentials read privately from the supplied file. Shared browser/profile was left alone.

1. Opened existing Plan canvas → Explore accommodation. No Plan changes were saved.
2. Selected Austria, Kreischberg ski resort, 3–7 February 2027, one room, two adults, HU nationality, EUR. The current sandbox key returned **five stays**. Both the resort and its smaller municipality are now selectable; roads remain excluded.
3. Opened JUFA Hotel Murau → View rooms → Try mock booking. Prebook returned HTTP 200; review showed **EUR 1,079.77**, Family Room, Breakfast Included and refreshed cancellation penalty. Confirm stayed disabled until the checkbox was selected. [Desktop review](implementation/desktop-review.png).
4. Explicitly submitted with fictional Alex Tester. Booking returned HTTP 200 with **CONFIRMED**, test booking reference **G9t1w_8h0**, confirmation **test**. [Submission loading state](implementation/booking-submission.png), [desktop confirmation](implementation/desktop-confirmed.png), [mobile confirmation at 390×844](implementation/mobile-checkout.png).
5. Check mock booking status returned HTTP 200 and the same reference. Reloaded the page, reopened accommodation and selected View last mock checkout: POST sandbox/status returned HTTP 200 and the same confirmed booking. No second book request occurred. [Receipt after reload](implementation/receipt-after-reload.png). This proves provider persistence/read-back, beyond mocked tests.
6. Simulated offline network in DevTools. Status lookup showed an error while retaining the previous receipt. Restored connectivity and Check mock booking status again returned HTTP 200 with the same reference. [Offline state](implementation/offline-recovery.png).
7. Inspected console/network. No new application exceptions. Expected offline network errors and an existing Lit development warning were present. A development reload/beforeunload prompt suspended an early destination lookup; dismissing it and using Retry destinations recovered successfully. Subsequent search/detail/prebook/book/status requests all returned HTTP 200. A fresh test session was used after rebuild to avoid a stalled old DevTools evaluation.
8. Inspected saved screenshots: no horizontal clipping or overlapping checkout controls at desktop/mobile sizes; modal body scrolls for longer details. Mock labeling is visible throughout.

## Limits and retained data

- Hotel mock checkout only; no flight checkout, real reservations, Plan booked-state mutation, cancellation or account-wide booking-history UI.
- Encrypted checkout recovery handle is stored only in this tab's session storage. Read-back lasts up to seven days; new submission requires a checkout under 15 minutes old. Closing the tab, clearing storage or rotating the key can remove recovery access. Provider sandbox record remains available in the LiteAPI dashboard.
- Retained the newly created sandbox test reservation for review. No real payment or real booking was made. No personal guest email, credentials, raw provider handles or payloads are in screenshots/reports.
- No CRUD database schema/operation changed; mock reservations persist at LiteAPI. Existing broader test-suite debt is documented in prior search evidence; focused suites were run for this change.

Provider references: [Prebook](https://docs.liteapi.travel/reference/post_rates-prebook), [sandbox booking/payment and idempotency](https://docs.liteapi.travel/reference/post_rates-book), [lookup by client reference](https://docs.liteapi.travel/reference/listbookings).
