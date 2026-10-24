---
status: complete
---
# Three single-canvas layouts

Built and browser-verified A map-led, B places-led, and C balanced split on the existing authenticated /plans route. One canvas throughout, no back-to-research navigation. Trip details, preferences, notes, travel, place selection and chat stay in context. Shared sample data; all writes and chat replies simulated.

Prototype source: `39f0f95` on `prototype/single-canvas-layouts-20261024`.
Run: `npm run prototype:canvas --prefix frontend`.
Preview: http://localhost:5188/plans?prototype=single-canvas&variant=C

Chrome DevTools checks passed for all layouts, desktop/mobile, selected/empty states, exact trip edit, suggestion/Add/Save flow, URL/keyboard switching, and reload reset. Build passed. Evidence: `artifacts/testing/2026-10-24-single-canvas/verification.md`.

Decision pending. The user accepted one canvas and in-place research but has not chosen A/B/C. C is the assistant's recommendation for active planning, not user approval. No production rewrite or merge authorized by a selection yet.
