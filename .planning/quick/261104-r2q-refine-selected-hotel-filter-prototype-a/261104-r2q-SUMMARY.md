---
status: complete
scope: selected A prototype refinement
production_status: not_implemented
---
# Activity-aware minimap

A is the selected design direction beneath the initial accommodation search. Added manual selected-place pins/names, a distinct temporary agent-mentioned activity layer, exact activity inspection, explicit include/remove actions, missing-coordinate labeling, hotel-layer toggle and identified hotel distance comparison. Minimap is also available on mobile. All prototype changes remain in-memory and simulated.

Source/evidence commit: a89d71a.
Primary-source capture: local branch prototype/stay-location-minimap-20261104.
Preview: http://localhost:5201/plans/81a99feb-80d7-4514-9326-b0a7ddc5643e?prototype=stay-location&variant=A
Evidence: artifacts/testing/2026-11-04-stay-activity-minimap/verification.md.

22 Chrome DevTools assertions passed, desktop/mobile screenshots inspected, no final console errors or failed reads, build and diff checks passed. Existing Lit warning and large-bundle advisory only. No CRUD change or live agent/provider behavior claimed. Original implementation spec now requires validated place-reference mentions, manual access to the map and separation of preview from search filters and Plan saves.
