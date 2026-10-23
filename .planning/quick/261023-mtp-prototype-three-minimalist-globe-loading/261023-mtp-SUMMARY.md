---
status: complete
---
# Three minimalist globe loading prototypes

Implemented three development-only presentations on the existing authenticated /plans route:

- A: Quiet canvas — centered globe and count, conversation retained.
- B: Full focus — large globe and count across the workspace, conversation hidden during generation.
- C: Visible progress — globe/count beside noninteractive completed-item groups.

All variants use the confirmed Lisbon destination, simulated completed-item events, no percentage/denominator, completion reveal, cancel/retry, regeneration preview, reduced motion and a shareable arrow/keyboard variant switcher. Sample interactions do not mutate a Plan.

Start: `npm run prototype:globe --prefix frontend`.
Preview: `http://localhost:5187/plans?prototype=canvas-globe&variant=A` (B/C also available).
Captured on `prototype/canvas-globe-loading-20261023`; main app at port 5174 remains unchanged.

Verification: authenticated Chrome DevTools interaction checks for every variant; inspected desktop/mobile screenshots; no overflow or console errors; read-only requests HTTP 200; production build and diff check passed. The initial screenshot connection was replaced with a fresh isolated official DevTools MCP session to complete evidence capture.

Evidence: `artifacts/testing/2026-10-23-canvas-globe-loading/verification.md`.

Decision pending. The user has requested prototypes, not selected a production layout. Preserve this branch as the source of the comparison and record the selected variant or combination before a separate implementation.
