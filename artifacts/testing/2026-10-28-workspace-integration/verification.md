# Plan18-12 frontend integration corrections

Executed2026-10-28 after resumed implementation authorization. Parent committed GREEN as `490997b` and owns integrated Chrome DevTools, build/runtime, shared phase reports and commits. This record covers frontend source tests only; it does not close browser acceptance.

## Corrected findings

1. The main comparison could display exact rooms from separate rate searches while an ordinary follow-up carried only the main-search workspace references. TravelSearch now publishes its ordered displayed references to an instance-scoped Workspace ref. The conversation hook uses the existing structured `travelDiscussion: {intent: 'discuss', options: [...]}` as the fallback for ordinary sends. Explicit discussion context takes precedence. Closing/unmounting the comparison clears the fallback. No inventory, provider payload, pasted prompt content or user draft is added/rewritten. Main workspace membership constraints remain unchanged. Backend owner confirmed the existing selected_context path independently authorizes each full reference across searches; its exact-identity correction is tracked separately.
2. A manual choice begun with unavailable history could receive its first brief digest in the authenticated review receipt, bump the local operation epoch, then discard the valid deferred preparation challenge. Initial hydration now establishes the known brief without treating it as an edit. Changed known digest, saved traveler facts, scope or activity still revoke pending operations.

## Executed checks

- RED: `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx -t 'manual review receipt preserves|ordinary followups use displayed'` produced2 intended assertion failures and1 existing changed-brief guard pass. Initial review confirmation was absent; ordinary follow-up's structured references were undefined.
- `node /Users/adammerth/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence artifacts/testing/2026-10-28-workspace-integration/red-frontend.json` returned RED_EVIDENCE_OK before implementation. Parent committed RED as `7777c75`.
- GREEN: `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/travelApi.test.js src/plansApi.test.js` produced **109 passed across5 files**.
- `git diff --check` passed.

The comparison regression uses the real Workspace/Search/conversation hook, two authorized snapshot fixtures with distinct search IDs and exact room IDs, then asserts the ordinary travelTurn request preserves displayed order and exact tuples while workspaceContext retains the main search ID. A subsequent send after Close comparison has no stale discussion fallback. The receipt regression defers prepareTravelChoice after the review receipt includes a brief, verifies initial hydration preserves confirmation, and separately verifies changed digest or saved destination suppresses it. Existing topic/account/cancellation, draft-preservation, choice and request-contract tests remain in the passing run.

No backend source was changed by this frontend correction. Build and required authenticated browser checks are parent-owned and pending at this handoff. Integrated evidence remains under `artifacts/testing/2026-10-27-shared-travel-workspace/`; do not infer live provider quality or traveler acceptance from these fixtures.

## Fresh manual registry parsing correction

Final browser inspection established a distinct frontend bug: Compare room received HTTP200 with fresh inventory, but manual registry snapshots intentionally carried `draft_facts: {}`. Both compareRoom and historical openReference parsed the strict browser snapshot directly and rejected its five missing draft fields. The earlier unavailable/expiry interpretation of this specific fresh-response failure was incorrect; this was not an SDK failure.

`parseTravelRegistrySnapshot` now normalizes only an explicitly empty draft-facts object to neutral unavailable metadata. It does not stamp observations with the current saved brief, replace their original search criteria, or relax the strict snapshot schema. Nonempty malformed metadata remains invalid. The two callers retain current operation guards and exact Plan/topic/search/option/room membership checks. Historical details remain marked as original observations, and lookup never starts a supplier search.

- RED command: `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx -t 'raw manual'` observed2 expected failures (exact comparison and historical details) and2 rejection cases passing. `red-registry-parser.json` passed the required checker; parent committed RED `2e49dbd`.
- GREEN command: `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx` observed **108 passed,1 pre-existing skipped test across4 files**. No skip was added or assertion weakened. Actual raw-empty metadata, foreign Plan, invalid criteria and malformed nonempty metadata are covered. Main current inventory stays intact while old exact-room criteria/date facts remain visible.
- The first GREEN attempt reached a previously masked fixture mismatch: the current imported snapshot still declared Rome draft metadata while the test's saved Plan was Paris, so its existing compatibility guard correctly hid it. The fixture now declares the current Paris saved facts while preserving the original room's Rome criteria. The subsequent command above passed.
- `git diff --check` passed. Parent owns rebuild and the repeated real-browser room comparison/detail check; runtime acceptance is not claimed from these tests.
