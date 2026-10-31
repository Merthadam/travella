# Empty checkout removal verification

Date: 2026-10-31. Source commit: `6dbeb32`. Local app: http://localhost:5174.

## Result

A checkout with no result, active request or error renders no empty page and returns to Flights. The checkout query and history marker are removed; Flights announces “Choose a flight to continue.” Choosing a fresh flight clears that notice. Prepared reviews, saved itineraries, pending recovery and verification errors remain available.

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: 291 passed, 12 existing fixture/SSE tests skipped. New checks cover no empty render, delayed/failed recovery without redirect, and integrated return to Flights with URL/history cleanup. Existing success recovery/saved itinerary tests also passed.
- `npm --prefix frontend run build`: passed, existing chunk-size warning.
- `git diff --check`: passed.
- Read-only Cognito precheck and `bash scripts/start-local-ready.sh`: passed, including example-account sign-in/session/sign-out. Running Docker hashes matched both changed components.

## Actual Chrome DevTools checks

Authenticated example account, verification-owned Plan only:

1. Restored test Plan and opened its checkout URL with the existing sandbox reservation receipt. Review & pay reopened; no empty redirect or notice appeared. Captured recovery screenshot. No payment or final booking submitted.
2. Removed only this test Plan's session receipt, then opened its checkout URL directly. Returned automatically to Find your flights, showed the brief notice, removed checkout query/history marker, and rendered no old empty page.
3. Captured and visually inspected desktop 1440×1000 and mobile 390×844 screenshots. Notice and search controls remain readable; no overlap or horizontal overflow.
4. Searched fresh sandbox flights and clicked View flight. Review your flights opened and the notice cleared.
5. Reloaded that unreserved checkout. Returned to Flights again, query cleared, no empty checkout page. Mobile document-width check passed.
6. Inspected console/network after refresh: no errors or failed requests. Existing Lit development warning and field id/name advisory remain. Initial direct entry after stack restart had the existing expired-research notice; fresh search recovered normally.
7. Soft-deleted only the verification-owned Plan and read back deleted lifecycle with recovery deadline. Left app running at My plans.

## Evidence

- [Before: supplied empty screen](plan/before.png)
- [After: desktop return to Flights](implementation/empty-checkout-returns-to-flights-desktop.png)
- [After: mobile return to Flights](implementation/empty-checkout-returns-to-flights-mobile.png)
- [Existing reservation recovery](implementation/reservation-recovery.png)

The 12 existing skipped tests are not claimed as passing. No push, merge or deployment. Wider phase acceptance unchanged.
