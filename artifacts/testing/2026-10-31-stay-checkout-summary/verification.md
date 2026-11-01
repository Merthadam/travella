# Accommodation checkout summary removal

Status: verified locally. Source commit: e358393. Canonical app: http://localhost:5174.

## Scope and decision

The user requested removal of the complete pictured YOUR STAY summary card and selected “Remove the card directly” when offered prototype alternatives. Removed its component/render and obsolete scoped heading rule. The remaining step panel occupies one column. Payment review, room terms, consent, confirmation receipt and flight checkout behavior are preserved.

## Evidence

- [User-supplied before state](plan/before-summary.png)
- [Layout sketch](plan/layout-preview.png) · [HTML source](plan/preview.html) (simulated content, visual planning evidence)
- [Desktop review](implementation/desktop-review.png)
- [Desktop guest entry](implementation/desktop-guests.png)
- [Desktop payment review](implementation/desktop-payment-review.png)
- [Mobile review](implementation/mobile-review.png)
- [Mobile guest entry](implementation/mobile-guests.png)
- [Mobile payment review](implementation/mobile-payment-review.png)
- [Mobile total and confirmation controls](implementation/mobile-payment-controls.png)
- [Empty checkout after reload](implementation/mobile-empty-after-reload.png)

All listed screenshots were opened and visually inspected. Content wraps without horizontal overflow; the step panel has no vacant sidebar. Lower mobile controls remain reachable.

## Executed checks

| Check | Result |
|---|---|
| `npm test --prefix frontend -- --run src/features/plans/travel/StayCheckout.test.jsx src/features/plans/travel/FlightCheckout.test.jsx` | 29 passed across 2 files |
| `npm run build --prefix frontend` | Passed; existing bundle-size advisory |
| `bash scripts/start-local-ready.sh` | Rebuilt successfully; health, example-account sign-in/session/sign-out passed |
| SHA-256 source comparison with Compose app under `/app/` | StayCheckout.jsx and stay-checkout.css match |
| Chrome DevTools desktop 1440×1000 | Search Lisbon, 12–17 May 2027, two guests; Meliá Lisboa Aeroporto → Double Standard → checkout → guests → payment review passed |
| Summary removal | 0 `.stay-checkout .flight-summary` elements; one 1200px grid column; panel fills grid |
| Guest and consent behavior | Edited fictional guest to Jamie Tester; value retained through step navigation. Confirmation disabled without consent, enabled with consent, reset after changing steps. No submission |
| Chrome DevTools mobile 390×844 | Fresh provider-backed search and all three checkout steps passed; one 358px column, 0 summary cards, no horizontal overflow. Total and disabled confirmation visible after scrolling |
| Loading / empty behavior | Observed prebook loading. Device emulation reload correctly discarded unsubmitted offer state and showed Return to stays; returned and reopened a fresh offer successfully |
| Console / network | No console errors in final mobile journey; existing Lit development warning only. All captured same-origin fetch/XHR requests succeeded with HTTP 200, including search, detail and prebook. [Sanitized request list](network.txt) |
| Cleanup | Both plans created in this run were soft-deleted through challenge/revision API; active reads returned 404 |

## Verification environment and limits

The configured Chrome DevTools MCP initially could not open its already-running profile. Used the same installed Chrome DevTools MCP 1.12.0 in a separate isolated headless Chrome session, with the example account loaded from the supplied local credential file. No user browser/profile was closed. The isolated verification browser was closed afterward.

Initial test-trip generation was interrupted by the local rebuild. A second test-only plan was seeded through the actual authorized CRUD API; its incomplete initial canvas fixture was corrected before journey verification. These setup issues did not require product changes. Both temporary plans were cleaned up.

Existing unit coverage exercised unavailable-room errors, unresolved/pending reservation recovery and confirmed receipts. Those provider failure/confirmation outcomes were not forced in the live browser. No reservation or payment was submitted. No backend code changed, and no production deployment, push or merge was performed.
