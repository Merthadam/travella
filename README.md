# Travella

Travella is a planned agentic travel companion that helps people research, compare, shape, and eventually book trips through a conversational experience and an editable planning canvas.

## Status

Phase 2 implementation is in progress. Account access, the authorized durable
Plan lifecycle API, the opaque-cookie gateway, and the My plans lifecycle UI are
implemented with local verification. Live Cognito/AWS deployment remains gated;
the local services intentionally refuse production mode.

## Verification

Run `bash scripts/check.sh` for the locked Python/React checks, frontend build,
and Compose configuration check. The check does not contact AWS and does not
prove live Cognito or production deployment readiness.

Generated planning documents, Superpowers docs, agent logs, and verification
artifacts are local-only and ignored by Git.

## Repository layout

- `frontend/` — browser application and frontend tests
- `services/` — backend services and tests
- `scripts/` — local development and verification commands
