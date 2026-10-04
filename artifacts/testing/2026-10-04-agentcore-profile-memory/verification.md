# AgentCore traveler profile integration verification

## Scope

This change connects authenticated profile saves to AgentCore Memory and supplies a validated profile snapshot to Plan turns outside the onboarding intake graph. CRUD remains canonical. No frontend files were changed, and no live AWS Memory records were created or modified.

## Checks

- `uv run pytest services/agent/tests services/auth/tests services/crud/tests -q` — passed: 166 passed, 4 skipped. Includes FastAPI/TestClient coverage for CRUD profile persistence against isolated test databases; auth-to-Agent forwarding; verified identity requirements; AgentCore create/update/retrieval behavior through a stub client; and stale AgentCore snapshot rejection against the current CRUD profile.
- `uv run ruff check services/agent services/auth` — passed.
- `docker-compose config` — passed; Compose configuration resolves.
- `git diff --check` — passed.
- One auth refresh-expiry test failed once in the combined run, then passed on its isolated rerun and the next full run; the failure was unrelated to these changes.
- AgentCore integration is intentionally not exercised against AWS. Tests use a local stub; no profile data was sent to the configured AWS account. The existing active Memory resource is configured in the ignored local `.env`, but no traveler profile records were created or changed.

## Limits

The local Compose runtime now has `AGENTCORE_MEMORY_ID` and `AWS_REGION` configured through the ignored `.env`. Other deployments must set those values and grant the Agent service role the three scoped operations documented in `docs/runbooks/agentcore-memory.md`. Browser verification was not applicable because this change does not alter frontend code or UI behavior.
