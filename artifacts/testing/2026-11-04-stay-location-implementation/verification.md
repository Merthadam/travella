# Accommodation location filters — verification

Status: complete. Implemented and verified locally on 2026-11-04. Preview: http://localhost:5202.

Approved design A sits below the accommodation destination/date/guest search. The traveler approved flexible individual/category selection and the activity-aware minimap. [Desktop design](plan/approved-a-desktop.png) and [mobile design](plan/approved-a-mobile.png) preserve that decision. Prototype branches retain the throwaway designs; the prototype route, source, script and Vite config have been removed from this implementation branch.

## Implementation

Reuses existing search fields, result filters/cards, revision-controlled workspace, conversation, destination lookup and Google Maps adapter. Manual and agent searches share authoritative saved-place/provider-reference resolution, equal-weight mean-distance ranking and strict distance-to-every-place filtering. The server replaces supplied names/coordinates with observed evidence. Map inspection is read-only; Include/Remove edits the draft and Apply performs a search. Agent-mentioned places are temporary, validated references, and saved-place mentions follow current saved geometry.

## Automated checks executed

- `pytest -q` across `services/agent/tests/test_stay_location.py`, `test_specialist_worker.py`, `test_specialist_tools.py`, `test_travel_workspace_journey.py`, `test_travel_api.py`, `test_travel_registry.py`, `services/mcps/tests/test_liteapi.py`, and `services/auth/tests/test_travel_proxy.py`: **136 passed**.
- After final resolver bounds/timeout and agent budget changes: **43 targeted backend tests passed**. Exact small-radius regression: **6 location tests passed**.
- `npm test -- --run src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/StayLocationFilters.test.jsx src/features/plans/travel/StayDestination.test.jsx src/features/plans/canvasViewState.test.js src/plansApi.test.js`: **112 passed**. Later empty-state/search checks: **38 passed**. Final reference copy and stale map-coordinate checks passed; final `StayLocationFilters.test.jsx`: **3 passed**.
- `npm run build` and `git diff --check`: passed. Existing large-bundle advisory and Python dependency deprecation warnings remain.
- Coverage includes deduplication, forged-coordinate replacement, foreign/missing place rejection, mean-distance ranking, hard intersection, unknown coordinates, correct units, exact hotelIds queries, reference lookup scope, authenticated manual/agent parity, changed-geometry recovery rejection, stale-run protection and ephemeral mention validation.

## Live browser checks

Used real Chrome DevTools MCP with the example account in isolated Compose project `travella-stay-location`. Dedicated Lisbon test Plan: 12–16 May 2027, two adults, São Jorge Castle, Praça do Comércio and Time Out Market. Browser search results came from the real LiteAPI sandbox; automated provider fixtures were confined to tests. No pre-existing user Plan was modified. The dedicated local fixture remains available for review.

- Selected activities by category and a food stop individually. Live search returned **28 hotels** with average/farthest straight-line distances. [Final desktop](implementation/final-search-desktop.png).
- Inspected real map pins without dirtying or applying criteria. Toggled the hotel layer to inspect activities independently. [Desktop pin](implementation/activity-pin-desktop.png), [mobile pin](implementation/activity-pin-mobile.png).
- A strict **500 m** limit from every place produced an empty intersection; **2 km** returned matching hotels. No radius was silently relaxed. [Empty state](implementation/strict-radius-empty-desktop.png).
- A real agent turn changed the shared search to **1.5 km from every selected place**, preserved dates/guests, and returned **20 properties**. Controls included the custom 1.5 km value. [Agent results](implementation/agent-location-desktop.png).
- Enabled Mentioned in chat, deselected Time Out Market, inspected its temporary mention, then explicitly included it in the draft. Pin inspection itself did not apply a search or save a Plan change. [Mention layer](implementation/chat-mentioned-place-desktop.png).
- Looked up Rossio, selected the observed **Praça Dom Pedro IV** reference, resolved and displayed its real point, then removed it. [Named reference](implementation/named-reference-desktop.png).
- At **390 × 844**, no horizontal overflow; real activity pins opened the correct details without editing criteria. [Mobile layout](implementation/location-mobile.png).
- Reload retained selected places and applied matching mode. Following a service rebuild, the old registry snapshot returned 409 with an honest unavailable-results message; a fresh search and subsequent snapshot recovery returned 200.
- Final runtime files matched host SHA-256 hashes for eight representative frontend/agent/connector files, including the last map-coordinate change. Used `scripts/start-local-ready.sh`; example sign-in/session/sign-out readiness checks passed.
- Visually inspected the saved screenshots. Final network reads/search/recovery succeeded. Console inspection found existing Lit development and Google Maps event API warnings, plus the handled stale-snapshot 409. A transient 503 on canvas/context/conversation/capability reads recovered through the existing Retry controls; all four subsequently returned 200. No container restart/OOM occurred. Local transient service availability remains an environment limitation, not a claimed fix in this feature.

## Issues found and corrected

Shared marker styles were scoped to the main canvas, leaving the new minimap markers without visible dimensions. Moved them to the shared map adapter stylesheet and verified visible, clickable markers. LiteAPI rejected retrieval radii at/below 1000 m; retrieval now uses at least 1001 m as a candidate superset, while local matching enforces the exact requested radius. The 100 m unit case and real 500 m empty search verify that distinction. Map mention tests also prevent obsolete saved coordinates from surviving a place edit/removal.

## Boundaries and remaining limitations

No CRUD handlers or durable Plan data model changed. Preferences remain temporary tab research state; agent map mentions clear on a new run/reload. Inventory is capped at 30 and explicitly non-exhaustive. Distances are straight-line, not routed walking/transit times. City-center/neighborhood searches use an explicitly chosen named reference, never an assumed city centroid. Dense hotel pins can overlap on a minimap; the hotel toggle and accessible place list provide independent inspection.

All applicable feature verification gates passed. No deployment, merge or booking was performed.
