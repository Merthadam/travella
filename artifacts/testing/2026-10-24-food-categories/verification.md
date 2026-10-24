# Food categories — 2026-10-24

## Scope and diagnosis

A real café suggestion became an Activity when added to the canvas. Connector normalization and signed agent projections already preserve Google place `types`; the frontend add handler and preview marker hardcoded `activity`. The connector's activity search does not impose a provider type filter, so café results were valid. Shared frontend classification now uses provider food types for new pins and temporary previews; unspecified/non-food types retain the existing activity fallback. Existing saved pins are not migrated. No backend or signed-contract changes.

Google documents multiple types per place, including `restaurant` and `food`: [official place types](https://developers.google.com/maps/documentation/places/web-service/place-types). The fix uses these supplied facts, not name or description keywords.

## Plan and before state

This is a behavioral correction within the already approved canvas design; no new layout selection. Acceptance: café → Food, museum → Activities, matching preview/saved colours, correct shared filters, no persistence until Save plan, correct reload.

[Before: real café incorrectly under Activities](plan/before-cafe-as-activity.jpg).

## Automated checks

- Red reproduction: `npm test --prefix frontend -- src/features/plans/components/PlanningCanvas.test.jsx -t 'adding a food suggestion'` failed before implementation: expected `food`, received `activity`, using actual provider-shaped `types`.
- Green: `npm test --prefix frontend -- src/features/plans/placeCategory.test.js src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx`: **41 passed**. Covers food/provider-type ordering, non-food and missing types, no inference from names, add/save/remount, preview colour, existing canvas and map behavior. A first reload fixture omitted the required saved context revision; corrected fixture and reran successfully.
- Shared filter suite: `npm test --prefix frontend -- src/design-system/components/DestinationMap.test.jsx`: **5 passed** (executed with an additional unmatched ActivitySuggestions.test.jsx path; no such test file exists).
- `npm run build --prefix frontend`: passed, existing bundle-size advisory.
- `git diff --check`: passed.
- No broad backend suite run: backend code unchanged. No skipped tests in the selected files.

## Authenticated Chrome DevTools check

Used the existing example-account session on http://localhost:5174. Created only a test-owned plan, “Food category verification,” with Lisbon context via the actual API. Before rebuilding, real agent/Google search returned a café and museum; adding Kossies Cafe incorrectly produced Activities 1 (before screenshot).

Rebuilt through `scripts/start-local-ready.sh` after the required read-only Cognito precheck. Sign-in/session/sign-out readiness succeeded. All three changed runtime file hashes matched the app container.

After rebuild, the real conversation search returned Birdie Cafe and Museu Geológico. Browser input automation required native input dispatch to update the controlled textarea after reload; subsequent browser button actions used the actual application handlers. No search response was stubbed.

- Show on map: café preview colour `#B75539`, matching Food.
- Add to plan for both: Food 1 and Activities 1. API readback still had a null canvas snapshot before explicit Save plan.
- Save plan: challenge and PUT returned 200. API readback contained Birdie Cafe `food`, Museu Geológico `activity`.
- Browser reload: both categories and Saved state restored.
- Food filter: only café row and one orange marker. Activities filter: only museum row and one purple marker. All places restored both.
- Desktop 1440×1000: [saved/reloaded result](implementation/saved-food-and-activity.jpg).
- Mobile 390×844: tapped Food filter; [one orange café marker and selected Food filter](implementation/mobile-food-filter.jpg).
- Inspected screenshots: category labels and controls readable, no new overlap/clipping. Existing narrow photo attribution wraps across lines on desktop; untouched by this behavioral fix.
- Application fetch/XHR requests for search, save, and reload returned 200. No console errors; existing Lit development-mode and Google advanced-marker event warnings only.
- Cleaned up only the test-created plan through the real challenge/commit API. Deleted-view read succeeded and active-view read returned 404; local view state removed.

## Limitations

Previously misclassified saved pins keep their category. Places without recognized provider food types retain Activities. This change does not redesign category editing or automatically rewrite durable plans. No push/merge performed.
