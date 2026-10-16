---
phase: 16-date-gated-travel-previews-and-booking-navigation
plan: "04"
subsystem: [agent, ui, testing]
tags: [manual-search, previews, images, import, lifecycle]
requires:
  - phase: 16-date-gated-travel-previews-and-booking-navigation
    provides: Grounded token-free travel snapshots and lifecycle guards through Plan 03
provides:
  - Existing manual TravelSearch pages preloaded once with chat criteria and full retained results
  - Compact stay photographs and neutral flight illustration with safe image fallback
  - Import/manual continuation race and privacy regression coverage
affects: [phase-16-verification]
tech-stack:
  added: []
  patterns: [identity-scoped one-time import, independent manual result ownership, observed photo projection]
key-files:
  created: []
  modified:
    - services/agent/claude/canvas_travel.py
    - services/agent/tests/test_canvas_travel.py
    - frontend/src/features/plans/travel/CanvasTravel.jsx
    - frontend/src/features/plans/travel/travel-results.css
    - frontend/src/features/plans/components/PlanningCanvas.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
    - frontend/src/features/plans/travel/TravelSearch.test.jsx
    - frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
key-decisions:
  - The user's corrected D-04 uses existing manual search controls rather than a separate results-only renderer.
  - Import owns results only until a successful explicit manual search; old import expiry and rerenders cannot replace manual results.
  - Hotel photos and detail identifiers are observed metadata; flight visuals use a neutral local SVG because no provider logo field exists.
  - No checkout token crosses the agent snapshot; normal manual availability refresh is required for flight mock checkout eligibility.
patterns-established:
  - Validate Plan/mode/currentness, abort and advance epoch, then hydrate once per Plan/mode/search identity.
requirements-completed: []
requirements-pending: [TRAVEL-16-04, TRAVEL-16-05, TRAVEL-16-06, TRAVEL-16-07]
actuals:
  tokens: 13208
  tasks: 2
  commits: 2
plan_head_before: 635c6bc65a24c33e37c336d98551579ada14dd5c
source_baseline: 5bf1fb9
coverage:
  - id: existing-page-navigation
    description: Actual chat SSE renders previews and opens the existing manual page with exact fields and results without search
    requirement: TRAVEL-16-05
    verification:
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_stay_journey_actual_sse_to_react
        status: pass
      - kind: integration
        ref: services/agent/tests/test_canvas_travel.py#test_flight_journey_actual_sse_to_react
        status: pass
    human_judgment: false
  - id: manual-continuation
    description: New imports defeat old requests while manual edits and successful searches survive same-ID rerenders and import expiry
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelSearch.test.jsx
        status: pass
    human_judgment: false
  - id: corrected-browser-acceptance
    description: Authenticated desktop/mobile photo previews and existing manual-page journey
    requirement: TRAVEL-16-07
    verification: []
    human_judgment: true
    rationale: Root owns postimplementation Chrome/source-hash/network/screenshot verification and incremental review; those gates remain pending.
updated: 2026-10-16
status: in_progress
---

# Phase 16 Plan 04: Existing manual pages and picture previews Summary

**View all now opens the existing Accommodation search or Flight search page with the chat search's criteria and retained options preloaded. Compact previews include observed hotel photos or an honest fallback, and a neutral flight illustration.**

Both implementation tasks are complete. Corrected production browser acceptance and incremental independent review remain pending; this summary does not declare the phase delivered.

## Task Commits

1. **16-04-01: Existing-page preload and image preview tracer** — `fa05765`
2. **16-04-02: Import races, manual continuation and image safety** — `b1114e4`
3. **Incremental review fix: explicit reopening restores the selected chat snapshot** — `b2d3f7e`

Source baseline was `5bf1fb9`; execution HEAD was `635c6bc` after the root committed revised planning/sketch evidence. Actuals are realized diff characters/4 across implementation commits, not model usage.

## Behavior

