# Activity chat prototypes — browser review

Date: 2026-10-08. Workflow: GSD sketch + UI prototype, approved by the user.
Question: how should a few Google Maps-style activity choices appear inside the
canvas side chat? User selected C — Place explorer on 2026-10-08.

## Running preview

http://localhost:5178/004-canvas-activity-chat/?variant=A

One local command from the repo root:

```sh
python3 -m http.server 5178 --bind 127.0.0.1 --directory .planning/sketches
```

The isolated, unauthenticated fixture reproduces the current canvas's visual
context. It never calls the real app, Claude, Maps or CRUD. No example-account
login was needed because this is not an authenticated product journey.
The production container and its data are unchanged.

## Manually exercised with Chrome DevTools

| Journey | Observed result |
| --- | --- |
| A: Show on map | A preview pin and popup appeared; added array stayed empty. |
| A: Add | Added badge, purple pin, counter and unsaved draft status updated. |
| B: Next activity | Carousel moved to the next card; adding it preserved horizontal position. |
| B: Save plan | Explicit simulated-save feedback; no persistence or network mutation. |
| C: Select third row | Selected row and expanded card changed to Museum der Moderne. |
| C: Preview, add and remove | Selection reflected in the map; add/remove changed draft pins and badges. |
| Chat: "add the first two" | Both first items added without duplicates; short acknowledgement appeared. |
| Mobile: preview then add | Switched to Plan & map; popup Add updated draft; Conversation tab returned to chat. |
| Loading / empty / error controls | Correct simulated content displayed; existing added item retained; Retry restored three choices. |
| Close/reopen chat | Canvas expanded; Open chat restored the panel and retained in-memory state. |
| Reset and reload | Local draft cleared; URL-selected variant survived reload. |
| Desktop 1440 × 1000 | All three layouts viewed and captured alongside the canvas. |
| Mobile 390 × 844 | All three layouts viewed and captured; document width remained 390. Fixed a clipped variant selector before final capture. |
| Assets and console | Three photos loaded; no console warnings/errors. Local assets 200, cached HTML 304; direct preview URL 200. |

## Compare the designs

| Variant | Desktop | Mobile | Tradeoff |
| --- | --- | --- | --- |
| A — Place cards | [Screenshot](plan/A-place-cards.png) | [Screenshot](plan/A-mobile.png) | Details and actions on every card; more vertical scrolling. |
| B — Shortlist | [Screenshot](plan/B-shortlist.png) | [Screenshot](plan/B-mobile.png) | Larger photos and focused browsing; other options sit off to the side. |
| C — Place explorer | [Screenshot](plan/C-place-explorer.png) | [Screenshot](plan/C-mobile.png) | Scan all choices first, then inspect one; adds a selection step. |

[Mobile added-pin state](plan/mobile-added-map.png)

## Boundaries

- No automated tests were added or run.
- These are visual A2UI component proposals, not connected A2UI protocol rendering.
- Search, ratings, map geometry, chat replies and saves are simulated and labeled.
- Representative photos are bundled with [credits](../../../.planning/sketches/004-canvas-activity-chat/assets/PHOTO-SOURCES.md).
- No real account, Plan or preference was modified. No cleanup of application data was needed.
- Preserve source on `prototype/canvas-activity-chat`; implementation will follow the selected C design.
