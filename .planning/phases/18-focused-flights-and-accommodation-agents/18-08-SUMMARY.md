---
phase: 18-focused-flights-and-accommodation-agents
plan: "08"
subsystem: agent-workspace
tags: [claude-sdk, temporary-results, exact-references, undo, react]
requires:
  - phase: 18-07
    provides: Committed current-run workspace batch protocol
  - phase: 18-09
    provides: Observed carrier/card evidence preserved by this slice
provides:
  - Twelve bounded local operations over current observed results
  - Ordered exact comparison and room evidence with honest unknowns
  - Quiet result feedback and version-safe temporary Undo/dismiss/restore
affects: [18-10, 18-11, 18-12]
tech-stack:
  added: []
  patterns: [host-owned view operations, one in-memory revision-bound inverse]
key-files:
  created: [services/agent/travel_workspace.py]
  modified:
    - services/agent/claude/canvas_travel_tools.py
    - services/agent/claude/travel_specialist.py
    - services/agent/prompts/travel-specialist-v1.md
    - frontend/src/features/plans/travel/useTravelWorkspace.js
    - frontend/src/features/plans/travel/TravelWorkspace.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
key-decisions:
  - Remove model-authored workspace_view output; only counted host tool operations author effects.
  - Preserve unknown matches visibly; exclude only confirmed violations using manual and agent parity.
  - Keep comparison order and room IDs exact, including observations beyond preview10.
  - Undo restores only the current inverse, retaining original observation timestamps and never saved choices.
requirements-completed: [FOCUS-03, FOCUS-04, FOCUS-06, FOCUS-09, FOCUS-10, FOCUS-11, FOCUS-12]
actuals:
  tokens: 17473
  tasks: 3
  commits: 6
plan_head_before: 2c5e0858719b0e744d07ef59a4bf507562bb8d5d
duration: 12min source-commit interval
completed: 2026-10-27
status: complete
runtime_verification: pending-parent-Chrome-and-live-model
coverage:
  - id: bounded-operations
    description: Registered local operations enforce scope, evidence and budgets without supplier calls.
    verification:
      - kind: integration
        ref: services/agent/tests/test_specialist_tools.py
        status: pass
    human_judgment: false
  - id: commit-delivery
    description: View-only updates cross the real graph and signed CRUD commit without durable inventory.
    verification:
      - kind: integration
        ref: services/agent/tests/test_travel_workspace_journey.py
        status: pass
    human_judgment: false
  - id: quiet-undo
    description: Quiet focused workspace update with temporary revision-safe Undo and dismissal.
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx
        status: pass
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/verification.md
        status: unknown
    human_judgment: true
    rationale: Parent must finish Chrome screenshots, layout inspection and real interaction after rebuild.
  - id: grounded-language
    description: Specialist distinguishes exact current evidence and unknown hard-requirement matches.
    verification:
      - kind: integration
        ref: services/agent/tests/test_specialist_worker.py
        status: pass
    human_judgment: true
    rationale: Scripted SDK evidence and prompt checks do not establish live language quality.
---

# Phase18 Plan08: Bounded refinement and guarded Undo Summary

**Focused specialists can filter, sort, dismiss, restore and compare current observations through bounded host tools, with one guarded temporary Undo.**

## Accomplishments

- `WorkspaceSession` validates exact registry-owned references and tracks one final search/view. Twelve local operations include repeats; dirty drafts deny mutations and searches. New searches clear obsolete view references. Unsupported fields and durable actions fail closed. Existing ten/three/six provider budgets,96KiB specialist evidence and General Trip24KiB policy remain intact.
- Manual and agent filters retain unknown matches and label what is unconfirmed. Missing prices sort last. Structured model output cannot bypass the host operation counter.
- Current comparison evidence preserves traveler order and exact room IDs, including options outside preview10. Evidence has a12KiB bound with explicit omission rather than misleading text truncation. Room inspections refresh membership evidence for subsequent operations. Prompt rules separate checked baggage from cabin baggage, property kitchens from room kitchens and new-search intent from current-results discussion.
- Agent batches and manual dismissal/restore produce quiet feedback. One in-memory inverse is bound to its resulting revision; later edits clear it. Undo preserves original timestamps, invalidates pending authority and makes no provider or durable-choice request. Focus and unsent text survive completion.

