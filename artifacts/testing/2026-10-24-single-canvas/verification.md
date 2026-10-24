# Single-canvas design preview verification

2026-10-24 · prototype source `39f0f95` · branch `prototype/single-canvas-layouts-20261024`

## Scope and decision

User requested a cleaner canvas, accepted keeping research inside canvas chat, and explicitly required one canvas rather than separate screens. Three alternative layouts were requested and built. Selection is pending; none is approved for production.

- A: map-led workspace with floating place collection and optional chat.
- B: places-led editorial collection with an adjacent map and optional chat.
- C: place list, map, and chat side by side; chat can collapse.

All three have the same sample Lisbon trip, compact editable trip header, single Save status, inline place details, and supporting panels for preferences, notes/sources, and travel. The map is schematic; chat replies, Add and Save are explicitly simulated. Data stays in memory and resets on reload. No provider search, model request, or durable Plan mutation is connected.

## Run and inspect

`npm run prototype:canvas --prefix frontend`

- [A](http://localhost:5188/plans?prototype=single-canvas&variant=A)
- [B](http://localhost:5188/plans?prototype=single-canvas&variant=B)
- [C](http://localhost:5188/plans?prototype=single-canvas&variant=C)

The dedicated Vite server uses the existing authenticated /plans host and the repository's development proxy to the already-running local backend. Application header, session and read-only Plans/profile loading are retained. The original Docker stack was not rebuilt. Rendering is development-only.

## Executed Chrome DevTools checks

Authenticated the supplied example account once in an isolated browser context; sign-in returned 200/signed_in. Session, traveler-profile and Plan-list requests returned 200. Credentials and raw responses were not saved in evidence.

- Every variant: selected a place, verified its details within the same /plans canvas, closed details; opened/closed Preferences, Notes & sources, and Travel; opened research chat from Find another place. All passed.
- Chat suggestion left the four-place sample unchanged. Explicit Add changed the draft to five places and showed Unsaved changes. Simulated Save returned Saved in preview. All passed.
- Edited dates and budget through the real form. Header stayed unchanged before Apply; Apply updated the exact values and marked the sample dirty. Passed.
- ArrowRight while focused in an input preserved the current variant. Outside editable controls, ArrowRight wrapped C to A and updated the URL. Passed.
- Switching layout retained sample edits; reload reset the sample to four places. Passed, matching the no-persistence contract.
- Recorded fetch method/path while exercising edits and all layout controls: no requests were made by the preview actions. Host reads are separate and read-only.
- At 390×844, A/B/C had no horizontal overflow. Selecting a place scrolled its details into view. Chat fit the viewport in every variant. Passed.
- Empty draft retained map and discovery action. Adding the suggested garden populated it with one place. Passed.
- Desktop 1440×1000, light and dark appearance inspected. Final console contained only the existing Lit development-mode warning; no errors. Final fetch/XHR list contained three successful GET requests. An earlier generic resource 404 did not recur after reload.

## Visual evidence

Existing production before-state: [generated canvas](../2026-10-24-canvas-scroll-chat/implementation/generated-plan-with-sidebar.png).

All images below were captured by Chrome DevTools and visually inspected. The MCP file writer rejected this worktree's path, so returned screenshot bytes were saved unchanged through the local filesystem tool.

| Direction | Desktop | Mobile |
| --- | --- | --- |
| A | [Map-led](plan/a-map-led-desktop.jpg) | [Mobile](plan/a-mobile.jpg) |
| B | [Places-led](plan/b-places-led-desktop.jpg) | [Mobile](plan/b-mobile.jpg) |
| C | [Balanced](plan/c-balanced-desktop.jpg) | [Mobile](plan/c-mobile.jpg) |

[Dark canvas with selected place](plan/c-place-detail-dark.jpg).

No horizontal clipping was observed. Supporting controls stay reachable in shorter desktop windows. On mobile, the fixed prototype switcher overlaps the currently scrolled content, but all content remains reachable by scrolling; this control belongs only to the design preview. Mobile panels preserve the canvas beneath them.

## Build and limits

- `npm ci --prefix frontend --no-audit --no-fund`: passed.
- `npm run build --prefix frontend`: passed after final source changes; existing large-bundle warning remains.
- `git diff --check`: passed.
- No unit tests added for throwaway layouts. Production CRUD/model/provider behavior was not changed or tested.

Ready for design comparison. User selection, production implementation, and production acceptance are not complete. Do not merge the prototype into main; preserve this branch as the design source when implementing the selected direction.
