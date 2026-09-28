# Phase 02 Research: Draft Plans & Durable Lifecycle

**Date:** 2026-09-27
**Status:** Ready for planning

## Recommendation

Build a separate Python/FastAPI CRUD service with PostgreSQL as the production durable store, SQLAlchemy 2.x synchronous sessions over Psycopg 3, and Alembic migrations. Keep the browser's opaque HttpOnly session cookie and have the authenticated service boundary forward the server-held Cognito access token to CRUD; CRUD independently validates that token and derives the traveler subject. Do not use the auth service's local SQLite session store as Plan storage.

The first implementation should expose the documented lifecycle operations: list active, list deleted, create, open, record activity, rename, delete, and restore. Keep `GET /v1/plans/{plan_id}` read-only. Record a deliberate open with a separate `POST /v1/plans/{plan_id}/activity` operation; polling, prefetch, focus refresh, and passive GET do not move ordering.

## Source-grounded constraints

- `docs/user-stories/plan-lifecycle/README.md` is the behavior authority: one Conversation per Plan, multiple active Draft Plans, automatic title provenance, recent activity order, last view, soft delete for seven days, restore, then permanent identifiable-data purge.
- `docs/planning/mvp-phase-1-service-contracts.md` defines the provisional HTTP inventory and requires token-derived ownership, request IDs, expected revisions, single-use exact confirmation, and safe duplicate responses.
- `02-CONTEXT.md` adds four locked choices: explicit opens move a Plan to the top; automatic title is shown in the related confirmation; restore opens immediately; rename conflicts retain the user's entered value beside the current saved title.
- Existing code is Python 3.12/FastAPI/pytest/uv plus React 19/Vite/Vitest/plain CSS. `scripts/check.sh` is the local suite. Phase 1 plan files contain obsolete TypeScript commands and must not be copied.

## Proposed data model

Use one PostgreSQL schema owned by CRUD:

* `plans`: UUID `id`, UUID `traveler_subject`, lifecycle enum (`active`, `deleted`), integer `revision`, normalized `title`, title provenance (`automatic`, `manual`), optional destination summary, `last_working_view` (`conversation`, `workspace`), `last_activity_at`, `deleted_at`, `recovery_deadline`, created/updated timestamps.
* `conversations`: UUID identity, `plan_id` unique foreign key, created timestamp. Creation inserts Plan and Conversation in one transaction.
* `plan_actions`: traveler-scoped request receipt keyed by `(traveler_subject, request_id)`, operation, exact payload digest, Plan ID nullable for create, result reference/status, created/expiry timestamps. Store only the minimum safe projection required to replay; cascade Plan-linked receipts at purge.
* `plan_challenges`: hash of opaque single-use challenge, traveler, Plan, expected revision, exact change digest, operation, expiry, consumed timestamp. Never store the bearer token or raw private projection.

If a separate activity table is needed for audit/order diagnostics, retain only Plan ID, traveler subject, event kind, event time, and request ID within the recovery scope. The current list can order by a denormalized `last_activity_at`; update it atomically with activity receipt. Tie-break equal timestamps by UUID or monotonic database sequence, consistently.

## Mutation and replay protocol

Every mutating request carries a time-bearing request ID of the form `<issued_at_ms>.<UUID>`. CRUD rejects a request older than five minutes or more than 60 seconds in the future, and a client cannot silently renew a request by changing its timestamp. A duplicate request within the receipt retention window returns its original safe result only after checking the current authorized lifecycle; it never replays a private result for a foreign, expired, or purged Plan. Retain receipts for 30 days, but cascade Plan-linked receipts at recovery expiry. After receipt expiry, an old request ID is too old to execute again, including create; no permanent identifiable tombstone is required.

For each mutation, lock the Plan row (`SELECT ... FOR UPDATE`), verify traveler and lifecycle, expected revision, payload digest, and challenge binding, apply exactly one revision, insert/update the receipt, and commit. Challenge consumption and the mutation result receipt are in the same transaction. Unknown network outcome means retry the same request ID and exact payload; never auto-prepare a new challenge. Revision conflict returns a safe current projection and requires fresh explicit review. For rename specifically, the UI keeps the submitted draft and presents the current title; the server never auto-resubmits it.

