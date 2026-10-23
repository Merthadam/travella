# Top loading bars alongside the selected globe

Completed three dev-only variants on `/plans?prototype=canvas-globe-topbar&variant=A|B|C`:

- A Thin line: minimal indeterminate top edge.
- B Status strip: explicit loading message, completed-item count and moving rail.
- C Journey steps: destination confirmed, canvas building, ready to explore.

All preserve the selected B Full focus globe and its original decision. No production implementation or Plan mutations. Counts/events are simulated; no invented percentage. Each handles loading, completion, error, cancellation and reduced motion. Mobile C is compacted to keep Cancel accessible above the floating prototype switcher.

Build and authenticated official Chrome DevTools browser checks passed for all variants at desktop/mobile sizes, with screenshots visually reviewed. Verification: `artifacts/testing/2026-10-23-globe-topbar/verification.md`.

Captured on `prototype/canvas-globe-loading-20261023`. User selection of a top bar is pending; the earlier B globe preference remains intact. No push or merge.
