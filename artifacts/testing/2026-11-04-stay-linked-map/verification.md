# Linked accommodation map A — verification

Completed 4 November 2026 on `descriptive-find`. Local preview: http://localhost:5202.

## Approved design and implementation

The traveler selected A and requested translucent or hidden other hotel pins, with activities unaffected. Implemented 25% opacity for other hotels during inspection; the selected hotel and all activity/food/reference markers remain fully opaque. Clearing inspection restores hotel opacity. Only the current results page contributes hotel markers.

Reused TravelSearch, StayLocationFilters, CanvasDestinationMap and existing chat reference attachments. Cards, map pins and exact current-search chat references share temporary inspection. Map selection reveals the matching card; card selection reveals the map. Desktop sidebar and results scroll independently; compact layouts switch between Hotel results and Map & places. Existing search fields remain editable in a disclosure. Historical references retain their original details; inspection does not save an option or alter location filters.

Prototype source remains on `prototype/stay-map-link-20261104` at `1ac82a0` (state `7ef95ee`). Production started from `descriptive-find`; no prototype fixtures, switcher or routes were copied.

## Executed verification

- Authenticated the configured example account in real Chrome DevTools through the isolated MCP bridge. Canonical Docker app was rebuilt from this worktree; authentication readiness passed and all six changed runtime source hashes matched the container ([source checks](source-hashes.txt)).
- Real agent request searched within 1.5 km of both selected saved places, São Jorge Castle and Time Out Market, preserving dates, guests and nationality. AG-UI populated 22 LiteAPI sandbox properties and collapsed search fields. Reload restored results without persisting hotel inspection.
- Real card and map clicks verified matching numbered selection, selected opacity 1, nine other hotel markers opacity .25 and all three saved-place markers opacity 1. Clearing inspection restored hotel opacity. Activity inspection did not alter filters.
- Result scrolling, including keyboard scrolling, left sidebar and outer pane in place. A map-selected card was visible inside its result pane. Paging supplied only its ten matching markers; a current chat reference navigated back and highlighted the matching hotel.
- Zero-budget filtering produced an honest empty state with no hotel pins; reset restored the results.
- At 390×844, selecting a card opened Map & places; selecting a distinct map pin returned to the matching highlighted card. No horizontal overflow. Dark-theme active tabs were visually distinct after fixing an older button-style override.
- Desktop 1440×1100 and mobile screenshots were opened and visually inspected. The app retained its selected dark theme even with light OS emulation; these captures verify the dark app theme, not a separate light-theme rendering.
- Existing View rooms opened the native room dialog with provider choices and closed back to results. No booking or durable option choice was made. An initial supplemental assertion used an explicit ARIA selector rather than the native dialog element; the corrected native-dialog assertion passed.
- Final main walkthrough: no console errors and zero failed fetch/XHR requests. Existing Lit development-mode and Google Maps marker-event API warnings remain. [Browser check log](browser-checks.txt).
- Focused frontend regression command: `npx vitest run src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/StayLocationFilters.test.jsx src/features/plans/components/PlanningCanvas.test.jsx` from `frontend`: **133 passed across 4 files**. Covers hotel-only fading, map/card synchronization, pagination and search resets, current/hidden/foreign references, absence of inspection mutations and existing flight/canvas/detail behavior. [Test output](frontend-tests.txt).
- `npm run build` from `frontend`: passed; existing large-chunk advisory only. [Build output](build.txt). `git diff --check`: passed.

No backend CRUD operations changed, so that verification gate is not applicable. Coincident geographic markers can still overlap; zooming or selecting a hotel card provides access. No blocking verification failures remain. Wider Phase 18 acceptance is unchanged.

## Visual evidence

- [Selected prototype A](plan/selected-A.png)
- [Before: unlinked map](plan/before-unlinked-map.png)
- [Desktop selection with faded hotels and visible activities](implementation/linked-map-faded-hotels-desktop.png)
- [Chat reference linked to card and map](implementation/chat-map-selection-desktop.png)
- [Mobile map](implementation/linked-map-mobile.png)
- [Mobile selected card](implementation/linked-card-mobile.png)
- [Existing room details](implementation/room-details-desktop.png)
- [Results after closing details](implementation/linked-results-desktop.png)
