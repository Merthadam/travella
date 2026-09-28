# Travella

Travella is a planned agentic travel companion that helps people research, compare, shape, and eventually book trips through a conversational experience and an editable planning canvas.

## Status

Phase 2 implementation is in progress. Account access, the authorized durable
Plan lifecycle API, the opaque-cookie gateway, and the My plans lifecycle UI are
implemented with local verification. Live Cognito/AWS deployment remains gated;
the local services intentionally refuse production mode.

## Planning and verification

The project plan lives in `docs/planning/` and `.planning/`. Run `bash scripts/check.sh`
for the locked Python/React checks, frontend build, and Compose configuration check.
The local Plan API and gateway verification record is in
`artifacts/testing/2026-09-28-phase-2/verification.md`. The check does not contact
AWS and does not prove live Cognito or production deployment readiness.

## Repository layout

- `docs/planning/` — product and delivery planning
- `src/` — application code (to be added after the MVP is defined)
- `tests/` — automated tests (to be added with the application)
