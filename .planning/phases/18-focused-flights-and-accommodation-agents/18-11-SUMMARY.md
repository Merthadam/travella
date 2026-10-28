---
phase: 18-focused-flights-and-accommodation-agents
plan: "11"
subsystem: travel-ui-auth
tags: [session-recovery, privacy, lifecycle-races, accessibility, exact-room-comparison]
status: complete
runtime-verification: pending-parent-18-12
requires:
  - phase: 18-10
    provides: Independent exact comparisons, explicit choice receipts and compact conversation
provides:
  - Strict reference-only tab recovery bound to an authenticated random session scope
  - Synchronous account/scope cleanup and obsolete async response fencing
  - Quiet reply completion, single live pagination count and precise room comparisons
affects: [18-12]
tech-stack:
  added: []
  patterns: [authenticated public storage partition, strict bounded recovery, controller revision and operation epoch guards]
key-files:
  created:
    - artifacts/testing/2026-10-27-workspace-recovery/verification.md
  modified:
    - services/auth/api.py
    - services/auth/tests/test_api.py
    - frontend/src/AccountApp.jsx
    - frontend/src/AccountApp.test.jsx
    - frontend/src/features/plans/canvasViewState.js
    - frontend/src/features/plans/canvasViewState.test.js
    - frontend/src/features/plans/travel/useTravelWorkspace.js
    - frontend/src/features/plans/travel/useTravelConversation.js
    - frontend/src/features/plans/travel/TravelWorkspace.jsx
    - frontend/src/features/plans/travel/TravelWorkspace.test.jsx
    - frontend/src/features/plans/travel/TravelConversation.jsx
    - frontend/src/features/plans/travel/TravelConversation.test.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
    - frontend/src/features/plans/travel/SearchSelect.jsx
    - frontend/src/features/plans/travel/TravelComparison.jsx
    - frontend/src/features/plans/travel/travel-results.css
key-decisions:
  - "Recovery scope is independent random public data in the existing encrypted session payload, stable on refresh and rotated on new authentication; it grants no access."
  - "Bind browser recovery only after authenticated session200; clear private view and invalidate prior async work before loading a changed account scope."
  - "Persist typed drafts, applied criteria and references only; reload resolves authorized registry evidence and never automatically searches or opens supplier-backed details."
  - "Exact room comparison deduplicates full references rather than properties, with the existing three-option maximum."
requirements-completed: [FOCUS-01, FOCUS-02, FOCUS-06, FOCUS-09, FOCUS-11, FOCUS-15]
plan_head_before: 78d4d6d38e92a53c2bf9f801a5b7f74d5a2fdf93
actuals:
  tokens: 20883
  tasks: 3
  commits: 9
duration: 19min
completed: 2026-10-27
coverage:
  - id: authenticated-reference-recovery
    description: "Session-owned bounded records restore only authorized evidence and clear on account changes."
    verification:
      - kind: integration
        ref: services/auth/tests/test_api.py::test_recovery_scope_is_random_session_partition_stable_on_refresh_and_rotated_on_login
        status: pass
      - kind: automated_ui
        ref: frontend/src/features/plans/canvasViewState.test.js
        status: pass
      - kind: automated_ui
        ref: frontend/src/AccountApp.test.jsx
        status: pass
    human_judgment: false
  - id: manual-precedence-and-focus
    description: "Old scopes and late cancellations cannot repaint; manual focus and exact room comparisons remain stable."
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelWorkspace.test.jsx
        status: pass
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelConversation.test.jsx
        status: pass
    human_judgment: false
  - id: responsive-runtime-acceptance
    description: "Authenticated desktop/mobile, theme, zoom and keyboard acceptance."
    verification:
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/verification.md
        status: unknown
    human_judgment: true
    rationale: "Parent owns final rebuild and Chrome evidence; automated checks do not establish the visual delivery gate."
---

# Phase18 Plan11: Session-scoped workspace recovery and lifecycle summary

**Random authenticated session partitions protect strict32KiB reference-only recovery; revision guards and quiet focus preserve manual control across cancellation and account changes.**

## Task commits

| Task | RED | GREEN |
| --- | --- | --- |
| 18-11-01 — authorized bounded recovery and account cleanup | `34412f7` | `0fb0ae4` |
| 18-11-02 — discussion, cancellation and brief races | `90a2843` | `e295927` |
| 18-11-03 — focus, count announcements and exact room comparisons | `54c6007` | `6ea7341` |

Parent performed all commits on shared `locrian-peacock`; executor did not bypass branch restrictions. Measured interval contains9 commits: the six above plus concurrent10-summary and two18-12 diagnostic commits. Actual tokens are `ceil(83531/4)=20883` from the final realized diff of the19 owned source/test/RED-evidence files, excluding unrelated parent changes. Metadata commit follows this measurement.

