---
quick_id: 261104-rdh
title: Shared accommodation location filters and activity minimap
---

User approved A below the initial search, flexible multi-place/category selection, and an optional map layer of agent-mentioned activities. Reuse existing workspace, maps, controls and cards; remove prototype entry points. Follow the accepted IMPLEMENTATION-SPEC in quick task 261104-q8m.

1. Add authenticated shared location criteria, authoritative saved-place resolution, bounded provider radius search and honest straight-line ranking/filtering. Preserve exact-rate criteria and existing dates/party/filter contracts.
2. Implement production sidebar below the search, category/individual selection and named references, applied/draft state, hotel/activity minimap and validated temporary agent mentions. Reuse real components. Remove captured prototype source only after integrating production.
3. Verify backend contract/HTTP boundaries, frontend state/schema and builds; exercise authenticated browser journeys on changed local services, desktop/mobile/error/empty/recovery, inspect console/network/screenshots. Save evidence and summary; update STATE and commit.

Acceptance: manual and agent searches use identical resolved anchors; hard radius applies to every anchor; no fabricated coordinates/times; no silent Plan writes or criteria changes from pin inspection; edited drafts reject late agent updates; unavailable/truncated data remains labeled. Prototype screenshots already approved under artifacts/testing/2026-11-04-stay-activity-minimap/plan.
