# Map toolbar removal

GSD quick 261024-l6e. Prior direct-implementation choice honored; Travella planning/testing and local-stack skills applied.

Removed Search this map area and its unused bounds/callback/local chat-area state. Show all places remains. No durable data contract changed.

Evidence: [before](plan/before.png), [design preview](plan/design.jpg), [implementation](implementation/map-toolbar.jpg). Design preview temporarily removed the button in the managed browser DOM before source edits; the implementation capture uses rebuilt source.

Checks:
- Existing CanvasDestinationMap and PlanningCanvas suites: 27 passed with `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`.
- `npm --prefix frontend run build`: passed; existing large-chunk advisory only.
- `git diff --check`: passed.
- Chrome DevTools authenticated example-account journey: Search this map area absent after reload; footer contains only Show all places. Filtered to three food rows, clicked Show all places, observed seven rows and seven map pins. API snapshots before/after were identical.
- Screenshot inspected: remaining footer control visible and readable. Existing optional ambiguous-destination choices are unchanged.
- Console: no errors; existing Lit development and Google marker advisories only. Relevant session/Plan/canvas/provider requests returned 200.
- Local-stack rebuild and example-account sign-in/session/sign-out readiness passed. SHA-256 hashes of both changed source files matched the running container. No Plan data was edited or deleted; no test records needed.

Implementation commit: `5239c66`. No blocked or failed checks. Broader suites and new tests were unnecessary for this removal.
