# Loader without destination strip

2026-10-23. Selected C prototype only. Removed the duplicate destination header identified in the supplied screenshot. Existing earlier screenshots retained under ../2026-10-23-progressbar-only/plan/.

- `npm run build --prefix frontend`: passed; existing bundle-size advisory only.
- `uv run --with mcp python .planning/quick/261023-tpz-remove-redundant-destination-header-from/verify-no-header.py`: passed with official Chrome DevTools MCP and supplied example-account authentication.
- Asserted .cg-trip-bar absent. Full-width indicator measured 1392px for 1392px available. Research → Canvas preserves the same animated globe.
- Desktop 1440×1000 and mobile 390×844 screenshots inspected; loading count and Cancel remain visible, no horizontal overflow. Completion reveals three sample cards; cancel/error/retry/replay, reduced motion and card interactions pass.
- Console has only existing Lit development warning; inspected session/profile/plans requests returned 200. No durable writes. No unit tests added for this throwaway presentation change.

| State | Desktop | Mobile |
| --- | --- | --- |
| Research | [Screenshot](plan/variant-c-desktop.png) | [Screenshot](plan/variant-c-mobile.png) |
| Canvas | [Screenshot](plan/canvas-phase-desktop.png) | [Screenshot](plan/canvas-phase-mobile.png) |

[Completed canvas](plan/completed-canvas-desktop.png). [Browser results](browser-results.json).

Preview: http://localhost:5187/plans?prototype=canvas-globe-topbar&variant=C . Generation remains simulated; production integration is not part of this change.
