---
status: resolved
trigger: "couldnt agentically search for accoms for some reason also agui should work with that bot left thing so i can select things by the map"
created: 2026-11-04
updated: 2026-11-04
---

# Current Focus

hypothesis: Confirmed: pending location draft was absent from agent context and blocked at prompt, tool, service and frontend delivery boundaries. Expired result references also blocked fresh chat requests.
next_action: Complete; local preview and verification evidence available for traveler review.

## Symptoms

Expected: Accommodation chat can search and share the selected places/location controls beside the map through AG-UI. Map selections are usable as search context without silently saving a Plan.
Actual: Traveler reports agentic accommodation search failed. Exact prompt/error requested asynchronously.
Timeline: Reported after production location implementation 0356451.

## Evidence

- useTravelWorkspace.getWorkspaceContext sends only search_id, view and draft_dirty; current draft location selection is absent.
- travel-specialist-v1 explicitly prohibits searches/view changes when draft_dirty is true.
- Prior verification started from an applied manual search; it did not exercise map draft selection then agent search or a fresh search with no manual baseline.
- Inspected the affected example-account conversation: repeated requests to search near activities, retain 1.5 km and research again were refused because of pending form edits. Traveler independently confirmed this symptom.
- Expired observations remained in getWorkspaceContext, causing a fresh chat request to fail before the worker with expired-results feedback.
- Added bounded, validated stay_draft context captured at chat submission; workspace date evidence; guarded draft admission at search/delivery; unchanged owner/revision/run checks and revocation on later edits. Saved pins appear before selection with explicit Include/Remove.
- 73 backend checks and 115 frontend checks passed. The graph-to-commit integration test now searches with a pending map draft and delivers the resolved anchors in a workspace update; saved choices remain empty.

## Resolution

Root cause corrected and verified end to end. Real map selection of Castle + Market followed directly by chat returned 22 properties, applied 1.5 km to both selected anchors, preserved dates/guests/nationality, and updated the shared controls/results. Mobile pin inspection and reload recovery passed. No console errors on the final page; only existing dependency warnings. Nine runtime source hashes match the workspace.

Evidence: artifacts/testing/2026-11-04-stay-agent-map-sync/verification.md
Preview: http://localhost:5202

Inline GSD debugging adapter; approved design retained. No durable Plan/search-choice changes, deployment or merge.
