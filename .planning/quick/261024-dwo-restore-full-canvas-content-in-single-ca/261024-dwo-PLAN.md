# Restore complete canvas content in the prototypes

User correction: first prototypes looked good but omitted prominent existing content, especially the flight box. Improve hierarchy while retaining all seven existing canvas groups. One canvas remains locked; no layout chosen for production.

1. Reuse actual FlightsEntry, AccommodationEntry, TripThemes, ResearchFindings and ImportantLinks components with in-memory sample data. Essentials remain editable in compact header, places/map remain the main exploration area. Keep all groups visible as cards in the same scrollable canvas. Rework A/B/C placement without returning to separate research screens.
2. Keep travel exploration inside a sample panel and make explicit sample selections update only local draft data. Existing preference/link editors work in memory; real Save is never invoked. Preserve truthful not-booked and simulated labels.
3. Exercise all variants in authenticated Chrome DevTools: restored cards visible/reachable, flight/stay panels and selections, local editing, save state, desktop/mobile scrolling and no network writes. Inspect/save screenshots, build, update evidence/state and commit on existing prototype branch.

Evidence: artifacts/testing/2026-10-24-full-canvas/. Previous preview screenshots remain the before-state. User design selection remains pending.
