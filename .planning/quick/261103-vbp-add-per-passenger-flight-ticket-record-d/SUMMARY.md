# Per-passenger flight ticket records

Implemented in **af87f69**. Flight confirmations offer Load passenger tickets and one offline HTML document per issued passenger ticket, including provider ticket number/status, passenger name, issue date and that passenger's flight extras. Reopening saved bookings works without a browser checkout token.

Read-only ticket lookup authorizes against the encrypted subject/Plan-scoped journal before supplier GET. Booking identity/environment and passenger association are checked; raw provider payloads, passport/contact/payment fields are not exposed or newly persisted. Cancelled/pending/unissued/missing records do not produce downloadable tickets. This remains a sandbox feature, and the documents clearly distinguish Travella-generated records from airline originals/boarding passes. No supplier PDF endpoint was found or integrated.

Verified: 47 backend tests; 34 focused frontend tests; 356 broad frontend passes with 12 existing skips; build; new Python files lint; diff check; running app/connector source hashes. Actual authenticated Chrome DevTools exercised both passenger downloads, offline rendering, reload, mobile/desktop, simulated error/retry and missing-ticket states, real 401/404/422 boundaries and successful provider readback. No unexpected console/network failures. Physical PDF/print output and production airline tickets were not tested.

Deviation: fixed an existing asynchronous payment-test setup race by waiting for SDK mock callback registration; no production payment behavior changed. No new user Plan mutations or bookings/payments. No merge/push/deployment. Local URL http://localhost:5174.

[Verification and screenshots](../../../artifacts/testing/2026-11-03-passenger-tickets/verification.md). Broader phase acceptance unchanged.
