# Plan refresh route flicker — verification

## Result
Authenticated refresh now shows one public loading shell, then the requested Plan. Login and My plans do not appear between them. The Plan URL remains unchanged. Startup network/server failures offer Retry in the same shell; only confirmed HTTP 401 selects sign-in.

## Cause and change
AccountContent used the full AccountAccess presentation while checking the session and profile. PlansApp initially rendered the active journal before its effect read the URL. The initial Plan loading state also used a different page layout.

Added a shared AppLoading presentation with no private data and initialized PlansApp view/conversation state from the URL on its first render. Removed the obsolete account-access loading presentation. No authorization checks were skipped and no cached private Plan data is displayed before session/profile validation.

Inline GSD debugging; existing design reuse preference honored. [Debug record](../../../.planning/debug/resolved/refresh-route-flicker.md).

## Plan and before evidence
- [Before: account-access shell during refresh](plan/before.png) — session deliberately delayed to capture the existing view.
- [Intended neutral loading shell](plan/intended-loading.png) — Chrome-rendered planning preview.
- [Before real refresh frames](plan/before-frames.json): blank document → account-access loading at119ms → Opening plan at797ms → canvas at964ms. URL unchanged. The journal was not captured in this particular animation-frame sample; first-render regression tests confirm the incorrect initial journal markup on Plan and deleted routes.

## Automated checks executed
- `npm --prefix frontend test -- src/AppBootstrap.test.jsx src/AccountApp.test.jsx src/PlansApp.test.jsx src/PlansResume.test.jsx`: **48 passed**.
- `npm --prefix frontend test -- src/AppBootstrap.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx`: **53 passed, 1 skipped**. AppBootstrap's eight tests overlap the first run: **93 distinct passing tests**.
- The skipped existing actual-Python-SSE test requires `TRAVELLA_CANVAS_SSE_FIXTURE`, which was not supplied. It does not exercise startup routing; no model/SSE request was initiated for this fix.
- All eight new bootstrap regression cases failed with original AccountApp/PlansApp source temporarily restored. Exact fixed bytes restored in finally; rerun passed.
- `npm --prefix frontend run build`: passed; existing large-chunk warning remains.
- `git diff --check`: passed.

Coverage includes initial Plan/conversation/deleted-route markup before effects, delayed session/profile/Plan reads, silent access-session renewal, temporary session and profile failure with retry, confirmed signed-out privacy and retained URL, account navigation, canvas resume and Plan loading/error paths.

## Running app
Ran the local Cognito precheck and `bash scripts/start-local-ready.sh` from the current worktree. Health and example-account sign-in/session/sign-out checks passed. SHA-256 of AccountApp.jsx, PlansApp.jsx, AppLoading.jsx, app-loading.css and AccountAccess.jsx match the running Compose container. Database volumes preserved. URL: http://localhost:5174.

## Chrome DevTools checks
Authenticated example-account existing verification Plan, desktop1440×1000 and mobile390×844. No Plan writes, supplier searches or model requests submitted.

1. Normal real refresh: [frames](implementation/after-frames.json) show blank document → public loading at129ms → Plan canvas at1071ms. **No auth layout or journal frames.** The same Plan URL is present throughout.
2. Delayed real requests: gated session, profile and Plan reads independently, then released each real response. [Session](implementation/loading-session.png), [profile](implementation/loading-profile.png) and [Plan](implementation/loading-plan.png) screenshots are byte-for-byte identical. [Frame sequence](implementation/delayed-frames.json) has only loading → canvas, with no intermediate page.
3. Mobile: delayed session still shows the [same shell](implementation/loading-mobile.png), then the [saved Plan](implementation/after-mobile.png). [Frame/dimension evidence](implementation/mobile-frames.json): viewport and body widths both390px; no horizontal overflow, auth flash or journal flash.
4. Simulated startup503: [retry state](implementation/error.png) stays on Plan URL with no login. Clicking Retry used real session/profile/Plan reads and opened the same saved Plan successfully.
5. Simulated confirmed session401: [sign-in state](implementation/confirmed-signedout.png) shows Welcome back, no private Plan, and retains the requested URL. Reload without the simulation successfully returned to the real authenticated Plan.
6. Normal final network inspection: all11 fetch/XHR requests succeeded, including session/profile/Plan/canvas. No active-list request was made during Plan bootstrap. Console: no errors; existing Lit development and Google Maps event API warnings only.
7. Screenshots visually inspected for readable text, clipping, overlap and correct states. [Final desktop Plan](implementation/after-plan.png).

## Limits
Slow/failure/signed-out conditions were simulated in Chrome; successful Plan reads used the real local backend and authenticated account. A normal browser refresh still needs a brief loading screen while authentication and data resolve. Existing optional SSE fixture test was skipped as noted above.
