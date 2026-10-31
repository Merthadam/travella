# Direct checkout from flight review

User requested removing the second fare step from approved C. Kept the itinerary design and replaced Review fare with Continue to checkout. Baggage/fare terms remain in an optional disclosure; choose/discuss remain explicit actions. Removed step state/navigation and duplicate recap styles. Existing expiry, token, sandbox and booking guards are unchanged.

Design: [DOM-only preview](plan/design-preview.png), [reported extra step](plan/reported-extra-step.png). Preview checkout was disabled and no business action was simulated.

## Automated checks

- Travel suite: `npm --prefix frontend test -- src/features/plans/travel` — 244 passed, 12 external-fixture tests skipped (18 files passed, one skipped).
- Production build: `npm --prefix frontend run build` — passed, existing large-chunk warning remains.
- `git diff --check` — passed.
- Initial test update inadvertently removed a same-line Choose for trip call from two cases; restored it and reran the full affected travel suite successfully.

## Browser verification

- Canonical Docker rebuilt with `bash scripts/start-local-ready.sh` after read-only Cognito precheck. Sign-in/session/sign-out readiness passed. FlightDetails.jsx and flight-review.css hashes matched running container sources. App: http://localhost:5174.
- Authenticated as the supplied example account in isolated Chrome DevTools MCP. Restored only the verification Plan created in the preceding task (33b03cc2-df23-4b16-9f9c-3d5ca2bf745f), with Lisbon dates 12–17 May 2027 and one traveler.
- Real airport lookup and LiteAPI sandbox search. After rebuild an old research snapshot returned 409 and the existing UI reported previous results unavailable; a fresh search recovered and returned 58 flights. Inspected this request at `/v1/agent/plans/{verification-plan}/travel/research/snapshot`; unrelated to review layout changes.
- [Itinerary](implementation/itinerary-desktop.png) opened with Continue to checkout immediately available and no step indicator. Clicked it while fare conditions remained collapsed: [checkout review](implementation/direct-checkout-review.png) opened with matching BUD–LIS return itinerary and EUR 401.47. No prebook/passenger/payment/booking submission.
- Returned to flights, expanded [fare disclosure](implementation/fare-disclosure-desktop.png), checked its actual baggage/refund terms, and collapsed it. No choose or checkout action triggered by disclosure.
- [Mobile](implementation/itinerary-mobile.png), [expanded mobile](implementation/mobile-expanded.png) and [dark mobile](implementation/mobile-dark.png) inspected at 390×844; desktop 1440×1000. No horizontal overflow. Expanded mobile content ended exactly at the footer top; footer remained within viewport. All saved screenshots visually inspected.
- [Choose confirmation](implementation/choose-confirmation.png) showed the matching flight, dates, terms and price; cancelled with Keep researching. Discuss flight closed review and attached Nuitée Air to the composer. No durable option selection.
- [Expiry recovery](implementation/expired-offer.png): advanced browser Date.now for one click, then restored it immediately. Expired notice and Search again appeared, choose/discuss disappeared, checkout did not open. Simulated elapsed time only; timer guard also covered by tests.
- Real pointer open then Escape restored focus to View flight. [Tokenless reload](implementation/tokenless-recovery.png) retained itinerary but required Search again immediately, without claiming the offer had expired.
- Inspected console and 250 network requests in the captured page. No JavaScript exception or changed-path failure. Existing Lit dev warning and unnamed form field browser issue remain; the old-snapshot 409 above recovered through search.
- Soft-deleted only the verification Plan after checks; subsequent deleted-view read confirmed deleted lifecycle and recovery deadline. User Plans preserved.

## Limits

12 external-fixture tests remain skipped; production bundle retains its existing size warning. Physical devices and real-provider booking completion were not tested. No backend changes, push, merge or deployment. Wider Phase 18 acceptance unchanged.
