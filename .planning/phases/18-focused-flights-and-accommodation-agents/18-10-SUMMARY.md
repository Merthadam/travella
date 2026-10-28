---
phase: 18-focused-flights-and-accommodation-agents
plan: "10"
subsystem: travel-ui
tags: [exact-comparison, deterministic-review, explicit-confirmation, compact-chat]
status: complete
requires:
  - phase: 18-08
    provides: Shared workspace refinements, dismissal and Undo
  - phase: 18-09
    provides: Observed carrier metadata, source and freshness facts
provides:
  - Ordered factual main comparisons with discussion failure recovery
  - Direct exact room/fare review and authoritative choice receipts independent of history hydration
  - Main saved choices and compact original-observation chat references
  - Pending-draft preservation and inactive/unmounted review fencing
affects: [18-11, 18-12]
tech-stack:
  added: []
  patterns: [registered exact-reference comparison, deterministic focused review, authoritative save receipt, scoped UI operation epoch]
key-files:
  created: [frontend/src/features/plans/travel/TravelComparison.jsx]
  modified:
    - frontend/src/features/plans/travel/TravelWorkspace.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
    - frontend/src/features/plans/travel/TravelConversation.jsx
    - frontend/src/features/plans/travel/travelApi.js
    - frontend/src/features/plans/travel/useTravelConversation.js
    - frontend/src/features/plans/travel/CarrierMark.jsx
    - services/agent/tests/test_travel_specialist_journey.py
    - services/crud/tests/test_topic_conversations.py
key-decisions:
  - "Open factual comparison before requesting discussion; preserve ordered exact references, main pane and composer."
  - "Host intent review resolves one exact observation; the server lease and choice challenge remain authoritative."
  - "A commit receipt survives failed transcript refresh; manual saved-choice controls do not require chat history."
  - "Historical links inspect only the original authorized snapshot and never automatically refresh supplier inventory."
  - "Inactive, changed-scope and unmounted operations cannot open late choice dialogs."
requirements-completed: [FOCUS-05, FOCUS-07, FOCUS-08, FOCUS-11, FOCUS-13, FOCUS-14]
plan_head_before: 6745718c2de1f3c2d406786fdf510909580c8ae4
actuals:
  tokens: 23379
  tasks: 3
  commits: 7
duration: 20min
completed: 2026-10-27
coverage:
  - id: exact-main-comparison
    description: "Two/three ordered observations remain usable when discussion fails; incompatible routes, dates, party and actual currency are labeled."
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx
        status: pass
    human_judgment: false
  - id: exact-manual-choice
    description: "Independent review, real lease rejection, exact room persistence, explicit confirmation and receipt-based removal."
    verification:
      - kind: integration
        ref: services/agent/tests/test_travel_specialist_journey.py::test_manual_exact_room_review_persists_with_reply_and_requires_confirmation
        status: pass
      - kind: integration
        ref: services/crud/tests/test_topic_conversations.py::test_exact_choice_waits_for_actual_shared_lease_then_uses_fresh_revision
        status: pass
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx
        status: pass
    human_judgment: false
  - id: compact-reference-chat
    description: "Original exact-room links do not search suppliers; typed next draft survives reply completion."
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelConversation.test.jsx
        status: pass
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/18-10-verification.md
        status: unknown
    human_judgment: true
    rationale: "Parent owns the rebuilt authenticated Chrome journey, responsive inspection and screenshot/network evidence in18-12."
---

# Phase 18 Plan 10: Main exact comparison and independent choice Summary

**Ordered factual comparison, deterministic exact offer review, durable save receipts and compact historical references now share the primary travel workspace.**

## Accomplishments

- Main comparison keeps two/three full search/option/room identities in selection order, prevents a fourth with an accessible explanation, retains historical observations after new searches and offers local discussion retry. Carrier names appear once visually while logos remain accessible. Flight origin, destination, dates, party, cabin and actual price currency participate in comparability; room totals use their own observed occupancy and excluded taxes.
- `reviewExactTravelOption` uses the existing authenticated focused-turn `intent: review` path directly, validates returned scope and exact reference, and supplies its authoritative revision to the existing challenge/commit flow. History failure does not disable review or saved-choice removal. Active owned chat attempts Stop first; server lease rejection remains an honest local error. Only explicit confirmation saves. Commit receipts remain authoritative after history refresh failure.
- The main pane owns preferred/shortlist controls and historical details. Chat contains prose, notes and compact reference links, with no specialist `TravelSuggestions` or import control. Original-room references perform a registry GET, retain the current results and show only the exact room without automatic supplier refresh. General Trip imports remain unchanged.
- The composer stays editable while replying and completion clears only the submitted draft if it remains unchanged. Operation epochs prevent late review/challenge/confirm UI updates after topic deactivation, scope change or unmount.

