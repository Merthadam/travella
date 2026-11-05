---
status: complete
---

# Implement selected linked hotel map A

Traveler selected A and requested inactive hotel pins hidden or translucent, with activity pins unaffected. Use translucent non-selected hotel markers while inspecting a hotel; selected hotel and all saved/activity/reference pins remain opaque. Clearing inspection restores the hotel markers.

Prototype source: `prototype/stay-map-link-20261104` (`1ac82a0`, state `7ef95ee`). Production work starts from `descriptive-find`, without prototype fixture, switcher or routes.

1. Reuse TravelSearch, StayLocationFilters and CanvasDestinationMap. Scope inspected hotel to the current search. Link pin/card/current-search chat references, number the current page's hotel pins, and fade other hotel pins. Keep inspection temporary, independent of saved choices or location filters.
2. Implement A's independently scrolling sidebar and results beneath collapsible existing search fields; retain mobile map/results navigation and all real search controls. Preserve historic chat detail behavior, exact offer/room review, and no-coordinate honesty.
3. Add focused regression coverage for selection, fading only hotels, pagination/new-search resets, current versus historical references, and absence of mutations on inspection.
4. Verify with example-account Chrome DevTools using real hotel search, map/card/chat interactions, independent scrolling, mobile, reload, console/network and local-stack source hashes. Run affected frontend tests/build. Record source/evidence and commit.

Acceptance: clicking a hotel pin reveals and highlights its card; card action centers/highlights its numbered pin; other hotel pins fade while activities remain fully visible; only the current page contributes hotel pins; manual paging/filtering/new searches cannot retain stale selection; current chat references reveal matching cards across pages without treating historical offers as current. Full search and exact selection/checkout behavior remain available.
