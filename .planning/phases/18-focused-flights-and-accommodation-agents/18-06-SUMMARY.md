---
phase: 18-focused-flights-and-accommodation-agents
plan: "06"
subsystem: ui
tags: [react, zod, travel, concurrency, registry]
requires:
  - phase: 18-04
    provides: Manual authenticated travel search and focused topic workspaces
provides:
  - One synchronous owner/Plan/topic workspace controller for manual forms, applied searches, views and final agent batches
  - Strict bounded workspace context, view, reference and update schemas
  - Authorized registry resolution, retained refresh evidence and detached detail inspection
affects: [18-07, 18-08, 18-10, 18-11, 18-12]
tech-stack:
  added: []
  patterns: [Synchronous revision and generation authority, strict ephemeral projection, private checkout handle isolation]
key-files:
  created:
    - frontend/src/features/plans/travel/useTravelWorkspace.js
    - frontend/src/features/plans/travel/travelWorkspaceSchema.js
    - frontend/src/features/plans/travel/TravelWorkspace.test.jsx
  modified:
    - frontend/src/features/plans/travel/TravelWorkspace.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
    - frontend/src/features/plans/travel/TravelSearch.test.jsx
key-decisions:
  - Manual requests resolve their existing authorized registry snapshot before entering shared state; checkout handles remain in a bounded private ref.
  - Trip imports capture the workspace revision at their navigation request; a subsequent explicit navigation can import, but delayed evidence cannot replace later manual work.
  - Parent performs commits and integrated browser verification because execution uses the shared checkout without branch changes.
requirements-completed: [FOCUS-01, FOCUS-05, FOCUS-06, FOCUS-11]
duration: 15min
completed: 2026-10-27
status: complete
verification_status: automated_complete_browser_pending
plan_head_before: 608da142ebfadde331fdcff48b9beb0008129d07
actuals:
  tokens: 16623
  tasks: 2
  commits: 4
coverage:
  - id: D1
    description: Manual stay and return-flight HTTP searches work with closed chat and reject typed-edit races
    requirement: FOCUS-11
    verification:
      - kind: integration
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx#mounted manual HTTP search
        status: pass
    human_judgment: false
  - id: D2
    description: Strict final agent batches enforce scope, revision, run, brief, evidence, hydration and duplicate guards
    verification:
      - kind: unit
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx#atomic agent batch
        status: pass
    human_judgment: false
  - id: D3
    description: Real authenticated manual journey, visual states, responsive behavior and console/network inspection
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/verification.md
        status: unknown
    human_judgment: true
    rationale: Integrated Chrome DevTools verification belongs to the parent and plan18-12; this executor did not rebuild or exercise the browser.
---

# Phase 18 Plan 06: Shared manual travel workspace Summary

**A single synchronous workspace controller protects newer traveler edits, validates final agent batches, and retains the exact evidence behind open details.**

## Accomplishments

- Extracted draft fields, applied criteria, snapshot/search identity, view, details reference, revision and request generation from TravelSearch into one controller mounted in TravelWorkspace. Standalone TravelSearch callers receive the same controller through a wrapper.
- Manual search retains the existing authenticated travelRequest boundary. Its result ID resolves through the authorized research/snapshot endpoint; strict parsing checks Plan, topic, identity, membership and freshness before state changes. Both HTTP stages reject obsolete generations/revisions.
- Form and view changes revoke authority synchronously, before abort/cancellation callbacks. Manual controls remain usable while chat is active, unavailable or canceling. Scope changes rotate the workspace instance. Safe-integer revision overflow rotates identity instead of losing precision.
- Final typed agent updates apply atomically, synchronize only a clean draft, retain one inverse, deduplicate action IDs, reject hydration and preserve open details. Plan18-07 connects this tested method to successful current-turn completion.
- Catalog-backed inventory filters, local budget/stars/rating/carrier/direct/baggage filters, sort and pagination remain available. View-only changes perform no supplier work. Applied chips and draft notices distinguish displayed evidence from unsubmitted edits; exploratory saved-date/party differences are labeled.
- Updating and failed refreshes keep prior evidence and its time. Empty success keeps exact criteria with Edit search and existing reset controls. Open details retain their original search/option and criteria when new results arrive, including reused option IDs; detached evidence is labeled. Freshness controls choosing independently of list refresh.
- Saved traveler count prefills bounded rooms/flight party. Checkout handles never enter the shared reducer or agent context; an in-memory private map preserves existing mock flight checkout.

## Task Commits

1. **18-06-01 RED:** `da0911d` — reproduce typed-edit manual search races.
2. **18-06-01 GREEN:** `f2ed0f6` — share manual workspace state and reject stale agent batches.
3. **18-06-02 RED:** `8ddb1d2` — cover retained refresh evidence and detached details.
4. **18-06-02 GREEN:** `063c84e` — preserve refresh evidence and scoped detail inspection.

Parent created each commit immediately on request because this sequential shared-checkout execution cannot satisfy the executor-only agent branch allow-list. No branches were changed. Metadata commit and STATE/ROADMAP updates are parent-owned.

## Verification

