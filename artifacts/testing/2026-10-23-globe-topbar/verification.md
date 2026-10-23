# Top loading bar prototype verification

Date: 2026-10-23. Scope: throwaway design preview on the existing authenticated Plans route. All three top indicators retain the selected B Full focus globe. Production generation is unchanged; progress and interactions are in-memory simulations.

## Executed checks

- `npm run build --prefix frontend`: passed. Existing bundle-size advisory remains.
- `uv run --with mcp python .planning/quick/261023-t2f-prototype-top-loading-bars-alongside-sel/verify-topbars.py`: passed using the official Chrome DevTools MCP in an isolated Chrome session, authenticated with the supplied example account. The system Python lacked MCP; rerunning with the managed dependency completed successfully.
- Each A/B/C variant checked at 1440 × 1000 and 390 × 844. No horizontal overflow. Saved screenshots inspected; C's mobile header was compacted to keep Cancel clear of the prototype switcher.
- Loading starts with four simulated completed items; increment displays five. Unknown total is represented without aria-valuenow or a fabricated percentage.
- Cancel and simulated error update the top indicator; retry resets the count. Finish replaces the loader with three interactive sample card groups. Card detail opens and closes. Replay resets the count.
- Regeneration background remains inert. Reduced-motion control and browser preference stop globe animation. Top indicators also have reduced-motion CSS.
- Keyboard variant switching wraps C to A, updates the URL and survives reload.
- Console: only the existing Lit development-mode warning; no errors. Inspected auth/session, traveler-profile and plans requests all returned HTTP 200. No durable Plan mutations.
- No unit tests added for this throwaway prototype, following the prototype skill. Live agent progress integration is outside this design preview.

## Evidence

| Variant | Desktop | Mobile |
| --- | --- | --- |
| A Thin line | [Screenshot](plan/variant-a-desktop.png) | [Screenshot](plan/variant-a-mobile.png) |
| B Status strip | [Screenshot](plan/variant-b-desktop.png) | [Screenshot](plan/variant-b-mobile.png) |
| C Journey steps | [Screenshot](plan/variant-c-desktop.png) | [Screenshot](plan/variant-c-mobile.png) |

[Completed sample canvas](plan/completed-canvas-desktop.png). [Sanitized browser results](browser-results.json).

Preview: http://localhost:5187/plans?prototype=canvas-globe-topbar&variant=A (also B/C). Startup: `npm run prototype:globe --prefix frontend`. Use Run demo and the bottom variant arrows. Top-bar selection remains pending; the previously chosen B globe remains saved.
