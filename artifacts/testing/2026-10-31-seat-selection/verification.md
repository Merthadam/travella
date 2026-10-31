# Guided flight seat selection — 2026-10-31

Implemented the user-approved direct flow (interactive alternatives declined). GSD quick task `261031-mm5`, executed inline. Frontend only; no backend or provider contract changes.

## Behavior

- Named traveler cards replace the seat-stage passenger dropdown. A seat click assigns the active traveler, then advances to the next eligible unassigned traveler on that flight. When finished, choose a traveler explicitly to change a seat.
- All selected seats retain visible P1/P2 ownership. Traveler cards stay visible while scrolling. One physical position cannot be selected twice, including separate passenger-type service IDs. Outbound/return choices remain independent.
- Airline assignment can remove one traveler's seat on one flight, or every seat on every flight, preserving baggage. The latter collapses the unused map. Wording says no seat-selection charge, with no promise about adjacent seats or assignment timing.
- Infant and no-inventory states remain explicit. Prices are provider supplied; final totals change only after provider readback.

## Plan and visual evidence

- [Design sketch](plan/seat-flow.png), [renderable sketch](plan/seat-flow.html).
- [Before](plan/before-seats.png), retained from the preceding authenticated checkout verification.
- [Desktop selected seats and sticky travelers](implementation/final-paid-desktop.png).
- [Mobile selected seats](implementation/paid-mobile.png).
- [Desktop airline assignment](implementation/airline-desktop.png), [mobile airline assignment](implementation/airline-mobile.png).
- [Paid review](implementation/paid-review-desktop.png), [airline-assignment review](implementation/airline-review-mobile.png).
- [Simulated error](implementation/error-mobile.png), [held real provider response](implementation/loading-desktop.png). The loading capture predates the final sticky-card/row-height polish; the disabled form and pending action were exercised against the real response.

All linked screenshots were visually inspected. Desktop 1440×1000 and mobile 390×844. Final mobile document width 390/390 and map width 310/310: no horizontal overflow. [Reassignment geometry](implementation/mobile-reassignment.json) shows the changed seat retained identical coordinates and a 64px height. That measurement precedes the final 2px mobile-width correction, which does not change row height.

## Executed checks

`npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: **322 passed, 12 existing skips**, 22 files passed and 1 skipped. Includes 8 new seat-component tests and 2 new checkout integration tests. Covers consecutive assignments, explicit replacement, occupancy, distinct flights, scoped/global clearing with baggage preservation, infants, eligibility, empty inventory, loading, exact service payloads and recovery after failed updates. Initial integration expectations were corrected to respect the existing status-check recovery flow; the final run passed.

`npm --prefix frontend run build`: passed; existing >500kB chunk warning remains. `git diff --check`: passed.

Local Cognito precheck and `bash scripts/start-local-ready.sh`: passed after rebuilding the canonical Docker stack. Four changed application source files match their `/app/` container copies: [source verification](implementation/source-check.txt). Local URL: http://localhost:5174.

## Chrome DevTools journey

Used the example account via its protected local credential file. Used an isolated Chrome DevTools MCP session through a local stdio bridge because the default MCP profile was held by another running Chrome. No other browser was stopped.

Created only test Plan `b0f1c7e6-1231-46d5-9645-4f188f2ecb9b`, set up its two-traveler Lisbon canvas using real Plan APIs, then exercised flight search, fresh offer review, test passengers, sandbox prebook, seats, baggage and final review.

1. Real sandbox prebook: HTTP 200, `ready_to_book`, **€802.94**, zero seat services.
2. Successive outbound clicks selected 22A for traveler 1 and 22B for traveler 2; auto-advance and visible owners confirmed. Services HTTP 200, **€826.94**.
3. Return 22A/22B assigned independently. Services HTTP 200, four services across two flights, **€850.94**. [Sanitized requests/readbacks](implementation/paid-network.json).
4. Reload restored all four seats from provider status. Passenger names intentionally remain transient; recovery uses Passenger 1/2 labels.
5. Mobile explicit edit changed only traveler 1 from 22A to 22C locally, preserving traveler 2 and return selections; row geometry remained stable.
6. Simulated one `invalid_services` 422 response before sending any provider mutation. Checkout blocked further selection and offered status recovery. Real status HTTP 200 restored the four authoritative seats. [Recovery](implementation/error-recovery.json). This rejection was deliberately injected, not a provider failure.
7. Choosing airline assignment for all flights submitted **an empty selected_services array**. Provider HTTP 200 returned no selected services and the original **€802.94** total. [Readback](implementation/airline-network.json).
8. Continued through baggage to review: “No seats selected · airline assignment.” Reload retained that state and total: [reload evidence](implementation/airline-reload.json).
9. The first real services response was deliberately held after receipt to exercise loading. Controls were disabled and checkout stayed busy; releasing it advanced to baggage.

Final console: no errors; existing Lit development and Stripe HTTP test-mode warnings only. [Sanitized local network results](implementation/network-sanitized.txt): checkout/status/services and Plan reads returned 200. During Docker recreations, earlier bootstrap/auth/airport requests temporarily failed; after readiness and reload those paths recovered. No final application regression was observed.

## Scope and cleanup

No payment authorization or final booking was submitted. Real provider inventory in this run included seats; missing inventory, infant and physical-seat duplicate variants were covered by component tests rather than separate live-provider scenarios. The 12 pre-existing skipped tests remain skipped. No backend CRUD handler changed, so backend change-specific integration gates do not apply.

Soft-deleted only the created test Plan and read it back in deleted view; deletion and recoverability confirmed. Removed its local checkout receipt/view preference. [Cleanup readback](implementation/cleanup.json). The canonical stack remains running.
