# Canvas controls verification — 2026-10-26

## Result
Verified at http://localhost:5190. Main-based application source has a 44px icon-only Show all places button inside the expanded map and the existing merged whole-card flight navigation with no visible Explore flights CTA. No durable Plan data was changed by this verification.

## Root cause and runtime
The shared port 5174 app was replaced by the locrian-peacock checkout after the earlier main startup. Its relevant source files differed from main. This happened again during this run (container creation 07:48:05 UTC), so verification uses isolated container `travella-main-controls-app`, bound to localhost:5190 (auth 8010, agent 8110), image 5b62442870a3. It uses the existing local database and connector services on travella-local-single_default. Other stacks remain running; port 5174 is not this preview.

The existing database is at additive migration 0012, while main has 0011. The exact existing 0012 migration from commit 0922051 is mounted read-only from ~/.cache/travella-main-controls/0012_topic_conversations.py so startup recognizes the schema. No downgrade, revision stamp or volume deletion. The first isolated mount used a temporary path outside Colima's shared paths and failed; relocating that file under the shared home directory resolved it. No application backend code changed.

## Checks
- Build: `npm run build` passed (existing bundle-size advisory).
- Tests: `npm test -- src/features/plans/components/CanvasDestinationMap.test.jsx src/design-system/components/DestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`: DestinationMap and PlanningCanvas passed (27 tests); eight map tests initially failed because host Node 24 exposes unavailable native localStorage.
- Map rerun: `NODE_OPTIONS=--no-experimental-webstorage npm test -- src/features/plans/components/CanvasDestinationMap.test.jsx`: all 8 passed. Total 35 focused tests passed across these runs. No test source changes.
- Local auth checker at TRAVELLA_LOCAL_ORIGIN=http://localhost:5190: sign-in, session and sign-out passed. Chrome DevTools used the supplied example account in an isolated browser context.
- Desktop 1440×1000: selected Activities and expanded the saved place; Show all places reset the active filter to All places, collapsed selection and reframed the map. Button is 44×44 inside a 444px map; no footer reset text.
- Flights: no visible Explore flights text. Hit testing near all four card corners reached the overlay button. Real pointer click and keyboard Enter both opened the flight workspace; Back returned to the canvas with focus on the expected navigation control.
- Mobile 390×844: map 364px high, reset remains 44×44, no document horizontal overflow; reset and flight navigation passed. Layout remained correct after viewport-triggered reload.
- Browser console: no errors; existing Lit development and Google advanced-marker event warnings only. All inspected same-origin fetch/XHR requests returned 200; no failed requests in the final navigation.
- Runtime comparisons: CanvasDestinationMap.jsx, places.css, TravelEntry.jsx, components.css and single-canvas.css all matched this checkout.
- `git diff --check` passed. Backend CRUD and live model/booking tests are not applicable to the two presentational controls; none were performed.

## Evidence
User-provided before screenshots: [map](plan/reported-map.png), [flight](plan/reported-flight.png).
Visual sketches before source edits: [map icon](plan/map-icon-sketch.png), [flight card](plan/flight-card-sketch.png).
Inspected implementation screenshots: [desktop map and flight cards](implementation/desktop-map.png), [mobile map](implementation/mobile-map.png), [mobile flights](implementation/mobile-flights.png).

Chrome DevTools screenshot filePath writes were rejected by its configured workspace-root check. Screenshots were instead returned by the same Chrome DevTools screenshot tool and saved unchanged from their returned PNG bytes via the local filesystem tool. No browser-verification substitution.