- `npm --prefix frontend test -- --run src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx`: **46 passed, 1 skipped**.
- `uv run --locked pytest -q services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py`: **11 passed**. Existing dependency deprecation warnings remain.
- `git diff --check`: passed.
- Named coverage includes both mounted HTTP modes with closed/unavailable chat; unsubmitted typing and late requests; late authorized registry read; forged/cross-Plan evidence; all envelope identity dimensions; expired evidence; dirty draft; duplicate/hydration rejection; authority revoked before cancellation callback; safe revision rollover; local filter/sort without supplier calls; retained refresh/empty constraints; detached exact references; and delayed Trip import precedence.
- No npm build, Docker rebuild, browser exercise or production/provider acceptance is claimed here. Parent requested integrated runtime work after coordinated source changes. Planning evidence already exists at `artifacts/testing/2026-10-27-shared-travel-planning/plan/`; new implementation evidence remains the parent's delivery gate.

## TDD Gate Compliance

Both tasks had intentional failing assertions before production edits and RED commits before GREEN commits. Initial jsdom dialog fixture failure was corrected before accepting RED. GSD's checker expects Node TAP summaries, so actual Vitest JSON results were normalized to TAP for the evidence check; both records returned `RED_EVIDENCE_OK`. Records are `/tmp/travella-18-06-red.json` and `/tmp/travella-18-06-02-red.json`. No refactor-only commit was needed.

## Integration Contract for 18-07 and 18-08

`travelWorkspaceSchema.js` exports `travelReferenceSchema`, `travelWorkspaceViewSchema`, `travelWorkspaceContextSchema`, `travelWorkspaceUpdateSchema`, and `emptyWorkspaceView`.

- Context: `instance_id`, safe-integer `revision`, nullable `search_id`, `view`, `draft_dirty`; maximum32KiB.
- View: `budget` numeric string or empty; booleans `refundable/direct/bag`; `sort` provider/price/quality; `stars` empty/3/4/5; `rating` empty/7/8/9; bounded `airline`; page1–100; `dismissed_ids` maximum100; `comparison_refs` maximum3 full `{search_id, option_id, room_id}` references. Topic-inappropriate filters are rejected on updates. IDs maximum100 characters; references and dismissals must belong to the supplied snapshot.
- Update: exactly `action_id`, `plan_id`, `topic`, `instance_id`, `base_revision`, `run_id`, `brief_digest`, `search_id`, `snapshot`, `view`. Digests are64 lowercase hex characters. Owner identity is captured locally and never accepted from an envelope.
- Controller: `getWorkspaceContext()`, `onWorkspaceRunStart({run_id, brief_digest})`, `onWorkspaceRunEnd(runId)`, `applyWorkspaceUpdate(update, {hydrating?})` returning whether applied, plus `state`, `setDraft`, `setView`, `dispatch`, `search`, `cancel`, `undo`, and `importSnapshot`.
- TravelWorkspace already passes those callbacks to useTravelConversation. They are optional/unconsumed until18-07. Do not invoke updates from history hydration. Apply success before ending authority.
- Existing manual registry snapshots have `draft_facts: {}`. Manual client normalization fills only this local saved-trip baseline before strict parsing;18-07 must supply valid host-authored draft facts for agent envelopes. It must not put raw inventories/checkout handles into durable snapshots/checkpoints.

## Deviations from Plan

1. **[Rule2 — Critical validation]** Added one authorized registry read after every successful manual search. The existing manual HTTP response includes checkout handles and does not itself conform to the strict evidence snapshot. The extra read supplies the already implemented allowlisted projection; failures retain prior evidence. Tests were upgraded to model that boundary.
2. **[Rule2 — Correctness]** Saved traveler counts now prefill the existing valid party controls instead of always assuming two adults. The form still requires explicit review of ages/rooms.
3. **Execution coordination:** Per-task commits and final state/metadata updates are parent-owned; no changes to branch layout or unrelated files. Browser/build/runtime verification is centralized under the parent and18-12, not silently replaced by unit tests.

## Deferred Issues and Delivery Gates

- The existing `CanvasTravelJourney.test.jsx` actual-Python-SSE case is skipped because `TRAVELLA_CANVAS_SSE_FIXTURE` is unset. This is pre-existing fixture-dependent coverage, not a new skipped test.
- Required authenticated Chrome DevTools implementation screenshots, interaction, responsive checks and console/network inspection remain **pending**. These source tasks are automated-verified; final product delivery remains incomplete until the parent records those gates.
- Current manual choosing still uses the existing deterministic review path and lease rules; plan18-10 owns removing history/model failure as a prerequisite once the lease clears. Plan18-08 owns comparison/dismiss/Undo UI; plan18-11 owns tab recovery. No new backend CRUD operation was introduced here.

## Known Stubs

None introduced. Existing HTML input `placeholder` attributes are real input hints. Pending stream wiring and future comparison/recovery UI are explicitly assigned to subsequent plans, not claimed as delivered here.

## Self-Check: PASSED

All six declared source/test files exist. All four task commits exist. Both task test commands ran; the known conditional SSE skip and pending browser gate are reported above. The parent owns SUMMARY commit and state advancement.
