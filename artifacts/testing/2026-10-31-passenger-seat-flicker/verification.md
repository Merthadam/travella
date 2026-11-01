# Passenger → seats flicker verification

Date: 2026-10-31. Branch: `marshy-face`. GSD debug executed inline. User chose to preserve the existing design. Canonical app: http://localhost:5174.

## Cause and change

Starting prebook set `attempted` immediately. The view treated `attempted + review` as an uncertain outcome and removed the entire passenger form while the request was still running. A loading banner also entered the layout. The baseline browser capture shows panel height shrinking from 1211.1 to 127.7px and scroll moving from 764 to 266px. On success, seats painted at scroll 266 before a passive effect reset it to 0.

Track the active request separately. Keep the existing passenger form mounted and disabled during prebook, use the existing button for progress with stable label dimensions, and keep its accessible loading announcement outside visual layout. A layout effect resets scroll before the new step paints. Actual uncertain outcomes and status-check recovery retain their existing warning; validation failures retain editable fields and require fresh consent.

## Automated checks

- New regression test failed against the original implementation because the passenger input disappeared during a deferred prebook request.
- `npm --prefix frontend test -- src/features/plans/travel/FlightCheckout.test.jsx`: 21 passed. Includes input identity/value preservation, disabled controls, duplicate-submission prevention, direct success, uncertain recovery during status checks, existing 422 retry and no-seat coverage.
- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: 312 passed, 12 existing external-fixture/SSE skips. The skipped tests were not run and provide no additional coverage for this change.
- `npm --prefix frontend run build`: passed; existing large-bundle warning.
- `git diff --check`: passed.
- Cognito precheck and `bash scripts/start-local-ready.sh`: passed sign-in/session/sign-out readiness. SHA-256 matches for FlightCheckout.jsx, useFlightCheckout.js and flight-checkout.css in the running Compose app.

## Chrome DevTools verification

The configured MCP's shared profile was held by another live browser. Launched a separate `--isolated` instance of the installed Chrome DevTools MCP 1.12.0, accessed through its MCP client. No unrelated browser was stopped. Signed in as the supplied example account through the real form, using credentials privately read from the configured account file.

Created an isolated Lisbon verification Plan through the normal authenticated CRUD challenge/revision APIs. An initially incomplete canvas fixture was corrected before testing. Used real sandbox search/verify/prebook responses with fictional passengers. Held successful prebook response delivery only to inspect the pending state, then released it. Frame records contain geometry/state only.

Desktop 1440×1000:

- Passenger form stayed mounted throughout prebook; all inputs and submit were disabled.
- Idle/pending geometry identical: panel `[120,-301,840,1211.1]`, button `[743.2,861.2,216.8,48.8]`, summary `[990,107,330,638.4]`, scroll 764.
- Next changed frame was the complete seats step at scroll 0. No reservation-warning or old-scroll seats frame.
- Selected provider seat 20A; continued through baggage to final review. Provider total changed from €401.47 to €413.47, and the exact seat appeared in review. Confirmation remained disabled pending consent. No payment or final booking submitted.

Mobile 390×844:

- Browser-injected 422 response (no provider reservation for that attempt) left the form editable, showed the validation error, and required fresh consent.
- Retried against the real sandbox. Passenger form height stayed 1817.1px and submit stayed 180.9×44px while pending. Removing the prior error changed document scroll by 80.5px, with viewport positions held within 0.3px by scroll anchoring; this is a validation-retry capture, not a claim of unchanged document scroll.
- Next content state was seats at scroll 0, without an intermediate warning. No horizontal overflow. Pending, error and seats screenshots inspected for overlap/readability.
- Recovered flight results correctly required a fresh search before opening a new checkout; fresh search/verify succeeded.

Chrome network: real search, verify, prebook, status and services requests returned 200. Console: existing Lit development warning only in the checked navigation; no runtime errors from the fix. Ambiguous failure recovery and empty seats are covered by component tests, not a live provider failure. Final payment/booking was outside this transition test.

Soft-deleted only the verification-owned Plan, then read it back as deleted/recoverable. Cleared only that Plan's temporary browser receipt/view. Local app remains running with the fix.

## Evidence

- [Transition sketch](plan/transition-plan.png)
- [Before passengers](plan/before-passengers.png), [before pending collapse](plan/before-pending.png), [before frames](plan/before-frames.json)
- [Desktop passengers](implementation/after-passengers-desktop.png), [desktop pending](implementation/pending-desktop.png), [desktop seats](implementation/seats-desktop.png), [desktop frames](implementation/desktop-frames.json)
- [Mobile validation](implementation/validation-mobile.png), [mobile pending](implementation/pending-mobile.png), [mobile seats](implementation/seats-mobile.png), [mobile frames](implementation/mobile-frames.json)
- [Sanitized network checks](implementation/network.txt), [console checks](implementation/console.txt)
