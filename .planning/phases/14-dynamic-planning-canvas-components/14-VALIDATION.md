# Phase 14 validation strategy — disconnected components

Planning only now. Execution checks below are future work, not completed tests. No backend CRUD changes, automated tests or paid model/provider calls are in scope.

## Acceptance scenarios
1. Load the gallery with the sample-data banner and all seven isolated components.
2. Compose a canvas via real A2UI createSurface/updateComponents/updateDataModel fixture messages.
3. Simulate generation with 0/1/7 components, update existing ids without duplicates, hide/restore/reset.
4. Exercise empty/loading/ready/error for each component; invalid type/prop/path is rejected without crashing siblings.
5. Edit essentials and themes locally; Save/Cancel work; refresh/reset restores fixtures (no persistence claim).
6. Map: schematic label, candidate/final markers, keyboard-accessible place list, local select and unavailable state; add/edit/remove colored category pins, filter via legend, inspect details, handle overlapping positions and filtered-empty state.
7. Flight/stay cards: compact presentation, separate preview views, Back restores canvas, no real search or checkout.
8. Findings: expand/collapse, sources, uncertainty/conflict labels; all example evidence identified as sample.
9. Links: clear purpose/domain, valid explicit action, invalid/unsafe URLs refused, long text wraps.
10. Desktop1440 and mobile390: no clipping/overlap/horizontal overflow; keyboard focus, target sizes and reduced motion.
11. Inspect network: no model, research, Places, Maps, LiteAPI, CRUD or save requests caused by the gallery. A standalone Vite gallery need not authenticate; if routed under the authenticated app instead, use only the example account and record why auth is needed. Prefer the standalone entry to keep components independent.
12. Existing production Plan/chat navigation unchanged; prototype branch changes not silently promoted.

## Execution evidence
Use Chrome DevTools; save screenshots and sanitized console/network observations under artifacts/testing/<execution-date>-planning-components/. Document sample-only behavior, inspected states and any blockers. Inspect the actual screenshots.

Build after implementation: `npm --prefix frontend run build`. No build necessary for documentation-only planning. No backend HTTP sequence is required because no backend is changed.

## Delivery gate
All seven components render through A2UI from validated fixture messages and can be inspected independently. UI actions are observable locally. No live integration is claimed. User reviews the actual designs before a later connection phase.
