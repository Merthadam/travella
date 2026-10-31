# Compact checkout country pickers

Application commit: `c13a431`, branch `feat/guided-flight-review`. User requested paging instead of the oversized native country dropdown. Reused the existing Travella searchable, ten-country paginated picker for nationality and passport issuing country. This is a refinement of the same approved checkout session, using an established component; no new prototype round. Shared picker styles now travel with the component; checkout adds theme and mobile full-width fields.

## Checks

- `npm --prefix frontend test -- src/features/plans/travel`: 252 passed, 12 existing external fixture/SSE skips. New integration coverage confirms paging, selection, independent nationality/issuer values, Escape on no matches, selected ISO-code payloads and locked fields after reservation (mocked unit test only). Existing picker keyboard/search tests pass.
- Initial new-test failures were selector mistakes: all-page option count included the gender options; checkout step accessible name includes whitespace. Corrected test selectors to target the listbox and accessible step label. Final suite passed without production changes for these failures.
- `npm --prefix frontend run build`: passed, existing chunk-size warning.
- `git diff --check`: passed.
- Canonical local stack rebuilt via read-only Cognito precheck and `bash scripts/start-local-ready.sh`. Example-account sign-in/session/sign-out readiness passed. Running container SHA-256 matched FlightCheckout.jsx, SearchSelect.jsx, search-select.css, flight-checkout.css and travel-search.css. URL http://localhost:5174.

## Actual Chrome DevTools verification

Authenticated supplied example account in isolated Chrome DevTools MCP. Restored only the verification-owned Plan; fresh real sandbox BUD–LIS search and one verify (200) reached checkout, then Passenger details. All passenger data are fictional test defaults. Desktop 1440×1000; mobile viewport 390×844.

- Nationality opened a ten-option list with Previous/Next and page count. Next showed 11–20 of 249, page 2 of 25.
- Searched Iceland, selected with ArrowDown/Enter: nationality became Iceland; passport issuing country remained Hungary.
- On mobile the passport country picker filled the form width. Ten choices plus pagination fit visibly; no horizontal overflow.
- An unmatched query displayed No matches. Escape closed it and retained Hungary. Searching Hung narrowed to one option; Enter selected Hungary.
- Moving back to itinerary and forward to passengers retained the distinct values. Consent remained unchecked. No actual prebook, reserve, payment or booking request.
- Existing flight-search Country of residence picker still opened ten options with its styled popover after moving shared CSS.
- Console/network: existing Vite/Lit and form-name advisories; restored old research/snapshot returned 409 before fresh search (existing expired observation), recovered normally. Verify returned 200, no new changed-path error.
- Inspected every saved screenshot: picker text, search/empty states and page controls readable; no horizontal clipping. Overlay intentionally covers later fields while open.
- Test Plan soft-deleted afterwards; API read-back confirmed deleted/recoverable. Browser left at Plans, app running.

## Evidence

- [User before-state](plan/before-native-menu.png)
- [Existing picker used as design reference](plan/existing-picker-reference.png)
- [Desktop nationality](implementation/nationality-desktop.png)
- [Second page](implementation/nationality-page-two.png)
- [Mobile passport country](implementation/passport-country-mobile.png)
- [Mobile search](implementation/country-search-mobile.png)
- [No matches](implementation/no-country-matches-mobile.png)

No push/merge/deployment; wider Phase18 acceptance unchanged.
