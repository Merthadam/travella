---
sketch: 005
name: places-list-map
question: "How can saved places use a clear list/map switch and small pins with less visual noise?"
winner: null
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

Winner pending user review. Preserve all variants on this throwaway branch; after selection, record the decision, implement properly, and remove prototype code from the production branch. No implementation issue was supplied.
