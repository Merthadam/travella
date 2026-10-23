---
phase: 17-research-phase-cleanup
plan: CRUD
status: complete
subsystem: crud
tags: [research, readiness, authorization, persistence]
requires: [existing-research-context, existing-conversation-history]
provides: [persistent-research-offers, canonical-readiness, exact-review-receipts]
affects: [17-02, 17-03, 17-04]
tech-stack:
  added: []
  patterns: [Plan-lock ownership, additive Alembic migration, transactional offer and message commit]
key-files:
  created: [services/research_offers.py, services/crud/research_offers.py, services/crud/migrations/versions/0011_research_draft_offers.py, services/crud/tests/test_research_offers.py]
  modified: [services/trip_context.py, services/crud/models.py, services/crud/api.py, services/crud/research_context.py, services/crud/repository.py, services/crud/tests/test_migrations.py]
key-decisions:
  - First destination confirmation retains prior traveler priorities; actual replacement invalidates older evidence.
  - Initial generation needs a canonical review receipt unless saved canvas or accepted generation at current context revision exists.
  - Manual review preserves durable proactive-offer suppression.
plan_head_before: fce6d4126605f67c4ca5c8e95e2ef5ee361b0975
commits: 7
completed: 2026-10-23
---

# Phase 17 CRUD implementation summary

Plan-owned Research invitations now persist with current-context readiness, explicit review and one-use generation receipts, without generating or saving a canvas themselves.

This summary covers only the delegated CRUD/shared implementation. Parent owns phase-wide summaries, STATE/ROADMAP, browser evidence and delivery gates. The measured seven commits include concurrent shared-branch worker commits; the three backend commits are listed below.

## Changes

- Shared strict proposal, readiness, offer, action and receipt contracts; safe nullable metadata extends legacy context snapshots and completed message history.
- Read-only authenticated offer snapshot; revision/idempotency-protected request_review/defer/confirm; authenticated receipt consumption bound to Plan, reviewed revision, fingerprint and live run lease.
- Additive migration 0011 creates offer history and a Research priority-scope timestamp. Records follow parent soft deletion/recovery and cascade purge.
- Completed-turn transaction writes messages, context, offer and receipt together. Cancelled/late/duplicate completions cannot create orphan actions. Only committed metadata is projected.
- Useful-context gate requires explicit chosen destination, explicit timing, positive travelers and independently grounded current Plan priorities. Optional budget/accommodation/flights do not block an invitation; explicit flights are mandatory at confirmation.
- Deferral survives reload and unrelated edits. Explicit current traveler re-request may reset it. First destination confirmation preserves earlier stated preferences; actual replacement and current contradictions invalidate older evidence.
- Entry-required policy is canonical in GET, action responses and run-begin metadata, so request_review/defer never accidentally unlock draft navigation.

## Verification

Final command ran in the isolated local application container with TEST_DATABASE_URL pointing exclusively to the disposable phase17_crud_final PostgreSQL database:

`uv run --locked pytest services/crud/tests/test_research_offers.py services/crud/tests/test_migrations.py services/crud/tests/test_flight_confirmation.py services/crud/tests/test_api.py -q`

Observed: **46 passed, zero skipped**, 7.75 seconds. Existing LangGraph pending-deprecation warning only.

Coverage uses actual FastAPI handlers and SQL persistence, signed JWTs, and new test records:

| Operation | Observed checks |
| --- | --- |
| Read | Empty/legacy snapshot, missing records, side-effect-free reads, correct ownership and current readiness |
| Request review | Current immutable context/revision, stored invitation/readback, no canvas or Plan mutation |
| Defer | Stored suppression, fresh application/session readback, unrelated edits retain suppression, manual access remains usable |
| Confirm | Explicit flights, current review/fingerprint, stale and foreign offers rejected, repeated request returns original receipt |
| Consume | Live matching lease, same-request replay, different-request replay rejected, stale/expired/foreign/cancelled receipts rejected |
| Turn completion | Offer and message atomic association, authenticated history readback, foreign evidence rejected, cancelled/duplicate turns do not orphan or duplicate offers |
| Lifecycle | Deleted Plan inaccessible, restore retains offer, seven-day purge removes offer rows |
| Migration | Real PostgreSQL 0011 upgrade, downgrade to0010, upgrade again; existing Plan and Research context retained |

New/shared-file Ruff checks passed. `git diff --check` passed. Earlier local runs skipped PostgreSQL when TEST_DATABASE_URL was absent; the final configured run supersedes those skips. Mandatory Travella testing skill reread before handoff.

## Commits

- a321e91 — feat(17-02): persist research offers and exact review receipts
- 77cba11 — fix(17-04): retain canonical research gate in action snapshots
- 9f175bd — test(17-02): clean isolated migration schema completely

## Deviations and limitations

- Parallel execution split ownership by service across plans02–04, as recorded in17-EXECUTION.md. Parent retains aggregate completion/state ownership.
- Migration head assertion previously expected0008 despite baseline head0010; updated it to new head0011. Migration fixture cleanup now includes Research/Canvas tables and version metadata so isolated reruns are repeatable.
- Deterministic priority extraction uses a conservative English activity vocabulary and completed authorized user messages or explicit active brief interests. Unrecognized/non-English priorities may remain unready; no model-supplied boolean can bypass this. Live-model quality is not established by deterministic HTTP tests.
- No new runtime dependency, generation tool, automatic generation or automatic save. No production deployment performed.
- Browser checks, frontend screenshots and combined end-to-end delivery remain parent-owned; this backend summary does not claim those gates passed.

## Self-Check: PASSED

All four created implementation/test/migration files exist; backend commits a321e91,77cba11,9f175bd exist. No placeholder/stub implementation or tracked-file deletion was introduced.
