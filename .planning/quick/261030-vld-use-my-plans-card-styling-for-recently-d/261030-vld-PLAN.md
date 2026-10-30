---
mode: quick
status: planned
---
# Recently deleted journal list

User requests Recently deleted use the My plans design, without a highlighted/featured entry, in a list. User explicitly selected “Reuse the existing design.”

1. Capture current deleted screen and a browser-rendered intended row preview. Reuse journal card styling and DestinationPhoto, preserve native Restore confirmation and deadline contracts, render uniform single-column rows with responsive mobile layout. Keep loading/error/empty/pagination and back navigation. User additionally requests deleting the superseded old view: remove its markup and unused grid/card/badge/empty styles and theme selectors.
2. Run existing lifecycle/journal/photo tests and production build. Rebuild the canonical local container using travella-local. Exercise authenticated real delete→list→restore→reload on a task-owned record, desktop/mobile, loading/error/empty and Google photo fallback; inspect console/network and screenshots.
3. Record evidence, commit source and update quick-task summary/state. No backend changes or unrelated Plan mutations. Execution is inline under the skill's Codex fallback.
