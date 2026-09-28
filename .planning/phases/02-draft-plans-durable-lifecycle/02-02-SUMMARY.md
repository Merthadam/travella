---
phase: "02"
plan: "02"
status: complete
---

# Plan 02-02: Authorized CRUD API and session integration

Implemented in `b6bd53a` after merging the prior work into zircon-poet while preserving
the owner's new Travella planning/testing rules.

- Request-scoped database sessions; local SQLite transactions serialize concurrent requests.
- Independently verified JWT access/scope boundary, safe explicit projections and errors.
- Create/list/read/activity/rename/delete/restore HTTP routes with revisions, request IDs,
  bound confirmation preparation/consumption, pagination, expiry filtering and fallback view.
- Opaque-cookie gateway forwards only server-held access tokens and allow-listed lifecycle
  requests; all mutation methods enforce origin checks. No browser subject is authoritative.
- Separate Compose CRUD service, local database volume, readiness and startup configuration.
- 39 HTTP integration tests (actual handlers + temporary databases + signed offline JWTs);
  97 Python tests total, 9 React regression tests, build/lint/format/Compose checks pass.

Evidence: `artifacts/testing/2026-09-28-phase-2/verification.md`.

## Execution adjustments

The original partial API had no challenge issuance route, shared a Session across requests,
exposed traveler_subject, and could not issue restore challenges. These were corrected before
connecting the gateway. SQLite's naive timestamps also needed UTC normalization.

The browser helper/PATCH/DELETE support and Vite proxy move to Plan 02-03 with their actual
UI consumer and its mandatory browser/screenshot checks. No frontend source changed here.
This is a sequencing adjustment, not removal of the phase requirement.

Live Cognito, PostgreSQL multi-process behavior and deployment are not verified. The local
startup remains development-only. Plan 02-04 still owns maintenance purge/release verification.
