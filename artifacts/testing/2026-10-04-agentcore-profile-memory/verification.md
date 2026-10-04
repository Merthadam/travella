# AgentCore traveler profile integration verification

## Scope

This change connects authenticated profile saves to AgentCore Memory and supplies a validated profile snapshot to Plan turns outside the onboarding intake graph. CRUD remains canonical. No frontend files were changed. A synthetic profile record was used for the live AWS check and then deleted; no traveler data was written.

## Checks

- `uv run pytest services/agent/tests services/auth/tests services/crud/tests -q` — passed: 166 passed, 4 skipped. Includes FastAPI/TestClient coverage for CRUD profile persistence against isolated test databases; auth-to-Agent forwarding; verified identity requirements; AgentCore create/update/retrieval behavior through a stub client; and stale AgentCore snapshot rejection against the current CRUD profile.
- `uv run ruff check services/agent services/auth` — passed.
- `docker-compose config` — passed; Compose configuration resolves.
- `git diff --check` — passed.
- One auth refresh-expiry test failed once in the combined run, then passed on its isolated rerun and the next full run; the failure was unrelated to these changes.
- Live AWS check against the configured Memory resource — synthetic create, update, and readback passed. The first check exposed eventual consistency and a namespace normalization requirement for delete; the adapter now waits for readable state. Synthetic records were deleted with the normalized namespace and a subsequent namespace scan confirmed they were absent.

## Limits

The local Compose runtime has `AGENTCORE_MEMORY_ID` and `AWS_REGION` configured through the ignored `.env`. Other deployments must set those values and grant the Agent service role the three scoped operations documented in `docs/runbooks/agentcore-memory.md`. Browser verification was not applicable because this change does not alter frontend code or UI behavior.
