# Places prototype verification — 2026-10-10

Scope: three isolated UI alternatives, based on origin/main `201fd74`; no production implementation or backend changes. Workflow: GSD sketch 005 + prototype UI + mandatory Travella testing skill. User already requested interactive alternatives; winner remains pending.

Run: `python3 -m http.server 5187 --bind 127.0.0.1 --directory .planning/sketches`
Preview: http://127.0.0.1:5187/005-places-list-map/?variant=A (also B, C).

Chrome DevTools MCP 1.10.1 exercised the actual browser. The configured shared browser could not launch because its profile was owned by another live Chrome process. Used a separate `--isolated --headless` Chrome DevTools MCP instance via its MCP SDK; did not close or alter the existing browser. This was Chrome DevTools, not a substituted browser tool.

## Executed checks

For each of A, B, C:

- List view rendered six sample places; inspecting Sforzesco Castle showed the matching details.
- Edit note to “Meet here at 10”, submit, observe updated rendered note.
- Request removal: six places remained until confirmation; confirm: five remained; Undo restored six.
- Add Parco Sempione from sample search catalog, enter a note, confirm: seven places, selected new place.
- Food filter: two rows; Luini search: one row; nonmatching query: empty state; clear: all places restored.
- Map: seven small conventional pins, zoom and pan, select a marker, inspect details. Show all places cleared search/category/selection and fit all places.
- Simulated map error: fallback shown; List still contained seven places. Loading and empty states rendered. Reset restored six fixtures.
- Desktop captures at 1440 px; phone captures with DevTools device emulation at exactly 390 × 844 px (DPR 1, mobile/touch). Asserted document width = viewport width, no horizontal page overflow. Category strips intentionally scroll horizontally.
- Phone Map and selected-place detail screenshots for every alternative. Light and dark map inspected.

Also verified keyboard arrow variant switching, shareable `?variant=B` preserved on reload, and sample place data reset to six on reload. No durable persistence is intended.

Initial checks found duplicate SVG symbol/control IDs interfering with search and the map container. Renamed icon IDs and reran all affected journeys successfully. Corrected singular place counts and increased dark-map legibility after visual inspection.

Console: no error or warning messages. Final full network capture: 24 requests, all 200/304, including HTML, local CSS/JS, and OpenStreetMap tiles. No backend/API mutation requests.

Screenshots visually inspected for spacing, readable content, pin overlap, and horizontal clipping. Floating prototype controls overlay a portion of full-page phone captures; they are evaluation controls, and underlying content remains reachable by scrolling. No unresolved implementation failure found in the prototype journey.

## Evidence

- Before: [user screenshot](plan/before.png)
- A: [desktop](plan/a-desktop.png), [phone list](plan/a-mobile.png), [phone map](plan/a-mobile-map.png)
- B: [desktop](plan/b-desktop.png), [phone](plan/b-mobile.png), [phone selected map](plan/b-mobile-map.png), [dark](plan/b-dark.png)
- C: [desktop](plan/c-desktop.png), [phone list](plan/c-mobile.png), [phone map](plan/c-mobile-map.png)

## Limits

Sample Milan data and in-memory edits; catalog search is simulated, map tiles are live. The surrounding Planning Canvas is a static contextual shell. No authenticated journey is included, so example-account login is not applicable to this sketch. Production integration, real Google Maps provider behavior, backend persistence, and production build/regression checks are not covered. Those gates apply after the user selects a design and production implementation begins. No unit tests added for throwaway prototype code.
