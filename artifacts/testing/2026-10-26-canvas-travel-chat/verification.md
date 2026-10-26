# Canvas-consistent travel chat verification

Date: 2026-10-26. GSD quick 261026-c0h. Local URL: http://localhost:5174.

## Scope and design

Shared ChatHeader and ChatComposer now serve Canvas and both travel discussions. Full-height desktop dock, 56px collapse rail, compact navigation/search headings, context inside chat, starter drafts, and explicit property/flight question buttons. Manual search, filters, room/fare details, independent topic histories and confirmation contracts are retained.

User declined interactive alternatives earlier in this session. Rendered desktop/mobile outline was captured with Chrome DevTools and inspected before implementation: [desktop](plan/desktop.png), [mobile](plan/mobile.png), [outline](plan/layout.html). [Previous mobile layout](plan/before-mobile.png) retained.

Booking.com inspiration: contextual property questions alongside structured browsing, documented in [Booking's 2024 feature announcement](https://news.booking.com/bookingcom-enhances-travel-planning-with-new-ai-powered-features--for-easier-smarter-decisions/). This change does not implement Booking's Smart Filter or claim parity/current feature availability.

## Automated checks

- `npm --prefix frontend test -- src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`: 51 passed, 1 conditional SSE fixture skipped. Includes Canvas send/collapse, separate topic history and drafts, manual browsing, result question safety, exact-choice confirmation, stale offers/cancellation, editable starter prompts and Shift+Enter.
- `uv run --locked pytest -q services/agent/tests/test_canvas_travel.py -k actual_sse_to_react`: 8 passed, 189 deselected. Executes the actual Python SSE-to-React fixture path skipped by plain Vitest. Existing dependency deprecation warnings.
- `npm --prefix frontend run build`: passed after final CSS adjustment. Existing large-chunk advisory.
- Initial component run caught the renamed result-button assertion; updated it and reran all four files successfully.

## Chrome DevTools journey

Used the real Chrome DevTools MCP browser with the example account and the existing test Plan “Focused travel verification · Lisbon”. No personal plans modified; no new durable preference, option selection or booking performed in this correction.

- Example account sign-in succeeds; persisted stays/flights discussions and unbooked preferred choices restore.
- Canvas chat collapse/reopen remains functional using the extracted shared controls.
- Desktop 1440×1000: dock starts at y135, height865, width420; independent results/history scrolling, composer stays at viewport bottom.
- Manual stay search: Lisbon, 12–17 May 2027, two adults, Portugal destination and Hungary nationality. Provider returned 28 stays. Price/photos/room and question controls render.
- Collapse stay chat, then “Ask about this stay”: chat reopens, editable draft names Meliá Lisboa Aeroporto with dates/observed price, input receives focus, results remain visible; no automatic chat turn or choice.
- Manual return flight search: BUD–LIS, same dates/party and Hungary residence. Provider returned 100 return flights. “Ask about this flight” prepares its own draft alongside flight cards.
- Switch back to Stays: prior stay draft, 28-result list and stay history remain; Flights has a separate draft and history.
- Mobile 390×844: browse/chat tabs; stays history restores after reload; no horizontal overflow (scrollWidth390). Collapse returns to Browse stays and focuses that tab.
- Console: no application errors; existing Lit development-mode and Google Maps event API advisories only. Post-login session, Plan and topic reads returned200. Initial rebuild invalidated the old browser session; explicit login restored it.
- A six-pixel mobile height mismatch found during inspection was corrected to match the actual72px app header. Final check passed for both topics: composer bottom844 matches viewport844; scrollWidth390 matches width390. Final desktop and mobile screenshots inspected with no clipping or overlap.

## Limits

This is a frontend correction. Live assistant answer quality was not re-evaluated and no new model turn was requested; Phase18 full live-quality matrix and user UAT remain open. No CRUD handlers changed. Test-only provider inventory is labeled; the UI does not claim a reservation.

## Final evidence and running build

- [Desktop stays and contextual question](implementation/stays-desktop.png)
- [Mobile browsing](implementation/mobile-browse.png)
- [Mobile Stay chat](implementation/mobile-stay-chat.png)
- [Mobile Flight chat](implementation/mobile-flight-chat.png)
- [Desktop flight results before final context-spacing polish](implementation/flights-desktop-before-context-polish.png)
- Final rebuild completed with sign-in/session/sign-out checker passing. SHA-256 comparisons for ChatControls.jsx, TravelWorkspace.jsx, travel-workspace.css and PlanningCanvas.jsx matched the running container under /app.
- After final CSS polish, repeated the authenticated stay search and contextual draft journey: 28 stays; search and destination lookup HTTP200; session/Plan/topic reads200. Console still has only the two existing advisories above. Mobile topic histories survive reload and retain their unbooked choices. No new model turn was used.
- `git diff --check` passed. Implementation commit: bb64608.
