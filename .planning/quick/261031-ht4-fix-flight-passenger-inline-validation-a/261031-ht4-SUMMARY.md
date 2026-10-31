---
status: complete
---

# Passenger validation

Implemented in `8ee3113`: inline accessible field errors after blur/Continue, first-invalid focus, adult and exact child/infant age-at-departure checks, strict passport expiry after return, blank-name rejection in form and server. Invalid input never reaches prebook; correction preserves explicit consent.

266 frontend tests passed (12 existing fixture/SSE skips), 36 Python tests passed, build/diff checks passed. Rebuilt canonical Docker stack and verified source hashes. Actual authenticated Chrome desktop/mobile checks confirmed three inline errors and zero prebook requests; corrections cleared errors and one valid prebook returned 200 to Seats. No final booking/payment submitted. Cleaned verification-owned Plan and left app running.

[Evidence](../../../artifacts/testing/2026-10-31-passenger-validation/verification.md). No push/merge/deploy; wider phase acceptance unchanged.