Create is idempotent by request receipt and inserts Plan + Conversation atomically. Delete is a soft transition and invalidates agent access. Restore is only allowed before the server's recovery deadline and restores the latest consistent Plan snapshot; successful response includes the last valid resume target so the browser opens immediately. Purge runs as an idempotent job that locks an eligible deleted Plan, deletes its Plan-scoped rows and identifiable conversation/checkpoint data in one transaction, and records only non-identifying operational counters.

## Authorization and service boundary

CRUD has its own Cognito JWT verifier (issuer, signature/JWKS, audience/client, token use, expiry, and required scope). All queries include the verified subject; browser-supplied traveler IDs are rejected/ignored. The browser-facing auth/session service may forward the server-held access token through a tightly allow-listed internal call, but must not become a generic proxy or durable-data owner. CRUD-to-agent service calls use an authenticated service identity plus the verified traveler/Plan scope and cannot bypass CRUD authorization. Error responses for missing, foreign, deleted, and expired resources use safe stable codes without revealing another traveler's existence.

## API projections

Implement the documented provisional endpoints: `GET /v1/plans?view=active`, `GET /v1/plans?view=deleted`, `POST /v1/plans`, `GET /v1/plans/{plan_id}`, `POST /v1/plans/{plan_id}/activity`, `PATCH /v1/plans/{plan_id}/title`, `DELETE /v1/plans/{plan_id}`, and `POST /v1/plans/{plan_id}/restore`. Require `Idempotency-Key`/`requestId` on writes and `If-Match`/expected revision for existing state. Responses are allow-listed `PlanRef`, ConversationRef, resume target, deadline, and safe Problem objects; never return tokens, cookies, emails, raw checkpoints, provider data, or internal reasoning.

## UI and integration implications

The UI contract's `Untitled plan` is the initial automatic title. Normalize title input to NFC, trim outer whitespace, reject controls/blank values and more than 120 Unicode code points without truncation. Use the actual server `recoveryDeadline`; confirmation copy promises seven days but does not fabricate an exact timestamp before delete commits. Restore navigation must distinguish committed restore from a failed follow-up open. Involuntary reauthentication clears private plans, drafts, challenges, and in-flight response ownership, retaining only a safe internal destination.

## Validation architecture

Use `pytest` with FastAPI `TestClient`/`httpx` and a transaction-isolated test database fixture. Add unit tests for normalization, request-ID freshness/digest, challenge single use, ownership, revision conflicts, and purge eligibility; API tests for every endpoint and safe foreign/deleted responses; concurrency tests proving one create/delete/restore wins and duplicates return one result; and frontend Vitest tests for ordered cards, empty/loading/error states, retained rename conflict, delete/restore navigation, stale-response generation guards, and reauth clearing. Run `bash scripts/check.sh` after integration; targeted commands must be runnable with the repository's existing `uv run pytest -q` and `npm test --prefix frontend` conventions.

## Risks and open items for planning

- PostgreSQL/Alembic wiring is greenfield and should be isolated from the auth SQLite store.
- AWS/Cognito live verification is still blocked by the existing Phase 1 verification gap; local JWT/session fakes must not be described as production proof.
- Exact challenge cryptography and deployment topology remain implementation details; use a cryptographically random opaque token, store only a hash, and bind its digest to the displayed normalized change.
- Purge scheduling may begin as an authenticated CRUD maintenance command plus a deterministic repository method; AWS scheduler choice remains deferred.

## References

- https://docs.sqlalchemy.org/en/20/orm/session_transaction.html
- https://www.psycopg.org/psycopg3/docs/basic/transactions.html
- https://alembic.sqlalchemy.org/en/latest/tutorial.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- `docs/user-stories/plan-lifecycle/README.md`
- `docs/planning/mvp-phase-1-service-contracts.md`
- `.planning/phases/02-draft-plans-durable-lifecycle/02-CONTEXT.md`

## Validation Architecture

The executable plan must create a `02-VALIDATION.md` strategy with `pytest` and Vitest commands, per-task mapping for all PLAN/TRUST requirements, concurrency and expiry negative tests, and a manual browser check for responsive My plans and restore/open focus behavior. No task may rely on the obsolete TypeScript commands recorded in Phase 1 plan files.
