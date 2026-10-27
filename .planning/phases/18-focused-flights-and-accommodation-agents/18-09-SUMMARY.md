---
phase: 18-focused-flights-and-accommodation-agents
plan: "09"
subsystem: travel-ui
tags: [carrier-identity, liteapi, react, safe-images, freshness]
status: complete
requires:
  - phase: 18-06
    provides: Shared manual workspace and authorized registry snapshots
provides:
  - Observed marketing and operating codes/logos through Connector, public, safe registry and browser projections
  - Fixed-size accessible airline marks with neutral missing/unsafe/load-error fallback
  - Whole-party flight and whole-stay room/night totals with source and freshness labels
  - Actual catalog labels for applied stay filters
affects: [18-10, 18-12]
tech-stack:
  added: []
  patterns: [observed-origin image allowlist, original-observation expiry, named carrier fallback]
key-files:
  created:
    - frontend/src/features/plans/travel/CarrierMark.jsx
    - frontend/src/features/plans/travel/CarrierMark.test.jsx
  modified:
    - services/mcps/liteapi.py
    - services/agent/travel_contracts.py
    - services/agent/claude/canvas_travel.py
    - services/agent/travel_registry.py
    - frontend/src/features/plans/travel/CanvasTravel.jsx
    - frontend/src/features/plans/travel/TravelSearch.jsx
    - frontend/src/features/plans/travel/StaySearchFilters.jsx
key-decisions:
  - "Allow only observed assets.nuitee.flights HTTPS logos; never infer codes or manufacture logo URLs."
  - "Registry insertion retains supplier search age; separately refreshed room availability gets its own label."
  - "Applied stay labels reuse loaded catalog names; missing property type, room amenities, distance and source links remain unavailable."
requirements-completed: [FOCUS-04, FOCUS-08, FOCUS-14]
plan_head_before: f9aec08e635c0b32592d43a7743d959604dc6c59
actuals:
  tokens: 11913
  tasks: 2
  commits: 5
duration: 12min
completed: 2026-10-27
coverage:
  - id: carrier-projection
    description: "Observed discrete marketing/operating metadata survives safe projections; unsafe logos are omitted."
    verification:
      - kind: integration
        ref: services/agent/tests/test_travel_registry.py::test_carrier_metadata_survives_public_safe_registry_roundtrip
        status: pass
    human_judgment: false
  - id: carrier-cards
    description: "Named neutral image fallback, mixed carriers, precise total scope and real catalog filter labels."
    verification:
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/CarrierMark.test.jsx
        status: pass
      - kind: automated_ui
        ref: frontend/src/features/plans/travel/TravelSearch.test.jsx
        status: pass
      - kind: manual_procedural
        ref: artifacts/testing/2026-10-27-shared-travel-workspace/18-09-verification.md
        status: unknown
    human_judgment: true
    rationale: "Parent owns rebuilt Chrome checks of actual supplier images, mobile layout and console/network evidence in18-12."
---

# Phase18 Plan09: Observed airline identity and factual travel cards

**Observed carrier logos survive every strict boundary and render with named fallbacks; travel cards retain exact price scope and original search age.**

Implementation and automated checks are complete. The mandatory authenticated Chrome delivery gate remains pending parent execution; this summary does not claim fully verified browser acceptance.

## Accomplishments

- Added nullable marketing_code, marketing_logo, operating_code and operating_logo through normalization, public contracts, safe FlightSegment and strict browser parsing. Airline and operator names remain distinct; mixed outward/return carriers are visible without inferring identity from flight numbers.
- Dedicated image policy accepts only HTTPS assets.nuitee.flights, observed in the parent's bounded BUD–LIS sample. Credentials, alternate origins, unexpected ports, control characters and query/fragment handles are rejected. No logo vendor, airline lookup call, inline SVG download or exact-offer URL construction.
- CarrierMark uses a32px image/fallback box, accessible names, no-referrer and per-image error handling. Trip/Research previews share the same component.
- Cards show explicit currency, return whole-party or stay room/night/party totals, local airport times and per-leg stops/duration. Baggage/cancellation unknowns, source, sandbox, observation and expiry are visible. Property amenities remain separate from unknown room amenities and distance.
- Applied property and amenity chips use actual cached provider catalog labels. Apartments replaces the observed raw Property type201 label.
- Registry registration preserves provider searched_at and anchors expiry to that time. A room availability refresh labels its own observation while retaining the original main-search timestamp.

## Task commits

