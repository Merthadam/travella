# Map location chooser removal — verified 2026-10-24

Removed the map-only location chooser. The first valid geocode match now frames an empty map automatically; saved pins and restored views retain priority. No durable destination selection changes. Place-card design remains deferred at the user’s request.

## Evidence

- [Before](plan/before.png): supplied user screenshot.
- [Design](plan/design.jpg): authenticated Chrome DOM preview with only the chooser removed, captured before source edits.
- [Implementation](implementation/map.jpg): rebuilt real application, seven saved pins and Show all places.
- [Mobile](implementation/mobile.jpg): 390px viewport, no horizontal overflow; toolbar visible.

## Executed checks

- GSD quick performed inline; prior direct-implementation preference honored.
- Authenticated example account in isolated Chrome DevTools context at http://localhost:5174. Reused its existing session; startup separately verified sign-in/session/sign-out.
- Reloaded rebuilt app: chooser absent. Food filter displayed 3 markers; Show all places restored all 7. Saved canvas snapshot before and after was identical.
- Desktop 1280×900 and mobile 390×844 screenshots inspected: map and remaining control readable, no chooser or overlapping footer.
- Focused component tests: 28 passed across CanvasDestinationMap and PlanningCanvas. Includes new multi-result/partial-match empty-map framing regression and existing stale-response, retry, hidden-map, viewport restore and pin framing coverage.
- Command: `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`.
- `npm --prefix frontend run build`: passed; existing large-chunk advisory.
- Console: no errors; existing Lit development and Google advanced-marker event warnings only. All 22 observed fetch/XHR requests returned 200.
- Local Docker rebuild/readiness succeeded; changed component SHA-256 matches running container source.
- `git diff --check`: passed. No backend CRUD change; no live model call needed. Error/empty-map behavior covered by component tests rather than forcing provider failure in the real browser.

Source commit: 6dd02e1. No push or merge.
