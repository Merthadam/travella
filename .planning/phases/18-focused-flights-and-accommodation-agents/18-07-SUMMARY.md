---
phase: 18-focused-flights-and-accommodation-agents
plan: "07"
subsystem: api
tags: [langgraph, contextvars, fastapi, sse, react, workspace]
requires:
  - phase: 18-06
    provides: Shared manual workspace controller and strict atomic update reducer
provides:
  - Bounded focused workspace input with digest-bound CRUD begin and completion
  - Request-local final search and view collection outside graph checkpoints
  - Post-commit host-authored workspace batches through direct responses and both SSE projections
  - Current-run browser application with manual-edit, brief, cancellation and duplicate fences
affects: [18-08, 18-10, 18-11, 18-12]
tech-stack:
  added: []
  patterns: [Request-local ephemeral collectors, digest-only durable binding, host-authored atomic workspace updates]
key-files:
  created: [services/agent/tests/test_travel_workspace_journey.py]
  modified:
    - services/travel_topics.py
    - services/agent/http_contracts.py
    - services/agent/specialist_service.py
    - services/crud/topic_conversations.py
    - services/crud/tests/test_topic_conversations.py
    - services/agent/request_context.py
    - services/agent/graph/builder.py
    - services/agent/graph/nodes/travel_specialist.py
    - services/agent/claude/travel_specialist.py
    - services/agent/service.py
    - services/agent/checkpoint.py
    - frontend/src/plansApi.js
    - frontend/src/features/plans/travel/useTravelConversation.js
    - frontend/src/features/plans/travel/TravelWorkspace.test.jsx
key-decisions:
  - Final registered search identity is tracked by the host at successful tool return, including empty success; historical comparisons do not select the final workspace.
  - The browser holds STATE_SNAPSHOT effects until successful terminal completion and refreshed matching brief, then uses the existing controller exactly once.
  - The parent owns commits, shared state updates and integrated Chrome verification in this shared checkout.
requirements-completed: [FOCUS-02, FOCUS-05, FOCUS-06, FOCUS-09, FOCUS-11, FOCUS-12]
duration: 19min
completed: 2026-10-27
status: complete
verification_status: automated_complete_browser_pending
plan_head_before: 0ab7296370048b64de65cfbbac0e0bbe2f6b2911
actuals:
  tokens: 15392
  tasks: 3
  commits: 6
coverage:
  - id: D1
    description: Focused workspace context is bounded, authorized and bound to durable completion by a digest
    verification:
      - kind: integration
        ref: services/crud/tests/test_topic_conversations.py#test_workspace_digest_binds_begin_complete_without_persisting_context
        status: pass
      - kind: integration
        ref: services/agent/tests/test_travel_workspace_journey.py#test_foreign_or_expired_workspace_is_rejected_before_worker
        status: pass
    human_judgment: false
  - id: D2
    description: Real SDK searches reach a final ephemeral batch while SQL records and serialized graph checkpoints exclude workspace data
    verification:
      - kind: integration
        ref: services/agent/tests/test_travel_workspace_journey.py#test_final_search_crosses_graph_and_commit_without_durable_inventory
        status: pass
      - kind: integration
        ref: services/agent/tests/test_travel_workspace_journey.py#test_failed_dirty_or_revoked_turn_never_releases_workspace
        status: pass
    human_judgment: false
  - id: D3
    description: Mounted current conversation updates the main list after completion and rejects obsolete manual edits or duplicate delivery
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx#real conversation delivers one committed batch
        status: pass
      - kind: integration
        ref: services/agent/tests/test_travel_workspace_journey.py#test_successful_stream_has_identical_workspace_state_and_terminal
        status: pass
    human_judgment: false
  - id: D4
    description: Authenticated real browser agent-search/manual-edit race and implementation screenshots
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/verification.md
        status: unknown
    human_judgment: true
    rationale: Parent owns the coordinated rebuild, Chrome DevTools evidence and live agent/provider execution in plan18-12.
---

# Phase 18 Plan 07: Committed workspace effects Summary

**Focused specialist searches now deliver one host-authored main-workspace batch after CRUD completion, with digest binding and current browser authority checks.**

## Accomplishments

- Added strict WorkspaceContext, WorkspaceView, WorkspaceUpdate and saved draft-facts models. IDs, safe-integer revisions, comparison and dismissal references, supported topic filters, extra fields and the 32 KiB input ceiling are validated. Legacy calls omit the new optional field; Trip rejects focused workspace context.
- Plan authorization precedes registry evidence access. Current owner/Plan/topic and expiration are resolved server-side; dismissed and compared IDs must be members. Applied criteria come from the registry. Dirty form strings remain local.
- TopicRun adds an optional bounded workspace input digest to the existing input hash identically at begin and complete. No database column/table or migration was added. Changed digest reuse returns conflict; successful readback has only durable conversation data.
- Request-local ContextVars carry context and the final successful registered search/view through the existing non-checkpointed child flow. Finally blocks restore both collectors even across exceptions and concurrent invocations. Empty successful searches retain their exact criteria and deliver an empty result set.
- The host worker explicitly tracks successful search returns, preserves full safe registry observations, and accepts only typed final view state with valid membership. Existing saved comparison proof and CRUD lease/brief checks remain in force.
- The server constructs the envelope only after successful CRUD completion, then rechecks generation and registry authority. Saved draft facts are strict and incorporate authoritative saved brief dates/party/destination, including manual registry observations initially containing empty draft facts.
- Both direct AgentResponse and SSE state/terminal projections carry the same bounded update. The frontend parses it strictly, captures the current workspace context at send time, registers exact run/brief authority, and applies only after successful terminal completion and matching refreshed brief. History hydration never applies effects.
- Stop revokes browser authority synchronously. Manual draft/search/filter/sort/compare changes use the existing shared controller, preserving newer traveler work and rejecting late or repeated effects. Cancellation acknowledgement continues to gate new chat sends while manual controls remain independent.