Parent orchestrator owns commits in the shared locrian-peacock checkout; no agent branch/worktree changes were made.

1. Task18-09-01 RED — `9829d08` test: cover observed carrier metadata and safe logo projection.
2. Task18-09-01 GREEN — `bac17d0` feat: preserve observed carrier logos and search freshness.
3. Task18-09-02 RED — `a23d41f` test: specify carrier fallback and factual travel cards.
4. Task18-09-02 GREEN — `e5415ca` feat: render observed carrier marks and truthful travel card evidence.

Measured `git rev-list --count f9aec08..e5415ca` is5, including the intervening parent-owned18-07 metadata commit416221d. Actual tokens use ceil(47,649 diff characters/4) across the15 owned source/test files. The per-plan base ledger was persisted from the observed spawn baseline after source commits because the parent controlled staging/commits. Final metadata commit is parent-owned and outside this measurement.

## Verification

- Exact backend plan suite:53 passed (`test_liteapi.py`, `test_travel_research.py`, `test_travel_registry.py`).
- Exact frontend plan suite:36 passed,1 existing standalone fixture skip (`CarrierMark`, `TravelSearch`, `CanvasTravelJourney`).
- Expanded backend suite:251 passed,7 failures in old Canvas manual-search fixtures. Updated those fixtures to model current authenticated search→registry resolution and consistent strict result identities/counts. All8 affected actual Python SSE→React journeys then passed, including every previously failing case; no test was disabled.
- Actual Research HTTP→graph→SSE→React suite:18 passed. It supplies the optional frontend fixture and tests readable carrier identity plus neutral fallback.
- `git diff --check` passed. Existing LangGraph/Python deprecation warnings remain.
- No new dependency, database schema or CRUD persistence operation. Parent rebuild/Chrome inspection and actual logo network success remain pending. WINDOWS entry7 records that gate.

Detailed commands and outcomes: [18-09 verification](../../../artifacts/testing/2026-10-27-shared-travel-workspace/18-09-verification.md). Parent actual-provider evidence: [agent evaluation](../../../artifacts/testing/2026-10-27-shared-travel-workspace/agent-evaluation.md).

## TDD Gate Compliance

Backend RED had10 intentional missing-field assertion failures and26 passes before implementation/RED commit. Frontend RED had6 intended assertion failures and24 passes after correcting an initial loader error. Both persisted evidence records return RED_EVIDENCE_OK; explicit notes identify their TAP-adapted summaries because the runtime checker only parses TAP. The backend checker record was persisted after GREEN, a gate-timing deviation; its executed RED and RED commit still preceded implementation. Frontend checker validation occurred before GREEN. No separate refactor commit was necessary.

## Deviations from Plan

1. **[Rule2 — correctness] Preserve original registry freshness.** Added travel_registry.py to ownership after finding insertion reset searched_at to now. Original observation and expiry are now tested. Parent explicitly approved this bounded extension.
2. **[Rule1 — observed UI bug] Catalog-backed applied labels.** Extended StaySearchFilters.jsx to share loaded names and load them for applied IDs; no guessed dictionary. Parent requested this from real06 browser evidence.
3. **[Rule1 — integration fixtures] Keep existing journeys aligned with shared workspace.** Updated test_canvas_travel.py timestamps and CanvasTravelJourney.test.jsx strict mode/count/preview fixtures plus authenticated registry GET handling. ResearchFlights and CanvasTravelJourney now assert actual carrier names and neutral fallback rather than a decorative illustration. Parent authorized this compatibility correction.

## Known Stubs and Threat Review

No functional stub was introduced. Missing property type, room amenities, distance and supplier links are explicit evidence unknowns, not fabricated data. Existing input placeholder attributes are ordinary form hints. Image origin/privacy/spoofing mitigations cover the plan's threat register; no additional endpoint, auth path, booking policy or durable-data boundary was introduced.

## Remaining delivery work

Parent18-12 must rebuild, compare runtime source, exercise example-account flight/stay journeys in Chrome, verify actual image loads and error fallback, inspect desktop/mobile screenshots and console/network failures, then close WINDOWS entry7. STATE/ROADMAP/requirement reconciliation and final metadata commit are owned by the parent to avoid concurrent shared-checkout writes. Existing unrelated caches and evidence remain untouched.

## Self-Check: PASSED

Both created CarrierMark files exist. All four task commit hashes exist in the current history; no source changes remain uncommitted after e5415ca. Summary and dedicated evidence files were written to disk.
