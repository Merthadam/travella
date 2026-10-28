# Plan18-08 automated verification

Source tasks complete; live browser and live-model delivery verification remains with the parent integration run. This record does not substitute for the mandatory Chrome DevTools gate.

## Executed checks

- `uv run --locked pytest -q services/agent/tests/test_specialist_worker.py services/agent/tests/test_specialist_tools.py services/agent/tests/test_travel_workspace_journey.py --tb=short`:50 passed.
- `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelSearch.test.jsx`:58 passed.
- `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/travel/TravelContextSummary.test.jsx`:73 passed; one existing conditional Python-SSE-fixture test skipped in this standalone invocation.
- `uv run --locked pytest -q services/agent/tests/test_specialist_worker.py services/agent/tests/test_specialist_tools.py services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_travel_specialist_journey.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_travel_research_tools.py services/agent/tests/test_travel_registry.py --tb=short`:264 passed. The Canvas suite supplies the actual Python SSE fixture and executes the otherwise conditional frontend journey, so that path was exercised here.
- `git diff --check`:passed. Existing LangGraph/Python deprecation and Lit development warnings remain unrelated.

## Observable outcomes

SDK registration and dispatch enforce twelve local operations (including duplicate requests), current owner/Plan/topic/search/room membership, expiry, dirty-draft denial, finite deadline and evidence ceilings. Provider budgets remain ten total calls, three rate searches, six inspections; General Trip remains24KiB. Local view operations make zero supplier calls. Unknown price, stars, rating, refundability, stops and bags remain visible with explicit unknown labels, and missing-price results sort last.

The scripted SDK worker receives current exact comparison order beyond the ordinary ten-option preview and room-specific evidence. Its view-only turn produces the original search ID plus a validated final view without provider traffic. Prompt contract checks cover unknown checked baggage, kitchen/property distinction, current ordinal order and fresh-search intent. These tests prove host evidence and authority; scripted answers are not live language-quality evidence.

The real graph/FastAPI CRUD/isolated SQL journey creates an owned Plan, commits conversation research through signed HTTP, reads the topic back and checks stored TravelTopicRun completion. A view-only operation releases the original search with unchanged observation time after commit; shortlist and preferred choice remain empty. Invalid ownership/Plan/topic/expired context fails before the worker. Failed commit and revoked generation release no workspace effect. Graph/checkpoint/database projections contain no workspace inventory. No new durable CRUD operation was introduced.

Mounted browser-component tests exercise terminal/state duplicate delivery, manual search/filter/sort/typing races, current-run guards, exact manual dismissal and restore, one-step Undo, expiry and revision invalidation. Updated results preserve focused unsent message text. Undo, dismissal and restore make no network or choice API calls and retain observation times. Existing saved-choice journey regressions pass.

## TDD evidence

`red-01.json`, `red-02.json`, and `red-03.json` preserve actual named assertion failures normalized to the checker-supported TAP summary. Each passed `node /Users/adammerth/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence <file>` with `RED_EVIDENCE_OK` before its GREEN implementation. A task02 fixture import typo was repaired before its intentional RED run.

## Remaining integration gate

Parent owns the application rebuild, example-account Chrome DevTools interactions, screenshots, console/network inspection, responsive layouts and live-model samples. Source is ready at6745718; no browser pass is claimed here. Parent evidence is maintained under `../2026-10-27-shared-travel-workspace/` and plan12. Required cases: local filter/compare without redundant search; dismissal/restore of saved options; quiet completion with draft focus; Undo; newer manual search winning a late completion; uncertain baggage and kitchen facts remaining unknown.
