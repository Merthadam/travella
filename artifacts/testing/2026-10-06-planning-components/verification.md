# Standalone component studio — verification

2026-10-06. URL: http://localhost:5177/. Entry: `npm --prefix frontend run dev:components`.

## Scope
Seven components under frontend/src/design-system, rendered via the installed A2UI catalog/MessageProcessor. Separate Vite entry; no production app imports or routing changes. All content and mutations are local samples. No authentication needed because the gallery reads no account or Plan data.

## Observed browser checks (Chrome DevTools)
- Seven real A2UI component instances rendered; simulated generation produced seven without duplicates.
- Essentials: changed travelers2→3 and budget€1,500→€2,000, Save reflected both.
- Themes: changed Food & cafés→Independent bookshops; updated chip shown. Mark reviewed toggled the session marker.
- Map: added Riverside bakery with Food category/note, saw selected details and fifth pin; Food filter removed both food markers; restoring showed them; removal returned to four pins. Keyboard Enter opened selected pin details. Many-pins fixture exposed8 markers plus4-more notice and12-place accessible list.
- Flights and Accommodation each opened their separate preview shell, reported no provider connection, and returned to canvas.
- Findings expanded source/uncertainty content.
- Links: javascript URL rejected with explicit validation message; public HTTPS sample accepted, increasing list2→3.
- Empty, loading and error states rendered across all7 components; retry restored one while the other6 retained errors.
- Busy state disabled edits/add-place while browsing remained enabled. Missing fields displayed Not set and empty-map guidance.
- Invalid component payload rejected while7 last-valid cards remained visible; Reset restored valid rendering.
- Hide map reduced7→6 cards, restore returned it. Long-content390px fixture had scrollWidth390 with no document horizontal overflow.
- Desktop1440 and mobile390 screenshots inspected. Mobile pins truncate labels intentionally; full names available via details/list. No clipped card text or document overflow observed.
- localStorage0/sessionStorage0. No XHR/fetch requests; resource list contained only localhost development assets. No model, backend, Maps or LiteAPI calls.
- Console after fixes: no errors; existing A2UI dependency Lit development-mode warning only.

## Build checks
- `npm --prefix frontend run build`: PASS; existing large-chunk warning.
- `npm --prefix frontend run build:components`: PASS;549.79kB main JS bundle triggers Vite's advisory large-chunk warning. No dependency added.
- No automated tests added/run, no paid model/provider calls.

## Fixes found during browser inspection
- Installed A2UI0.12 requires child-reference schema metadata. Explicit ChildList REF annotation resolves registered children; helper named in upstream error text isn't exported by this installed version.
- New-pin selection no longer clears before the asynchronous A2UI data update arrives.
- Reset remounts local editors; singleton components fill available space when their paired component is hidden.
- Schematic pin positions stay stable across category filtering; preview busy/empty controls do not silently mutate state.

## Evidence and limits
- implementation/canvas-desktop.jpg
- implementation/canvas-mobile.jpg
- implementation/map-desktop.jpg
- implementation/map-mobile.jpg
- Before/design evidence: ../2026-10-06-dynamic-canvas-plan/plan/.

Images came from Chrome DevTools screenshot output and were saved unchanged (the tool's direct filesystem export rejected workspace paths). Human aesthetic approval is pending. Export-review download and full screen-reader audit were not exercised. Reduced-motion handling is present in CSS, not device-emulated. No backend/agent/provider behavior is claimed. Map is a labeled schematic; actual Google Maps integration is deferred.
