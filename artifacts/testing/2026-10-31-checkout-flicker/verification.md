# Manual flight checkout flicker — verified fix

The itinerary dialog closed before the asynchronous workspace stop completed. Checkout then mounted without verified flight data and replaced its title and layout when verification returned.

The fix keeps the itinerary modal visible with an inline availability status, verifies the original offer once, then mounts checkout with that server response in memory. The modal and previous results do not become intermediate navigation screens. Closing aborts preparation, late responses cannot navigate, and verification failure stays on the itinerary with retry. Existing reservation/payment confirmation remains unchanged.

## Before and after evidence

- [Before itinerary](plan/before-itinerary.png), [incomplete checkout](plan/before-incomplete-checkout.png), [before frame observations](plan/before-frames.txt).
- [Pending mobile](implementation/pending-mobile.png), [ready desktop](implementation/checkout-ready.png), [ready mobile](implementation/checkout-mobile-ready.png), [error/retry mobile](implementation/verification-error-mobile.png), [after frame observations](implementation/after-frames.txt).
- Baseline actual requestAnimationFrame samples: 32ms neither dialog nor checkout, 66ms incomplete checkout heading and no itinerary grid, 1037ms final title/grid. The incomplete-checkout screenshot uses an additional 2.5-second response delay solely to capture that already-observed state.
- Fixed actual samples: 7ms original dialog remains, 1205ms fully populated checkout appears in one swap. Exactly one verification request counted. No frame with both views absent, no incomplete checkout heading/grid. Mobile successful retry likewise transitioned directly at 1026ms.

## Executed verification

- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: 272 passed, 12 external-fixture skips; 19 files passed, one skipped. Tests cover pending view retention, duplicate-click lock, abort/late completion, error/retry, session expiry, exact offer token and verified response forwarding, no duplicate verification, booking and stay regressions.
- `npm --prefix frontend run build`: passed; existing chunk-size warning remains. `git diff --check`: passed.
- Read-only Cognito precheck and `bash scripts/start-local-ready.sh`: canonical Docker rebuild, sign-in/session/sign-out readiness passed. Four changed runtime files matched container hashes: FlightDetails, TravelSearch, useFlightCheckout and PlanningCanvas.
- Chrome DevTools MCP, authenticated example account, isolated browser. Reused only the previously created verification Plan and real BUD–LIS sandbox search. Continued to checkout review with matching itinerary and EUR 401.47. No passenger/prebook/payment/booking submission.
- Captured desktop 1440×1000 and mobile-width 390×844. Saved images visually inspected; pending/error itinerary and populated checkout readable without overlapping controls. Mobile uses viewport resizing, not a physical device.
- Added a 3.5-second delay to the real verify response for the cancellation check. Itinerary and disabled primary action stayed visible; Escape closed it and aborted the request. After waiting beyond that delay there was no checkout or checkout URL. DevTools recorded the expected aborted request.
- Injected one browser-only fetch rejection for the error check, restored native fetch, then retried successfully against the real sandbox endpoint. Error remained in the itinerary and retry re-enabled. The error screenshot represents this controlled failure, not a real provider outage.
- Inspected 251 network requests: successful verify requests returned 200; the deliberate cancellation was aborted. Console contained development notices, the existing Lit dev-mode warning and unnamed form-field browser issue; no JavaScript exceptions.
- Verification Plan 33b03cc2-df23-4b16-9f9c-3d5ca2bf745f soft-deleted after testing; deleted-view read confirmed lifecycle and recovery deadline. User Plans preserved.

## Limits

12 external-fixture tests remain skipped. The fix targets manual flight entry, not stay checkout or recovered booking status loading. No real booking completion, physical-device run, merge or deployment. Broader Phase 18 acceptance unchanged.
