---
status: resolved
trigger: "search dont work properly"
created: 2026-10-09
updated: 2026-10-09
---

## Current focus

Root cause confirmed: literal cityName Wien returns HTTP 200 with error.code 2001, while Vienna and the place ID resolved from Wien return 28 hotels. The adapter treated 2001 as malformed data.
Verification complete: exact Wien search returned 28 stays through the rebuilt local stack. Saalbach-Hinterglemm returned 13. Hotel details, mobile layout, empty availability and destination retry passed.

## Symptoms

Expected: accommodation results or an accurate no-availability message.
Actual: user confirms accommodation produces no results or an error. Their browser shows "We couldn’t finish this search. Please try again."
Reproduction: Wien, Austria; February 3–7, 2027; Hungary nationality; EUR; one room with two adults.
Timeline: reported immediately after the initial classic search implementation.

## Evidence

- Read-only inspection of the user's Chrome tab established the exact form criteria and error.
- Prior verification covered Rome successfully but did not cover this destination.
- The adapter currently passes cityName literally and maps every non-200 response except 204 to a generic provider failure.
- Reproduced the exact generic error in Chrome DevTools; preserved before screenshot.
- Live read-only probes: Wien => code 2001; Vienna => 28 hotels; place lookup Wien/Austria => locality; rates with its place ID => 28 hotels.
- Added failing regression tests before implementation, then corrected destination resolution and code 2001 handling.

## Resolution

Implemented provider-backed city suggestions and explicit place selection. Editing the city or country clears the selection. Hotel rates use the chosen place ID; existing city/country API requests remain compatible. Only documented hotel-rates error 2001 is normalized to empty availability. Other provider errors remain errors.

No durable Plan mutation or booking operation is involved.

29 focused Python tests, 6 frontend tests and the frontend build passed. Running source hashes match the checkout. Evidence: artifacts/testing/2026-10-09-liteapi-search-fix/verification.md. The configured provider remains sandbox inventory. Unrelated pre-existing full-suite failures were not rerun for this focused repair.
