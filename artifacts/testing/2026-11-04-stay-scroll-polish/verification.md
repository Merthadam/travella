# Accommodation scrolling and search-details refinement

Completed 4 November 2026. User reported poor scrolling and sloppy search details in selected layout A. Continued the already selected design; no new prototype decision required.

## Changes

- Replaced the bare search disclosure text with a structured destination, readable dates, guests and rooms summary. It describes the applied search while edited fields remain a pending next search.
- Opening search details uses the available workspace for the editor, with the browsing panes temporarily hidden. Removed the 40dvh nested form scroll box and capped notice scrolling. The return control and submit footer stay reachable. Closing a scrolled editor resets its outer scroll and preserves the exact results position.
- A hotel card click highlights without scrolling the card under the pointer. Map/chat selections reveal the card by scrolling only the results pane, instead of scrollIntoView moving any ancestor. Paging likewise resets only the results pane. Current chat references close an open editor so the referenced result can be seen.
- Kept desktop sidebar/results independence and mobile map/results switching, with other hotels translucent and activities opaque.

## Executed checks

- Canonical stack rebuilt from this worktree at http://localhost:5202. Existing Cognito configuration precheck and launcher sign-in/session/sign-out readiness passed. Both changed runtime source files match container hashes: [source hashes](source-hashes.txt).
- Real Chrome DevTools MCP, authenticated configured example account: successful manual LiteAPI sandbox search populated ten first-page hotel cards. Required destination-selection validation was observed before selecting the supplier suggestion and submitting successfully. Subsequent reload recovered results.
- At 1440×900, confirmed only sidebar/results scroll during browsing; PageDown moves results without moving sidebar or outer page. Clicking a visible hotel preserves results scroll. A map selection reveals its card within the result pane. Supplemental unobscured-marker checks asserted the exact matching hotel ID on desktop and mobile.
- Opened editor, edited and restored check-in date, confirmed summary kept applied dates, and returned to the exact previous results scroll position. Editor occupies one scrolling surface rather than squeezing results below it.
- At 390×844, confirmed one editor scroll area, reachable sticky return control after End, no horizontal overflow, reset editor scroll on close, and map/card navigation. Existing fade behavior remains: nine other hotel markers muted and activity markers opaque.
- Visually inspected development light-theme editor/browse captures and final canonical dark-theme desktop/mobile captures, including the editor at its top and after scrolling. Final main browser walkthrough: zero console errors and zero failed fetch/XHR requests. Existing Lit development and Maps event API warnings remain. [Browser log](browser-checks.txt).
- Four focused frontend suites: **135 tests passed**. New regressions cover preserving card-click scroll, scrolling only the results pane for external selection, and applied-summary honesty while editing. [Test output](frontend-tests.txt).
- Production build and `git diff --check` passed. Existing bundle-size advisory remains. [Build output](build.txt).

Browser setup initially raced asynchronous recovery and existing results text; assertions were rerun after the actual new search completed. One overlapped hotel marker hit the place/marker above it, so exact-identity verification used an unobscured marker. Geographic marker overlap remains existing behavior; no clustering change was made. Keyboard scrolling and actual browser interactions were exercised; a physical trackpad gesture was not separately automated. No backend CRUD change, durable traveler choice, or booking was made. Broader phase acceptance is unchanged.

## Evidence

- [Previously selected A](plan/selected-A.png)
- [Before: initial search](plan/before-browse.png)
- [Before: collapsed search and map](plan/before-search-details.png)
- [Updated browsing](implementation/browsing-desktop.png)
- [Updated search editor](implementation/search-editor-desktop.png)
- [Mobile editor top](implementation/search-editor-mobile-top.png)
- [Mobile editor scrolled](implementation/search-editor-mobile.png)
- [Mobile map](implementation/map-mobile.png)
- [Mobile results](implementation/results-mobile.png)
