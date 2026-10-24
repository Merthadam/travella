# Research → Canvas loading preview

Verified 2026-10-23. User selected top-bar C with exactly two phases; B Full focus remains the globe layout. This is an in-memory prototype, not production integration. The demo transitions to Canvas at six simulated items; real implementation must use actual phase events.

## Executed verification

- `npm run build --prefix frontend`: passed; existing chunk-size advisory only.
- `uv run --with mcp python .planning/quick/261023-ta4-refine-selected-c-loading-prototype-to-r/verify-phases.py`: passed using official Chrome DevTools MCP and supplied example-account authentication.
- Research active → Research checked / Canvas active: exactly two stages. Same globe DOM element remains mounted; computed animation stays `cg-turn` across the transition. No sample cards exposed during either loading phase.
- Desktop 1440×1000 and mobile 390×844 screenshots of both phases visually inspected: no clipping or control overlap. Mobile reduced-motion preference stops animation; explicit reduced-motion control also passes.
- Increment, cancel, error, retry, finish, replay, inert regeneration background and sample card open/close pass. Finish removes the loader and exposes three sample card groups; both stages show completed checks.
- Variant URL switching/reload passes. Console has only existing Lit development warning. Inspected session/profile/plans requests return HTTP 200; no Plan writes.
- No unit tests added for throwaway code. Real agent phase events are not integrated.

## Screenshots

| State | Desktop | Mobile |
| --- | --- | --- |
| Research | [Research](plan/variant-c-desktop.png) | [Research mobile](plan/variant-c-mobile.png) |
| Canvas | [Canvas](plan/canvas-phase-desktop.png) | [Canvas mobile](plan/canvas-phase-mobile.png) |

[Completed canvas](plan/completed-canvas-desktop.png). [Browser results](browser-results.json). Previous design screenshots retained in `../2026-10-23-globe-topbar/plan/`.

Preview: http://localhost:5187/plans?prototype=canvas-globe-topbar&variant=C . Press Run demo to see the phase transition and completion. Start with `npm run prototype:globe --prefix frontend`.