## Task Commits

1. **18-07-01 RED:** `538bf72` — bind workspace context to durable topic completion.
2. **18-07-01 GREEN:** `e924c6b` — bounded authorized input and digest-bound completion.
3. **18-07-02 RED:** `abfda55` — final-search graph/CRUD journey.
4. **18-07-02 GREEN:** `6952704` — request-local final workspace result outside checkpoints.
5. **18-07-03 RED:** `2a5288a` — current conversation delivery and races.
6. **18-07-03 GREEN:** `f9aec08` — committed current workspace batches through SSE.

The parent performed these commits immediately after each RED/GREEN handoff because the shared checkout branch does not meet the executor-only agent branch allow-list. No branch or worktree was changed. SUMMARY commit and STATE/ROADMAP/requirements advancement are parent-owned.

Metrics use the realized fifteen-file diff: 61,567 characters / 4, rounded up to 15,392. `git rev-list --count 0ab7296370048b64de65cfbbac0e0bbe2f6b2911..f9aec08` measured six commits. The executor discovered no per-plan ledger file after parent commits; this base is the verified parent of the first task commit, not an inferred narrated count.

## Verification

- `npm --prefix frontend test -- --run src/plansApi.test.js src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelConversation.test.jsx`: **42 passed**.
- `uv run --locked pytest -q services/crud/tests/test_topic_conversations.py services/agent/tests/test_travel_specialist_journey.py services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_agent_checkpoint.py services/auth/tests/test_travel_proxy.py services/agent/tests/test_travel_api.py services/agent/tests/test_agent_api.py services/agent/tests/test_specialist_worker.py --tb=short`: **80 passed**. Existing dependency deprecation warnings remain.
- `git diff --check`: passed.
- CRUD checks execute actual authenticated FastAPI handlers against isolated SQLite, then reopen database sessions and read records. Changed begin/complete digest semantics, successful transcript persistence, failed completion lease release and existing identity/authorization/conflict paths passed.
- The new journey uses the actual SDK registration/dispatch with scripted provider/model fixtures, compiled LangGraph and an actual InMemorySaver. It inspects serialized saver storage, checkpoints, CRUD readback and SQL topic rows. This is deterministic integration evidence, not a live model/provider quality claim.
- Coverage includes stays, flights, zero matches, cross-owner/Plan/topic evidence, expiry, invalid/oversized context, dirty draft, failed completion, newer generation after commit, concurrent success/exception context isolation, identical SSE envelopes, foreign/extra parser fields, state-only and terminal-only delivery, duplicate delivery, changed saved brief, failed terminal, Stop and manual draft/search/filter/sort/compare races.

## TDD Gate Compliance

All three tasks had observed named failing assertions and separate RED commits before production implementation. Task1 failed HTTP status `422 != 200` for the new digest; task2 completed a real transcript but returned `workspace_update=None`; task3 failed because the captured request had no workspace context. Initial task2 fixture setup failures were corrected before accepting RED.

**Procedural gap:** the executor did not persist and run the GSD `tdd-red-evidence` normalization/checker before GREEN. The actual failing runs and RED/GREEN commit order were observed, but checker compliance is not claimed. No refactor-only commit was needed.

## Deviations from Plan

**[Rule 2 — Missing critical defense] Explicit nested checkpoint stripping.** Added `workspace_context` and `workspace_update` to `services/agent/checkpoint.py` transient keys and tested a post-graph nested projection. Actual compiled graph channels already excluded them, but the generic checkpoint sanitizer also needs to reject their metadata/view if handed a completed projection. Parent accepted this bounded fifteenth-file expansion; no storage schema or service change.

The existing fourteen-file/three-task scope warning was accepted by the parent before execution because this is one coordinated protocol through existing boundaries. No additional package or deployment was introduced. Authoritative saved draft-fact normalization strengthens the planned projection contract rather than altering product scope.

## Known Stubs

None introduced. Advanced local workspace tools and richer manual comparison/Undo/recovery interfaces remain assigned to plans18-08,18-10 and18-11. This plan supplies their final transport and authority boundary.

## Deferred Issues and Delivery Gates

- Required Chrome DevTools agent-search/manual-edit race, post-change implementation screenshots, console/network inspection and live model/provider quality remain **pending with the parent**. This executor did not rebuild, invoke live suppliers or exercise the browser. Automated source work is complete; final product delivery is not claimed.
- Existing planning screenshots: `artifacts/testing/2026-10-27-shared-travel-planning/plan/`. Parent's evolving runtime evidence: `artifacts/testing/2026-10-27-shared-travel-workspace/verification.md`. Parent reported the plan18-06 manual browser tracer passed both modes; that does not substitute for this plan's agent-effect browser gate.
- No new test was skipped. Parent must record the outstanding browser verification in the cross-phase ledger if enabled, since this shared executor owns only its source/test files and summary.

## Self-Check: PASSED

All fifteen changed source/test files exist. All six task commits are present in git history. Both required verification groups ran and passed with nonzero test collection. SUMMARY is written on disk; parent owns metadata commit and shared state updates.
