---
sketch: 005
name: places-list-map
question: "How can saved places use a clear list/map switch and small pins with less visual noise?"
winner: "A"
tags: [canvas, places, map, list]
---

# Places: list and map alternatives

Based on fresh origin/main 201fd74. User requested working alternatives before production implementation. GSD sketch quick direction: small conventional pins, explicit list/map views, retain Show all places, remove decorative copy and oversized presentation.

Run from repository root: `python3 -m http.server 5187 --bind 127.0.0.1 --directory .planning/sketches`

Open http://127.0.0.1:5187/005-places-list-map/?variant=A (or B / C). Use the floating switcher or left/right arrows. Prototype tools provide light/dark, phone/tablet widths, loading, empty, and map-error states.

- A — Simple tabs: compact rows, inline place details, full-width map. Closest to the existing component footprint.
- B — Map explorer: map first, persistent side inspector; details stack below on phones. Better for geographic browsing, requires more horizontal room.
- C — Collections: category navigation with grouped rows, separate full map. Better for organizing larger lists, more navigation for six places.

Acceptance: switch views; pan/zoom; inspect small pins; show all; filter/search; explicitly add catalog places; edit notes/name/category; confirm removal and undo; responsive light/dark; empty/loading/map-error recovery. All place changes in memory only and reset on refresh. No auth, real plan writes, live place search, provider ratings or booking claims. External OSM map tiles are live. Leaflet 1.9.4 is locally vendored, attribution retained.

This is a standalone GSD HTML sketch in a simulated version of the current Planning Canvas, following existing sketches 001–004. It is intentionally separate from the authenticated app so the three alternatives are runnable without installing or restarting the app. Production auth and provider map integration still need implementation verification after a design is chosen.

Sources: existing DestinationMap.jsx, CanvasDestinationMap.jsx, design-system tokens, user-provided before screenshot. Map API reference: https://leafletjs.com/reference-1.9.4.html. Map data: https://www.openstreetmap.org/copyright.

## Selected direction — 2026-10-10

User selected A: “A is perfect”, with an explicit requirement to avoid generic AI-looking UI. Preserve plain compact rows, clear List / Map views, small conventional pins, restrained styling, and Show all places. Avoid decorative slogans, sparkle icons, oversized category badges, unnecessary panels, and filler descriptions.

Adding places is still an open product decision. The user finds agent-assisted adding easier and questions the value of the manual Add place control. Proposed direction (not yet selected): use the existing conversation to find or identify a place, show its exact name/address and preview, then let the traveler explicitly add it. Retain direct editing and removal for existing places. If a manual path is retained, keep it secondary and use provider place search, not a form for coordinates or invented locations.

This update records feedback only. The prototype still shows its original Add place interaction; no production implementation has begun. Existing browser evidence remains applicable to the unchanged prototype.

Preserve all variants on this throwaway branch; implement the selected design properly and remove prototype code from the production branch. No implementation issue was supplied.