- The separate `TravelResults` renderer is removed. PlanningCanvas retains its mounted draft/editor/chat and existing per-mode TravelSearch instances. View all selects the matching instance and supplies the safe snapshot. Existing opaque history, Back/Forward and reload recovery continue to work; no criteria, inventory or credentials enter history.
- Strict import validates Plan, mode, schema and currentness. A new identity aborts older manual requests and advances their epoch; it resets filters, comparison and open details, then hydrates dates, city/country/place ID, guest nationality, rooms/ages/currency or airport codes/party/cabin/pricing country. Airport labels synchronize on mounted imports. A legitimate missing place ID remains null.
- Same-identity rerenders preserve form edits. A successful explicit manual search takes ownership of its snapshot, so the earlier import clock or expired import prop cannot overwrite or hide fresh manual results. Imported offers still honor expiry, supersession and changed Canvas facts; detail activation rechecks current time.
- Deliberate View all or history Forward carries a local navigation request identity separate from search ID. Reopening chat search A after manual search B restores A; ordinary parent rerenders leave B and its edits alone. The nonce is not stored in URLs or history payloads.
- Existing filters, comparison, show-more, View rooms, View flight and manual sandbox controls remain. Hotel View rooms uses the observed hotel ID and captured search criteria only after the click. Token-free flight detail offers “Search again to check current availability”; clicking submits the existing form. Only a subsequent manual response carrying its normal private checkout token exposes the existing mock booking action. Import and refresh never automatically prebook/book.
- Safe stay DTOs now include observed `hotel_id`, sanitized `image_url`, stars, review score/count and bounded facilities. URL validation reuses the Agent public HTTPS boundary plus no-query/fragment/nonstandard-port photo policy. Unsafe/missing photos become null without losing inventory. No private connector implementation was imported and no photo/detail provider request was added.
- Chat hotel photos use 16:9 space, lazy loading, descriptive text and no-referrer. Missing/broken photos retain an honest “Photo unavailable” fallback. Flights use an inline neutral plane SVG, not invented branding. Verbose flight/room details use native disclosures, with essential price/estimate/tax/meal/baggage/cancellation facts visible. Existing manual price display now preserves the estimate label.

## Executed Checks

- `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k journey -q` — **8 passed in 12.40s**. Actual HTTP/graph/tool-handler/SSE/plansApi/React boundaries are exercised; only external provider/SDK network edges are fixtures. Both manual pages receive matching option IDs and fields, import makes zero extra request, and Back/Forward preserve editor/composer. Reload shows recovery rather than offers.
- `npm --prefix frontend test -- src/features/plans/travel/CanvasTravelJourney.test.jsx` — **6 passed, 1 skipped** standalone. The fixture-only case runs in all eight Python-triggered journeys.
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q` — **162 passed in 14.46s**. Includes date/clarification/cancellation/privacy/checkpoint regressions, safe observed hotel metadata, ten unsafe/missing image cases, nested token exclusion and existing byte caps with added metadata.
- `npm --prefix frontend test -- src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/SandboxCheckout.test.jsx src/features/plans/travel/FlightSandboxCheckout.test.jsx` — **30 passed, 1 fixture-only skipped in 5.57s**. Covers both modes' mounted replacement and late response rejection, same-ID edits, independent manual continuation, BUD→VIE label replacement, explicit hotel detail calls, token-free flight refresh, comparison, foreign/wrong-mode/expired/superseded imports, Plan change, safe/broken image fallback and legacy sandbox confirmations.
- `npm --prefix frontend run build` — passed after final source change; existing large-chunk warning only. `git diff --check` passed.
- Initial tracer failures were obsolete test selectors matching the new airline filter as well as card headings; selectors now assert actual headings. A mounted Plan-change regression exposed duplicate recovery notices, corrected by clearing rejected import ownership. All final targeted checks pass.
- Incremental review found same-search reopening retained a later manual result. After `b2d3f7e`, all **8 actual HTTP/SSE/PlanningCanvas journeys passed in 13.77s**, now exercising A→manual B→Back→View all A, exact restored option identity, preserved editor/composer, one deliberate manual request and no navigation request. Focused TravelSearch/CanvasTravelJourney frontend: **21 passed, 1 fixture-only skip in 2.60s**; final production build passed. Unchanged backend/privacy and sandbox suites were not redundantly rerun.

## Deviations and Remaining Gates

No dependencies, infrastructure, booking graph, provider endpoint or CRUD schema changed. Existing locked dependencies were present. Execution continued in the root-authorized shared worktree; unrelated tracked/untracked changes were preserved. No source outside the eight planned files was changed.

No live paid model/provider call or browser operation was performed by the executor. Root previously observed live stay/flight search success, but that does not verify this corrected UI commit. The mandatory Chrome gate must rebuild the changed source, verify container hashes, use the isolated example-account Plan, exercise desktop/mobile photos and actual manual pages, inspect console/network and saved screenshots, and distinguish live inventory from fixtures. Incremental source/security/UI review remains pending. Earlier Plan03 broad-suite baseline failures remain documented and were not changed or redundantly rerun.

## Root Handoff

Rebuild `b2d3f7e` or later and verify `canvas_travel.py`, `CanvasTravel.jsx`, `PlanningCanvas.jsx`, `TravelSearch.jsx` and `travel-results.css` hashes. Root owns the isolated Plan and Chrome session. Check View all opens **Accommodation search / Flight search**, fields and option identity match, no opening search/lookup/detail request occurs, photos/neutral flight visuals appear, normal compare/details/explicit refresh work, and Back retains unsaved editor/composer. Reopening chat search A after manual B must restore A. Inspect mobile wrapping and expired/reloaded recovery. Existing manual checkout remains deliberate and test-only.

## Self-Check: PASSED for implementation; browser/review PENDING

Both task commits and all eight source/test files exist. Summary is committed before progress changes. Phase completion and shared requirement sign-off remain with root after the corrected browser gate and incremental review.
