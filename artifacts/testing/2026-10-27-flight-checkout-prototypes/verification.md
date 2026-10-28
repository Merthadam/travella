# Flight checkout design exploration — 2026-10-27

Result: three interactive prototypes ready for user selection. Production implementation remains pending.

## Run and compare

Run `npm --prefix frontend run prototype:checkout` with the existing local API on port 8003. Preview is running at port 5196. Uses the existing authenticated `/plans` route and app header.

- [A — Guided](http://localhost:5196/plans?prototype=flight-checkout&variant=A): one step at a time, persistent trip summary. [Desktop](plan/a-guided-desktop.png), [mobile](plan/a-guided-mobile.png), [passenger form](plan/a-travelers-mobile.png).
- [B — Worksheet](http://localhost:5196/plans?prototype=flight-checkout&variant=B): expandable sections and compact total; more scrolling, easier to revisit the overall structure. [Desktop](plan/b-worksheet-desktop.png), [mobile](plan/b-worksheet-mobile.png).
- [C — Trip document](http://localhost:5196/plans?prototype=flight-checkout&variant=C): itinerary preview alongside the editor; on mobile the document follows the editor. [Desktop](plan/c-trip-document-desktop.png), [mobile](plan/c-trip-document-mobile.png).
- Shared result: [desktop receipt](plan/test-confirmation-desktop.png), [mobile receipt](plan/test-confirmation-mobile.png).

The bottom switcher preserves choices while comparing layouts. Reload preserves the variant but resets the fictional booking. Preview controls expose simulated payment outcomes, fare increase, restart and relevant state.

## Executed checks

Authenticated Chrome DevTools MCP checks used the example account; credentials were read locally and never written into evidence. An isolated headless session avoided the shared Chrome profile lock. Reproducible interactive driver: `verify-live.py`; sanitized calls and outcomes: `browser-results.json`.

| Check | Observed result |
| --- | --- |
| A full journey | Flight review → passenger/contact details → seats → baggage → review/payment → confirmation → Plan receipt → reopen receipt passed. |
| Pricing | Base €312; one passenger's selected return seats €18; both passengers €36; one return checked bag €48; simulated fare increase €12. Selected full example totaled €408. Duplicate seats disabled. |
| Consent and validation | Missing passenger given name blocked progress. Missing final checkbox blocked confirmation. Fare increase cleared previous consent. |
| B payment failure | Declined payment displayed error without confirmation; switching to Approved and retrying reached confirmation. |
| C pending booking | Pending state displayed with disabled submit and no confirmation. Separate simulated confirmation action completed the booking and exposed the Plan receipt. |
| Download | Click generated an offline HTML Blob with route, reference, seats and total. Checked clear test disclaimer and exclusion of document number, birth date, contact email and card digits. A sample generated document is retained as `sample-test-itinerary.html`. |
| Print | Button invoked `window.print`; native PDF dialog/output was not exercised in headless Chrome. |
| Variant switching | Direct URLs, button switching, keyboard right-arrow and wrap C→A worked. Arrow in a form input did not switch variants. Variant survived reload; booking reset to draft. |
| Responsive | A/B/C inspected at desktop 1440×1000 and emulated mobile 390×844. No horizontal overflow; passenger inputs fit. Mobile booking reached confirmation. |
| Visual review | Saved desktop/mobile screenshots inspected. Corrected inherited dark input styling to match preview palette; final passenger screenshot verifies white fields. Earlier error-state captures predate this cosmetic correction. |
| Console/network | Final inspection: zero console errors; existing Lit development-mode warning only. Auth session, traveler-profile and Plans reads returned 200. No booking/provider/payment calls or Plan mutation requests. |
| Build | `npm --prefix frontend run build` passed, 587 modules. Existing large-chunk warning remains. `git diff --check` passed. |

During verification the shared Docker backend restarted, causing transient `/auth/session` proxy socket errors/500 and an unauthenticated screen. The backend recovered healthy; a fresh example-account login and the affected browser checks passed. The prototype did not restart or modify the Docker stack. Initial loading-state screenshots were replaced after the UI was ready.

## Scope and limits

Fictional BUD–MXP return itinerary, two adults, one booking per mock Plan. No remember-me or reusable passenger profile. All form state stays in memory; exported names come from the fictional form. The download is a labeled test itinerary, not a ticket or boarding pass. Booking, payment, seats, baggage and Plan updates are simulated; this does not validate supplier support or production booking APIs. No real messages or charges. Whole-Plan export is a future requirement, not implemented here.

Prototype-specific unit tests were intentionally omitted under the prototype skill; required browser gates were executed. The code is captured only on `prototype/flight-checkout-20261027`, pending user selection and a production rewrite.
