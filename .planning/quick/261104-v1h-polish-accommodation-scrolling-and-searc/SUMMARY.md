---
status: complete
---
# Accommodation scrolling and search-details refinement

Refined the user's selected A layout after feedback. Search summary is structured and stays honest about applied criteria; editor uses available workspace with one scroll surface and reachable controls. Card clicks preserve scroll position, map/chat selections reveal within the results pane only, and closing the editor restores the previous results position.

135 regression tests, build, source hashes and canonical authentication readiness passed. Real Chrome example-account manual sandbox search, reload, desktop keyboard scrolling, search editing, exact marker/card identity, mobile scrolling/navigation and console/network checks passed. Final screenshots inspected. Existing geographically overlapping markers and non-blocking development warnings recorded.

Evidence: [verification](../../../artifacts/testing/2026-11-04-stay-scroll-polish/verification.md). Preview: http://localhost:5202. Inline GSD quick execution; no backend CRUD change, booking, push, merge or deployment. Wider Phase 18 acceptance unchanged.
