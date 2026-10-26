---
phase: 18
status: partially_executed
nyquist_compliant: false
wave_0_complete: false
---

# Phase 18 validation strategy

Execution results are recorded in 18-VERIFICATION.md and the linked artifact report. The matrix below remains the full acceptance target; unexecuted live/browser combinations are explicitly pending.

## Before implementation

Resolve the Chrome DevTools profile conflict without closing unrelated user sessions. Inspect current Flights/Stays and the static planning outline; save and inspect desktop/mobile screenshots under `artifacts/testing/<execution-date>-focused-travel/plan/`. Record adjustments to UI-SPEC. This is required even though the user declined interactive alternatives. This gate was resolved with an isolated Chrome DevTools session; desktop/mobile planning screenshots were inspected.

## Automated and API coverage

| Plan | Tests to create | Existing regression seams |
| --- | --- | --- |
| 18-01 | CRUD topic isolation/migration/lifecycle, Agent topic dispatch/context, frontend topic chat/navigation | CRUD API/research context and Agent turn/Canvas chat suites |
| 18-02 | Catalog normalization/filter validation, apartment facts/room comparison, grounded ordering | MCP LiteAPI/inspection tools and TravelSearch/CanvasTravelJourney |
| 18-03 | Flights-only tool access, route/party/verify, per-topic stale evidence | Agent flight research/generation and flight booking sync |
| 18-04 | Notes provenance/correction, safe choice challenge/commit, conflicts and readback | Canvas persistence, purge/recovery, auth proxy and migrations |
| 18-05 | Combined topic switching/reload/changed-context races and evaluation fixtures | Relevant backend/frontend regressions plus production build |

Every new command must collect tests; zero collection or nonzero exit fails. Every plan adds its tests before expanding dependent behavior. Deterministic scripted model/provider fixtures run through real registration, MCP dispatch and normalized responses. Do not mock the CRUD store for persistence acceptance.

CRUD checks must exercise authenticated HTTP against real isolated databases: create/read topic messages and notes, update/replace/remove choices, readback after new connection, stale revisions, duplicate request identity, cross-topic event mismatch, invalid topic, unauthenticated/cross-traveler access, deleted Plan denial, seven-day restore and purge. Migrations must run on an isolated PostgreSQL test database; `TEST_DATABASE_URL` may not point to `travella`, `postgres`, or the normal local app DB. Follow `services/crud/tests/test_migrations.py`, which upgrades with Alembic and asserts the schema head. Skips due to a missing test database leave migration acceptance pending.

Update existing migration-head assertions and cleanup tables for new schema. Confirm pre-migration Trip data survives and all legacy context/generation queries exclude specialist messages. Verify new records are cascaded/purged through both ORM and actual DB behavior.

## Browser and live acceptance

Use Chrome DevTools and `travella.local@example.com`; read credentials privately from `~/.config/travella/test-account.json`. Create test-owned Plans. Exercise Stays conversation → compare → shortlist → choose → reload; Flights conversation → refine → verify → choose; topic switches with independent histories; Trip changes refreshing both briefs; bounded independent refinement and budget exhaustion; explicit preferred-option readiness/removal/Needs review; stop/retry/network loss; another tab and another Plan; mobile/desktop/light/dark/zoom. Confirm persistence through API readback. Inspect console/network and screenshots, then clean up only test-owned data.

Run the AI-SPEC cases using deterministic fixtures first, then a bounded explicitly recorded live SDK/provider sample during execution. Live account availability may block some cases; label those unverified rather than passing from fixture evidence. No booking or payment calls are needed.

## Known baseline and delivery rule

At `caf905b`, 387 regression cases passed and eight old React fixtures failed on absent “Edit details” controls; the same eight fail on unchanged main `4e0780a`. See `artifacts/testing/2026-10-25-liteapi-research-tools/verification.md`. Any fixture adapted while implementing this phase needs assertions for the actual supported UI and must not simply be skipped.

Completion requires all applicable integration, PostgreSQL, browser and agent-quality checks with actual evidence. Plan lint and static source review do not establish runtime behavior. Record blockers and preserve earlier phase acceptance gaps independently.
