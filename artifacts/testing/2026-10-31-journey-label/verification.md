# Your journey copy correction

Implemented in e0995ae on feat/guided-flight-review. User explicitly approved changing the label. Both checkout headings and the matching shared flight-detail label now read YOUR JOURNEY; Outbound and Return still identify the individual legs. Continued the approved design with a copy-only change.

- Existing FlightCheckout.test.jsx and TravelDetails.test.jsx: 30 passed, no skips. No new copy-mirroring tests added.
- Frontend production build passed (existing chunk-size warning); git diff --check passed.
- Read-only Cognito precheck and scripts/start-local-ready.sh passed sign-in/session/sign-out readiness. Both changed source-file hashes matched the running Docker container. Canonical URL http://localhost:5174.
- Actual Chrome DevTools MCP, authenticated example account: restored verification-owned Plan, fresh real sandbox search, View flight → checkout. Both headings read YOUR JOURNEY and checkout contained no YOUR RETURN JOURNEY text.
- Desktop 1440×1000 and mobile 390×844 screenshots inspected: readable headings, no clipping or overlap. Existing sandbox verify returned 200. No failed network requests or console errors; existing development/form-name advisories remain.
- No reservation/payment performed. Test Plan soft-deleted and read-back confirmed deleted/recoverable. Browser left at Plans; app running.

[Before](plan/before-label.png) · [Desktop](implementation/checkout-desktop.png) · [Mobile summary](implementation/journey-summary-mobile.png)

No push, merge or deployment. Wider Phase18 acceptance unchanged.