## Task Commits

Parent performed every commit in the shared checkout; executor branch safety prohibited committing directly on locrian-peacock.

| Task | RED | GREEN |
| --- | --- | --- |
|18-08-01 bounded host operations and filter parity|626fb82|9b8e348|
|18-08-02 current exact evidence and grounded prompt|e6e1d4c|b161125|
|18-08-03 quiet feedback and guarded Undo|0b08e8c|6745718|

Actuals measured from persisted per-plan ledger2c5e085..6745718:6 commits,17473 tokens using changed-diff characters/4 rounded up,12 source/test files plus3 RED evidence records. Metadata documentation is excluded from that source interval. First RED commit21:47:21+01:00; final GREEN21:58:53+01:00.

## Verification

- Named worker/tools/workspace graph+CRUD tests:50 passed.
- Workspace+TravelSearch tests:58 passed.
- Adjacent frontend suite:73 passed, one existing conditional SSE-fixture skip in standalone invocation. The264-passing Python adjacent suite supplies and executes that actual-SSE frontend fixture path.
- Python adjacent coverage includes current specialist journeys, Canvas travel, research tools and registry;264 passed. Diff whitespace check passed.
- Real FastAPI CRUD/SQL checks verify committed conversation readback, completed TopicRun, unchanged shortlist/preferred and absence of workspace inventory in database/checkpoints. View-only updates deliver the original search and original observed time after the signed commit.
- Detailed commands and outcomes: [verification record](../../../artifacts/testing/2026-10-27-workspace-operations/verification.md). Repository-relative path: `artifacts/testing/2026-10-27-workspace-operations/verification.md`.

## TDD Gate Compliance

All three RED commits contain failing behavior assertions before their GREEN implementations. `red-01.json`, `red-02.json`, `red-03.json` were checked with GSD `check tdd-red-evidence`; each returned `RED_EVIDENCE_OK` before GREEN. TAP summaries explicitly normalize actual pytest/Vitest named failures. A test import typo during task02 was fixed before the qualifying RED run. Tests cover actual SDK dispatch and mounted/HTTP/database outcomes; scripted assistant prose is not live evaluation evidence.

## Deviations from Plan

1. **Authorized bounded scope expansion:** `TravelSearch.jsx` and its existing tests needed manual/agent filter parity, truthful retained-unknown labels and per-card dismissal controls. Parent explicitly authorized both. This adds two files to the declared ten, without a service, dependency, endpoint or durable schema.
2. **Rule2 correctness:** Removed model-authored workspace_view structured output to prevent bypassing the counted host tool. Added direct worker workspace-context binding and refreshed registry membership after rate inspection. These reuse the existing request-local mechanism and registry.
3. Parent owns shared STATE/ROADMAP/WINDOWS/requirements updates and browser verification; this executor did not race those files. Original planning-only D18-10 boundary was superseded by explicit implementation authorization.

## Integration Handoff

Controller methods: `workspace.dismiss({search_id, option_id, room_id:null})`, `workspace.restore(reference)`, `workspace.undo()`. Row label: **Dismiss from results**. The small open dismissed-results panel above search uses **Restore {name}**. Accepted batch status: **Results updated. Your saved choices have not changed.** Undo button text **Undo**, accessible name **Undo workspace change**. No pane/focus/scroll takeover is introduced. Plan10 can simplify surrounding Ask/Choose actions while keeping these controls and methods.

## Remaining Delivery Gates

Source tasks are complete; mandatory runtime browser verification remains pending with the parent rebuild and plan12. Parent must exercise Chrome DevTools using the example account, inspect screenshots/console/network, and evaluate real-model local refinement and unknown terminology. Existing integration evidence under `artifacts/testing/2026-10-27-shared-travel-workspace/` is parent-owned. No browser or live quality pass is claimed for this slice. No new implementation stubs, skipped tests or unmodeled network/auth/schema surfaces were introduced. Existing LangGraph/Python/Lit warnings remain unrelated. Report this pending gate in the parent defect/state tracking until verified.

## Self-Check: PASSED

All12 source/test files, three RED evidence files and six listed task commits exist. No source changes remain uncommitted after6745718. Summary and verification documentation await the parent metadata commit.
