# Phase 3B backend verification

## Deterministic checks

Command:

```text
uv run pytest -q services/agent/tests services/crud/tests services/mcps/tests
```

Result: **78 passed, 4 skipped**. The passing checks cover versioned prompt request construction, bounded context, CRUD conversation message idempotency, agent-context ownership, FastMCP authentication, Gateway envelope transformation, candidate actions, and existing CRUD regressions.

Command:

```text
uv run ruff check services/agent/checkpoint.py services/agent/tests/test_agent_checkpoint.py services/crud/api.py services/crud/models.py services/crud/migrations/versions/0007_conversation_context.py services/mcps/gateway_interceptor.py
```

Result: **passed**.

## Incomplete gates

- PostgreSQL integration tests are skipped when `TEST_DATABASE_URL` is not configured for an isolated database.
- Live AgentCore Gateway, Claude, Tavily, and Google provider smoke checks were not run in this local pass.
- Browser/UI and AgentCore long-term-memory activation remain outside this backend slice.

No credentials, tokens, raw provider payloads, or personal data are stored in this artifact.
