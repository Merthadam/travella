---
status: complete
scope: prototypes and production specification
production_status: awaiting_design_selection
---
# Flexible accommodation location search

Delivered three interactive, development-only alternatives on the existing authenticated Plan route. All support individual saved places, whole categories and exceptions, named center/landmark/neighborhood anchors, strict all-place radius or flexible average-distance ranking, per-place evidence, missing coordinates and empty-result recovery. Map variant adds a custom point. Simulated assistant proposals feed the same controls; they cannot call real providers or mutate a Plan.

Source/evidence commit: `0f9ba4e`.
Primary-source capture branch: `prototype/stay-location-20261104` (local; do not merge prototype variants into production).
Preview: http://localhost:5201/plans/81a99feb-80d7-4514-9326-b0a7ddc5643e?prototype=stay-location&variant=A
Run: `npm run prototype:stay-location --prefix frontend` with existing backend at localhost:5174.

Chrome DevTools verified all variants, category and individual selection, assistant apply, map selection, strict and missing-location cases, keyboard switching, reload, 390px mobile layouts, and fresh example-account authentication on the preview origin. Screenshots inspected; mobile table overflow corrected. Production build passed; prototype excluded from bundle. No backend CRUD changed or live provider/agent functionality claimed.

Evidence: `artifacts/testing/2026-11-04-stay-location/verification.md`.
Shared agent/manual implementation scope: `IMPLEMENTATION-SPEC.md` in this directory.

User decisions: three prototypes requested; flexible selection of any combination of saved places/categories required. Layout choice, dynamic category membership and optional place priorities remain open. Recommendation is A's sidebar with C's comparison, but not yet selected. Record the user's choice before production execution, then follow production browser/API gates and remove throwaway entry/components/config from the integration branch while preserving the capture branch.
