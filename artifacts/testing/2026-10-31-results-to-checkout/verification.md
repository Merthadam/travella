# Direct flight results → checkout review

Implemented in `0cea83c` on `feat/guided-flight-review`. User approved removing the intermediate modal from the live manual flight journey. Continued the already selected design; no new prototype decision required.

## Behavior

Current eligible sandbox results open the existing checkout review from **View flight**. Verification runs with results visible and an inline pending/cancel state. Checkout receives its complete server review in memory and mounts once. Duplicate clicks are blocked; cancel, leaving the workspace, new search, changed workspace/search and unmount invalidate the request. Errors remain on the result with retry instructions. Existing observations without a live offer remain inspectable with Search again. No Plan option is selected or booking created by viewing a flight.

## Automated verification

- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/PlanningCanvas.test.jsx`: 251 passed, 12 skipped. The second path did not match a file; the correct canvas path was run separately below.
- `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx`: 22 passed on rerun. Initial concurrent run during Docker rebuild timed out in the existing open-card/unsent-chat navigation test (21 passed). Rerun without rebuild completed in 3.57 seconds; no test or timeout configuration was changed.
- Total final relevant checks: 273 passed, 12 existing external fixture/SSE skips.
- Direct-entry tests cover exact original token forwarding, no intermediate dialog, one verification despite duplicate click, populated review handoff, cancel, inactive workspace, failed verification/retry and expired-session handling. Existing details tests cover original/historical evidence.
- `npm --prefix frontend run build`: passed, existing chunk-size warning.
- `git diff --check`: passed.

## Running application

Followed travella-local: read-only existing Cognito configuration precheck, then `bash scripts/start-local-ready.sh`. Auth sign-in/session/sign-out readiness passed. Running container SHA-256 for `frontend/src/features/plans/travel/TravelSearch.jsx` matches this checkout. Canonical origin: http://localhost:5174.

Actual Chrome DevTools MCP in an isolated Chrome session, authenticated as the supplied example account. Reused only the verification-owned Plan, restored through its confirmation API. Fresh real LiteAPI sandbox BUD–LIS return search, 12–17 May 2027, one traveler, returned 58 options. Tested desktop 1440×1000 and mobile viewport 390×844.

## Browser observations

1. One **View flight** click opened **Review your flights** directly. Real animation-frame samples: at 20ms results pending, no dialog/checkout; at 1216ms populated checkout title and grid appeared together. No partial checkout frame or intermediate modal.
2. **Back to flights** returned to the results. Mobile pending state remained readable with Cancel. Delayed delivery of a real successful verify response, cancelled, then released: no late navigation and View flight enabled again.
3. Simulated a verify network failure only in the browser to exercise the error state. Error stayed on the selected result. Restored the real fetch and retried successfully against the provider. Mobile frames: results at 38ms → populated checkout at 891ms, no dialog/partial checkout.
4. On mobile, inspected itinerary and actions, no horizontal overflow. Continue to passengers opened Passenger details with consent unchecked. Returned to flights without reserving, prebooking, paying or confirming.
5. Reloaded and reopened Explore flights. The persisted observation without its ephemeral live token opened readable details and **Search again**, rather than attempting checkout. Initial automation waited for results on the Plan canvas after reload; corrected by opening Explore flights, then passed.
6. Console/network inspected: three real verify requests returned 200 (desktop, deliberately delayed/cancelled, mobile retry), one per attempt. No prebook/payment request. One 409 came from the restored old research/snapshot before the fresh search, not the changed entry path; fresh search recovered normally. Existing Vite/Lit development and form-name advisories remain; no new runtime error from this change.
7. All saved screenshots visually inspected: no clipping, overlap or unreadable controls. Restored then soft-deleted only the test-owned Plan; read-back confirmed deleted/recoverable. Browser left on Plans; app left running.

## Evidence

- [Before: removed intermediate review](plan/removed-intermediate-review.png)
- [Approved destination: existing checkout review](plan/direct-review-destination.png)
- [Desktop results](implementation/results-desktop.png)
- [Desktop checkout](implementation/checkout-desktop.png)
- [Desktop frame observations](implementation/desktop-transition.txt)
- [Mobile pending/cancel](implementation/pending-mobile.png)
- [Mobile simulated failure/retry](implementation/retry-mobile.png)
- [Mobile checkout](implementation/checkout-mobile.png)
- [Mobile review actions](implementation/review-actions-mobile.png)
- [Mobile frame observations](implementation/mobile-transition.txt)
- [Observation without live offer](implementation/observation-without-live-offer.png)

No push, merge or deployment. Broader Phase18 acceptance is unchanged.
