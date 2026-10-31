# Checkout entry layout flicker

Application commit `8fc8b31`, branch `feat/guided-flight-review`. Investigated with gsd-debug inline and Travella testing requirements. User confirmed the trigger is View flight → checkout. This corrects an observed defect in the approved design; no new prototype decision needed.

## Root cause and fix

Previous content-only frame checks missed visual movement inside the result while verification ran. Actual Chrome frame sampling reproduced the button moving from x858/y511/w115/h46 to x828/y451/w145/h46. Adding the pending message and separate Cancel button re-centered and widened the action column (60px vertical movement). Checkout itself appeared fully populated and stayed at stable geometry.

The button now contains idle and cancellable-loading labels stacked in one grid cell. Both labels reserve the same size; no pending row is inserted. A small spinner indicates activity and the button reads Cancel check. Screen-reader status announces the fare check. Cancellation retains the same focus target; other results cannot initiate competing checks. Reduced-motion CSS disables the spinner animation. Error/retry and abort behavior remain intact.

## Automated and local checks

- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: 274 passed, 12 existing external fixture/SSE skips. Updated existing async handoff/cancellation checks for the single cancellable button.
- `npm --prefix frontend run build`: passed, existing chunk-size warning.
- `git diff --check`: passed.
- Read-only Cognito configuration precheck followed by `scripts/start-local-ready.sh`: authentication sign-in/session/sign-out readiness passed. SHA-256 matches for running TravelSearch.jsx and travel-search.css. Canonical app http://localhost:5174.

## Actual browser verification

Actual Chrome DevTools MCP, isolated Chrome, supplied example account. Its prior session expired; signed in through the real login form using the supplied credentials without exposing them. Restored only the verification-owned Plan. An initial search click during workspace initialization produced no search; waited until ready and performed an actual button click, then received fresh real sandbox options. No provider mutations beyond search/verify.

Desktop 1440×1000:
- Before capture confirms the 60px loading jump.
- After capture: one unique button rectangle x837/y511/w136/h46 across idle/loading, one result rectangle x267/y250/w725/h475. Checkout appeared once at x120/y91/w1200/h1052.
- Held delivery of a real successful verify response to inspect pending UI, then released it. No result/modal/partial-checkout flash. Exactly one verify for that attempt.

Mobile viewport 390×844:
- Button rectangle x33/y432/w136/h46 remained unchanged during idle, pending and keyboard cancellation. Focus stayed on the same button. Cancellation aborted the real request, no late navigation.
- Simulated a browser fetch rejection only for verify; error stayed on the result. Restored real fetch and retry reached checkout. Error messages naturally occupy layout while present; the stable-loading claim concerns normal idle→pending transitions.
- Repeated normal idle→checkout entry: same button rectangle throughout, complete checkout appeared once at x16/y83/w358/h1711. No partial checkout frame.

Console/network inspected: successful verify requests returned 200, deliberate cancellation recorded ERR_ABORTED. One 409 was the restored old research/snapshot before fresh search and recovered normally. Existing development/form-name advisories remain; no new runtime error from the fix. All saved screenshots visually inspected for overlap/readability. No reservation, prebook, payment or booking performed.

Verification-owned Plan soft-deleted afterwards; read-back confirmed deleted/recoverable. Browser left at Plans, local app running.

## Evidence

- [Before idle](plan/before-results.png), [before loading](plan/before-pending.png), [before frame measurements](plan/before-frames.txt)
- [After idle](implementation/results-desktop.png), [after loading](implementation/pending-desktop.png), [desktop checkout](implementation/checkout-desktop.png), [desktop measurements](implementation/desktop-frames.txt)
- [Mobile loading](implementation/pending-mobile.png), [mobile failure](implementation/retry-mobile.png), [mobile checkout](implementation/checkout-mobile.png)
- [Mobile cancellation measurements](implementation/mobile-cancel-frames.txt), [mobile retry measurements](implementation/mobile-retry-frames.txt), [normal mobile entry measurements](implementation/mobile-frames.txt)

No push, merge or deployment. Wider Phase18 acceptance unchanged.
