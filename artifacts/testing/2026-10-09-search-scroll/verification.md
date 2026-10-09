# Search scrolling repair — 2026-10-09

## Scope and acceptance

Repair scrolling in the approved classic search layout A. Users must reach accommodation and flight results below the first viewport, reach Show more, and return to the canvas. Keep desktop and mobile content within the viewport width. No backend or durable Plan changes.

## Reproduction and cause

The [user screenshot](plan/user-reported-clipping.png) showed Milan accommodation results for October 23–26, 2026; Italy; Hungary nationality; EUR; one room, two guests. Reproduced the same live sandbox search in Chrome DevTools on localhost:5474, signed in with the supplied example account.

At 1440 × 900, the workspace body was 828px tall with hidden overflow. Travel mode had changed its layout to block, and the inner canvas expanded to 3355px rather than remaining a bounded scrolling region. Ordinary Page Down did not move it (scrollTop remained zero). [Before screenshot](plan/before-pagedown-clipped.png).

The repair keeps a single constrained grid track, gives the inner canvas 100% height and min-height zero, and makes the search region focusable. These rules apply only while a travel screen is open.

## Executed browser checks

All final checks used the rebuilt application with no injected CSS. Temporary diagnostic CSS was discarded by using a fresh isolated Chrome DevTools browser for final verification. No script assigned scrollTop or called scrollTo/scrollIntoView to establish successful scrolling; movement was checked after native Page Down key events.

| Journey | Result |
| --- | --- |
| Milan accommodation search | HTTP 200; 30 sandbox stays. |
| Desktop Page Down after clicking the search heading | Inner height 828px, content 3355px; scrollTop advanced from 0 to 820px. [Screenshot](implementation/accommodation-pagedown-desktop.png). |
| Desktop list expansion | Loaded 20 results, scrolled with Page Down to scrollTop/maxScroll 5108px; Show more was visible at y=683. Activated it to load all 30. [Screenshot](implementation/accommodation-bottom-desktop.png). |
| Mobile accommodation, 390 × 844 | Page Down reached the final hotel and footer; scrollTop/maxScroll 16488px. Document width and viewport width both 390px. [Screenshot](implementation/accommodation-bottom-mobile.png). |
| Budapest–Milan return flight search, same dates | HTTP 200; 100 returned sandbox itineraries, first 10 displayed. |
| Mobile flight results | Page Down reached the last displayed flight, Show more and footer; scrollTop/maxScroll 5325px. No horizontal overflow. [Screenshot](implementation/flights-bottom-mobile.png). |
| Desktop flight results | Page Down moved scrollTop to 788px in the 828px-high region. [Screenshot](implementation/flights-pagedown-desktop.png). |
| Return to canvas | Travel class removed; normal inner region remained 828px high with 2124px content and overflow auto; search-only tabindex removed; focus restored to Explore flights. Reopening accommodation retained results. |
| Console and network | No application console errors; existing Lit development-mode warning only. Capabilities, destination suggestions, hotel search, airport lookups and flight search all HTTP 200. |

Inspected every saved browser screenshot for clipping, overlap, readability and correct state. The final hotel/footer and Show more controls are accessible within the scrolling viewport. Native wheel/touch hardware was not separately automated; browser verification used native keyboard scrolling at desktop and mobile dimensions.

## Build and running container

- `npm --prefix frontend run build`: passed; existing bundle-size advisory remains.
- `git diff --check`: passed.
- Read-only Cognito precheck: passed against the configured existing pool/client.
- Rebuilt `travella-liteapi-fresh` with `scripts/start-local-ready.sh` at http://localhost:5474. Health and example-account sign-in/session/sign-out checks passed.
- SHA-256 matches for `PlanningCanvas.jsx` and `travel-search.css` between the checkout and the final running app container.
- No new unit tests were added for this small layout correction. Full application suites were not rerun; the real-browser reproduction and scrolling checks are the applicable regression verification. No CRUD operations changed, so persistence mutation checks are not applicable.

The existing plan was used only for read-only searches. No plan content was saved, no supplier handoff occurred, and no booking was attempted.
