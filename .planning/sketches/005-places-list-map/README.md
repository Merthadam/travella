---
sketch: 005
name: places-list-map
question: "How can saved places use a clear list/map switch and small pins with less visual noise?"
winner: "A"
tags: [canvas, places, map, list]
---

# Places: list and map alternatives

Based on fresh origin/main 201fd74. User requested working alternatives before production implementation. GSD sketch quick direction: small conventional pins, explicit list/map views, retain Show all places, remove decorative copy and oversized presentation.

The complete runnable alternatives are preserved on local branch `prototype/places-list-map` at `606d3a5`. Check out that branch in a separate worktree to run the original prototype. This implementation branch retains the selected decision and screenshot evidence only.

- A — Simple tabs: compact rows, inline place details, full-width map. Closest to the existing component footprint.
- B — Map explorer: map first, persistent side inspector; details stack below on phones. Better for geographic browsing, requires more horizontal room.
- C — Collections: category navigation with grouped rows, separate full map. Better for organizing larger lists, more navigation for six places.

Acceptance: switch views; pan/zoom; inspect small pins; show all; filter/search; explicitly add catalog places; edit notes/name/category; confirm removal and undo; responsive light/dark; empty/loading/map-error recovery. All place changes in memory only and reset on refresh. No auth, real plan writes, live place search, provider ratings or booking claims. External OSM map tiles are live. Leaflet 1.9.4 is locally vendored, attribution retained.

This is a standalone GSD HTML sketch in a simulated version of the current Planning Canvas, following existing sketches 001–004. It is intentionally separate from the authenticated app so the three alternatives are runnable without installing or restarting the app. Production auth and provider map integration still need implementation verification after a design is chosen.

Sources: existing DestinationMap.jsx, CanvasDestinationMap.jsx, design-system tokens, user-provided before screenshot. Map API reference: https://leafletjs.com/reference-1.9.4.html. Map data: https://www.openstreetmap.org/copyright.

## Selected direction — 2026-10-10

User selected A: “A is perfect”, with an explicit requirement to avoid generic AI-looking UI. Preserve plain compact rows, clear List / Map views, small conventional pins, restrained styling, and Show all places. Avoid decorative slogans, sparkle icons, oversized category badges, unnecessary panels, and filler descriptions.

User approved the agent-assisted design direction. A now opens the Plan conversation from a quiet Find places control; named/addressed sample results can be previewed without saving and explicitly added. The manual add form remains only in B/C for comparison. Direct Edit note, Remove, confirmation, and Undo remain available in A.

A is the default refined design; its comparison bar is hidden until Prototype tools → Compare alternatives is enabled. B/C remain accessible by URL. Conversation search is a labeled simulation, not a live agent. All place mutations remain in memory. Production implementation is recorded in `.planning/quick/261010-iw4-implement-selected-places-list-and-map-d/`.

All variants are preserved on `prototype/places-list-map`; runnable prototype code has been removed from the implementation branch. No implementation issue was supplied.

## A refinement plan — 2026-10-10

User approved proceeding with the design and agent-assisted adding. Refine the selected prototype, preserving B/C as references. Keep a quiet Find places entry that opens the plan conversation. Simulate a request, present named/addressed results, preview on map without saving, then explicitly Add to plan. Keep direct Edit note and Remove, confirmed removal and undo. Reduce duplicate detail text, hide empty category filters, make row selection collapsible, preserve map framing, provide clear empty/error states. Verify these journeys on desktop and 390px phone, including keyboard/dialog operation and zero plan changes from searching/previewing. Live agent/provider integration and production implementation are outside this design refinement.
