---
quick_id: 261023-skp
status: planned
---
# Research progress docking and bottom composer

Continue approved prototype C with the latest desktop placement correction: the draggable brief circle starts at the top-right end of the progress bar (latest user correction). The composer stays at the viewport bottom, with the conversation scrolling above it. Opening the brief remains an overlay and never moves conversation text. No generation or saved-data behavior changes.

1. Capture current UI and a temporary browser layout sketch.
2. Reserve a progress-bar anchor for the circle; place the default overlay there. Keep drag and keyboard positioning. Restore transcript flex growth so the composer sits at the bottom.
3. Update affected position tests, run focused frontend tests and build. Rebuild the isolated research17 stack and compare source hashes.
4. Exercise authenticated example-user layout, open/close, drag, long conversation scrolling, desktop resize, console/network. Inspect screenshots and record evidence.

Evidence: artifacts/testing/2026-10-23-research-docking/. User already chose prototype C; this is a placement correction in the same design session.