## Delivered behavior

- Existing encrypted session payload holds a fresh32-character random recovery_scope. Authorized GET returns it; legacy sessions backfill once without extending expiry; refresh retains it and new sign-in rotates it. It is neither derived from a credential nor accepted as authentication.
- AccountApp binds scope after authenticated200. Direct401, sign-out and changed200 scope clear recovery and revoke old private view/async work before another profile mounts. Same-session refresh preserves recovery.
- Strict versioned records store draft/applied criteria, local view, dismissed/comparison/detail references and search ID only. Maximum32KiB per record and60 combined Canvas/travel entries; no inventory, token, checkout handle, authority or inverse Undo. Deleted Plan cleanup clears its travel children. Storage-disabled operation remains usable.
- Reload uses a fresh instance and authorized registry GET, preserves dirty drafts/local preferences, and resets Undo. Expiry/foreign evidence produces Search again without supplier calls. Recovered details stay closed until explicit Reopen previous details.
- Previous-scope history errors and late cancellation cannot expire or repaint the current workspace. Changed saved brief revokes active workspace/review authority while preserving manual drafts/results. Commit-winning Stop refreshes truthful history without replaying old batches.
- Reply completion no longer focuses the composer. Pagination announces once, manual dismissal focuses the next card, and comparison displays localHH:mm, overnight dates, h/m duration and Direct/1stop grammar. Exact rooms at one property remain distinct; delayed registry comparisons respect manual revisions, inactive scope and explicit close. Room totals say Observed room offer · total stay.

## Verification

Final named/adjacent frontend run: **118 passed across6 files**. Agent journey/registry run: **23 passed**. Final scoped backend run: **90 passed,1 known-baseline test deselected**, explicitly not a complete auth-suite pass. Three new auth cases exercise real FastAPI handlers and encrypted SQLite SessionStore readbacks. All three RED checker gates passed before implementation. `git diff --check` passed.

Full commands, storage/security observations and baseline proof are in [verification.md](../../../artifacts/testing/2026-10-27-workspace-recovery/verification.md). Initial complete auth run had66 passes and one unchanged failure: obsolete onboarding route expected200 but returned404. Loading `78d4d6d` auth source into the same test process reproduced404. No assertion was weakened, skipped in source, or obsolete route restored. Parent records the separate broader699-pass/6-skip/1-baseline-failure run.

Final build and required authenticated Chrome desktop/mobile390px, light/dark,200% zoom, keyboard, screenshots and console/network acceptance are parent-owned18-12 work and **pending at source handoff**. This summary marks the three source tasks complete, not final browser acceptance. Existing source recovery and comparison tests cannot substitute for that gate.

## Deviations from plan

1. **[Rule2 — privacy] Approved two-file auth expansion.** Literal owner `session` could not distinguish a cookie/account switch in another tab. Parent explicitly approved `services/auth/api.py` and its tests to add an independent public partition in the existing encrypted payload, preserving account-guard/transaction lock order. No table, dependency, authentication resource or authorization change.
2. **[Rule1 — accessibility and race bugs] Approved TravelSearch/SearchSelect and paired Conversation test expansion.** Actual browser evidence exposed duplicate live pagination counts, dense timestamp rendering and reply-completion focus stealing. Parent also identified late room comparison responses and property-level deduplication; focused deferred tests proved/fixed these. Scope stays within current controls and temporary local comparisons.
3. **Shared orchestration.** Parent retains STATE/ROADMAP/WINDOWS, integrated browser/build evidence and commits. Existing agent journey tests were run unchanged because they already exercise actual graph/registry/CRUD authority. No unrelated backend changes were made.

## Threat flags

| Flag | File | Description |
| --- | --- | --- |
| threat_flag: auth-response-projection | services/auth/api.py | New public recovery_scope field crosses authenticated server-to-browser boundary. Independent random value, encrypted persistence, no credential derivation, stable-refresh/new-login behavior and non-authority are covered by HTTP/store tests. |

## Known stubs and limitations

No delivery-blocking source stubs introduced. Empty transient state is intentional until authenticated evidence loads. Known obsolete-route auth failure and pending integrated browser/build gate are reported to parent for the shared defect register. No auth gate or new external setup was needed.

## TDD Gate Compliance

Tasks01/02 required TDD; task03 added behavioral RED regressions for actual defects. `red-01.json`, `red-02.json`, `red-03.json` preserve commands and observed assertion evidence. Each passed `check tdd-red-evidence` before parent RED commit and GREEN source implementation. No invalid infrastructure failure was used as RED evidence.

## Self-Check: PASSED

All six task commits and19 owned source/test/evidence files exist. Source task commits are complete. Summary and verification record are written on disk for parent metadata commit. Shared state updates and final runtime acceptance remain with parent by explicit ownership assignment.
