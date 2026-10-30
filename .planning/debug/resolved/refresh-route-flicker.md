---
status: resolved
trigger: Refresh flashes login and plans before opening the current Plan
created: 2026-10-30
---

## Symptoms
Refresh a signed-in Plan URL: account-access layout appears, followed by My plans, then the requested Plan. Expected: remain on the intended route with a stable loading surface until authenticated content is ready. No reported error. Existing design reuse preference applies.

## Current Focus
Hypothesis: AccountContent renders AccountAccess for its initial loading state, and PlansApp initializes as active-list before resolving the URL in an effect.
Next action: capture refresh frame sequence in authenticated Chrome; inspect initialization and retry behavior. Work inline through GSD debug.

## Acceptance
No login layout or plans list during successful authenticated Plan refresh, including delayed session/profile/Plan reads. Signed-out requests still reach login; failure remains recoverable; direct deleted/account routes and history keep working. Preserve privacy before authentication. Verify real desktop/mobile refresh and targeted automated tests.

## Evidence and fix
Real refresh samples show account-access loading at119ms, Opening plan at797ms and canvas at964ms, all on the same URL. Initial server-rendered PlansApp markup also incorrectly contains My plans for Plan/deleted routes. Fixed initial route state and shared public loading shell; startup server errors now retry instead of pretending the session is signed out. Eight new bootstrap regression tests fail on the original code. First targeted run:48 passing tests; build passes.

## Resolution
93 distinct targeted tests passed; one existing optional Python SSE fixture case skipped. Build and source/container hashes passed. Real authenticated Chrome refresh: public loader129ms → canvas1071ms, no auth/journal frames. Delayed session/profile/Plan screenshots identical; mobile390px,503 retry and401 sign-in behavior verified. Evidence: artifacts/testing/2026-10-30-refresh-route-flicker/verification.md.
