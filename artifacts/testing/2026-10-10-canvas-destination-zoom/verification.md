# Initial destination framing

Verified 2026-10-10 at http://localhost:5474 with Chrome DevTools MCP and the configured example account. Existing design retained; this fixes behavior without a layout change.

## Cause and fix

The trip had Milan as its only stated candidate, but no confirmed final destination. The canvas map previously geocoded only a final destination, so it remained at world zoom. The canvas now supplies a transient single-candidate map hint. A chosen destination takes precedence; multiple candidates do not cause an arbitrary choice. This does not select a destination, add pins or persist canvas data.

Framing waits until the container has dimensions, including when generation starts with mobile chat visible. Google documents that `fitBounds` does nothing for a zero-size hidden map: [official Maps reference](https://developers.google.com/maps/documentation/javascript/reference/map#Map.fitBounds). Once framed, resizing and appearance changes preserve the explored view. City/region geographic bounds are preferred over a potentially much wider suggested viewport; countries retain the provider's suggested overview.

## Browser verification

- Captured the original world view for the existing single-candidate Milan context. No changes were saved to that plan.
- Created a separate test plan and explicitly added Milan as a candidate. Clicked Generate plan on a 390×844 viewport. Generation completed while Conversation was visible; the hidden map had width 0 and label Map of Milan.
- Opened Plan & map: the map acquired width 324 and framed Milan automatically. No manual zoom/pan was used. Mobile screenshot shows Milan and its immediate surroundings; no horizontal overflow or clipped map controls.
- Inspected the desktop view at 1440×900, then reopened the canvas without regeneration: destination framing also worked on initial open. Screenshot omits unrelated profile-derived research by using this reopened draft.
- A read-only API check after generation confirmed candidates `["Milan"]`, empty final destination, and no saved canvas snapshot. The map hint did not silently mutate the Plan.
- Final browser network check: auth, context, canvas read, generation event stream and map viewport requests returned 200. Console showed only the existing Lit development-mode warning; no application errors.
- Temporary test plan soft-deleted after verification; existing user plan retained.

## Evidence

- [Before: world view](plan/before-world-view.png)
- [Desktop destination view](implementation/generated-milan-desktop.png)
- [Generated mobile destination view](implementation/generated-milan-mobile.png)

Screenshots visually inspected for framing, labels, clipping and layout. The first browser iteration revealed that Google's suggested Milan viewport was much wider than its actual geographic boundary; the final implementation and screenshots use that boundary.

## Checks

- `npm --prefix frontend test -- src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx` — 10 passed.
- After adding failure/retry coverage, `npm --prefix frontend test -- src/features/plans/components/CanvasDestinationMap.test.jsx` — 4 passed (11 distinct focused tests overall).
- Covered single-candidate hint without persistence, multiple-candidate fallback, final destination precedence, hidden-to-visible framing exactly once, city bounds priority, stale geocoding suppression, failed lookup/retry, and preservation of an explored viewport across theme changes. Existing canvas chat/booking tests also passed.
- `npm --prefix frontend run build` — passed; existing bundle-size warning.
- `git diff --check` — passed.
- Read-only Cognito precheck and local launcher rebuild/authentication check passed. Running container hashes match CanvasDestinationMap, PlanningCanvas and usePlanningCanvas from this checkout. Volumes preserved.

No backend CRUD contract changes. No new saved map position or destination-selection behavior. Error/retry was exercised in focused tests; no provider outage was induced in the final browser run. Full unrelated suites were not rerun.
