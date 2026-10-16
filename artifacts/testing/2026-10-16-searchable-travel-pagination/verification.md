# Searchable travel selectors and ten-result pages

Date: 2026-10-16. Source commit: 4b47e53. GSD quick: 261016-rxj.

## Delivered

Travel destination country, guest nationality, flight residence country and airline filters are searchable controls. Country names and codes match without case sensitivity. Each list shows at most ten choices, with Previous/Next and counts. Arrow keys, Enter, Escape and Page Up/Down work; draft query text does not replace a chosen value. Imported country codes display their names and still submit the original codes.

Stay and flight inventory now uses ten-result pages with controls above and below the results. Filtering/sorting/import/new searches reset the page; comparison selections persist between pages. Short currency/cabin/sort menus remain compact native controls. No backend or durable Plan semantics changed.

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel`: 40 passed, 12 fixture-dependent tests skipped. New coverage checks selection, no matches, dismissal, keyboard paging, imported values, ten-item boundaries, final partial page, comparisons, sorting/filtering/import resets and empty results.
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k actual_sse_to_react -q`: 8 passed, 189 deselected. These supply real generated SSE to the React Canvas/A2UI/manual-navigation journey, including the Canvas test skipped in standalone frontend execution. Research-only fixture tests were not rerun for this manual-search change.
- `npm --prefix frontend run build`: passed; existing large-bundle advisory remains.
- `git diff --check`: passed.

## Authenticated Chrome DevTools verification

Used the existing isolated example-account session on http://localhost:5175. Created only test Plan 785a72e9-260d-4302-abfe-7334aadd9e69 and seeded a Budapest Canvas for February 1–7, 2027, two travelers through the existing confirmed Canvas API. Revisited it, then exercised the actual manual travel pages.

- Chose Hungary using country search and Enter. Provider-backed city lookup selected Budapest. Guest nationality search also submitted Hungary correctly. Native country menus are gone.
- Country choices: 1–10 of 249; Next showed 11–20 with exactly ten options. A nonexistent query showed no matches; Escape restored Hungary. Mobile search for Hun matched Hungary. Light-theme Aus showed Australia and Austria.
- Live sandbox stay request: HTTP 200, 30 properties. Pages one, two and three each rendered exactly ten. Last-page Next disabled. A comparison chosen on page one persisted on page two. Budget zero showed the empty state without paging; Reset filters returned to 1–10 of 30.
- Live sandbox return flight request BUD–LIS: HTTP 200, 100 itineraries. Next showed 11–20 of 100 with exactly ten cards. Airline search KLM + Enter reduced the result set to nine KLM itineraries and reset to page one.
- Loading state observed. One flight request was deliberately cancelled by switching to Stays; returning and searching again succeeded. This explains the single ERR_ABORTED request. No failed provider HTTP responses were observed.
- Chrome console: no errors; existing Lit development-mode warning only. Auth/session, capabilities, city/airport lookups and completed search requests returned HTTP 200.
- Desktop 1440×1000 and mobile-width 390×844 layouts inspected. No horizontal overflow. Dark and light country controls and mobile result paging were exercised. Screenshots visually inspected for legibility, overlapping controls and card layout; the bounded dropdown scrolls with the page if opened near the viewport edge.
- Saved Plan revision remained 2 after searches/filtering/paging. No booking was made. Deleted only the test Plan through the UI, then GET with view=deleted returned HTTP 200 and lifecycle=deleted. Other Plans remain untouched.

## Runtime

Applied travella-local startup skill: read-only Cognito precheck passed; rebuilt only Compose project travella-research-preview on frontend 5175/auth 8004/agent 8104. Authentication smoke sign-in/session/sign-out passed. SHA-256 checks matched SearchSelect.jsx, TravelSearch.jsx and travel-search.css between checkout and running app. The original 5174 stack and database volumes were preserved.

## Evidence

- Before: [native country menu](plan/native-country-before.png)
- [Ten country choices](implementation/country-ten-choices.jpg)
- [Stay page two](implementation/stays-page-two.jpg)
- [Flight page two](implementation/flights-page-two.jpg)
- [Mobile result paging](implementation/mobile-results.jpg)
- [Mobile country search](implementation/mobile-country-search.jpg)
- [Light country search](implementation/light-country-search.jpg)

Screenshots show sandbox inventory, not confirmed bookings. Full unrelated application suites were not rerun.