## Task Commits

Parent created all commits in the shared checkout; executor branch guard precluded child commits.

| Task | RED | GREEN |
| --- | --- | --- |
| 18-10-01 main exact comparison | `f95a178` | `8c974e1` |
| 18-10-02 independent exact choice | `d62f6af` | `c0c871e` |
| 18-10-03 compact chat and draft preservation | `27694af` | `78d4d6d` |

Measured ledger span has seven commits, including the parent’s intervening `0c67e11` 18-08 documentation commit. Actual token estimate is ceiling(diff characters/4) over this plan’s 15 source/test files plus three RED evidence records; it excludes unrelated parent documents and runtime artifacts.

## Verification

- Workspace, Search, Conversation and travelApi: **81 passed**. Final Workspace rerun after progress copy: **40 passed**.
- Conversation plus standalone CanvasTravelJourney: **16 passed, one fixture-gated skip**. The skipped bridge was subsequently exercised by **eight passing actual Python SSE→React journeys**, including manual-current-search versus historical General Trip import behavior.
- Agent exact-room journey plus CRUD topic integration: **25 passed**, including actual HTTP handlers and isolated SQLite readback. Exact apartment rate EUR950 remains distinct from cheaper property price; reopened DB shortlist retains exact room/reference/price; explicit removal returns researching. Shared flight lease blocks stay choice challenge with409; cancellation releases it and fresh revision succeeds. Existing unauthorized/owner/missing, stale revision/brief, forged proof, duplicate-request and expiry checks pass.
- Actual Research flight bridge: **18 Python tests passed**; its fixture drives all11 conditional React tests. A direct standalone ResearchFlights invocation had11 fixture-gated skips before the bridge run; no tests were disabled or weakened.
- `git diff --check` passed. Existing LangGraph deprecation warnings remain unrelated.
- Production build and required authenticated Chrome inspection are **pending parent-owned runtime verification**. The parent launched build session13160 after source commit78d4d6d. No browser completion is claimed by this summary.

## TDD Gate Compliance

All three tasks have persisted intentional RED records and `RED_EVIDENCE_OK` before implementation. Records: `18-10-01-red.json`, `18-10-02-red.json`, `18-10-03-red.json` in the shared evidence directory. RED→GREEN commits are separate. The03 cancellation test double initially caused teardown failure; it was corrected to return its actual async contract and rerun to assertion-only RED. Additional regression tests cover parent-observed lifecycle, currency/route and draft failures.

## Deviations from Plan

1. **[Rule2 — critical integration] Authorized narrow hook expansion.** `useTravelConversation.js` accepts an explicit structured comparison while hidden without weakening ordinary send, run or owner gating. It reconciles a cancelled local run only after an authoritative completed review receipt. No new API or dependency.
2. **[Rule1 — visible duplicate identity] Authorized CarrierMark option.** `CarrierMark.jsx` adds default-preserving `showName`; the main card keeps its one name heading and accessible logo identity. Existing consumers retain names by default.
3. **[Rule1 — real browser defect] Preserve newly typed text.** Parent’s live08 run found a draft cleared by completed sending. Mounted deferred-send coverage now proves the next unsent draft survives. This also required allowing composition during an active reply while send remains guarded.
4. **[Rule1 — lifecycle correctness] Fence pending manual review.** Parent spotcheck identified hidden mounted topics and unmount races; task03 added active/scope/epoch checks through review, challenge and confirmation, including catch/finally. Tests fail without these guards.
5. **[Rule1 — actual contract fixture] Database assertions use the real payload shape.** Initial new readback assertions assumed a projected `preferred` object/column; corrected tests read persisted shortlist and preferred_id. No backend behavior changed.

## Known Stubs

None introduced. Unknown carrier, amenities, occupancy and price fields are truthful provider-data limitations, not stubbed data. All original-observation views use registered snapshots or persisted evidence.

## Remaining Delivery Gate

Parent owns STATE/ROADMAP/WINDOWS and plan18-12. Keep authenticated Chrome comparison, exact unbooked choice with reload/removal, new draft during reply, historical reference, mobile layout and console/network inspection pending until exercised against the rebuilt source. Evidence checklist and executed commands are in `artifacts/testing/2026-10-27-shared-travel-workspace/18-10-verification.md`.

## Self-Check: PASSED

All15 source/test files and three RED records exist. All six task commits exist; measured ledger base6745718 and final source78d4d6d are present. No source remains uncommitted for this plan. Parent owns the separate documentation commit and runtime gate.
