# Phase 02.1 PostgreSQL CRUD verification

Date: 2026-09-29
Scope: local PostgreSQL data foundation and typed CRUD schema

## Environment and isolation

- The PostgreSQL integration fixtures require `TEST_DATABASE_URL` using the `postgresql+psycopg://` scheme.
- The fixture rejects a URL equal to `CRUD_DATABASE_URL` and rejects the default `postgres` and `travella` database names. It runs Alembic `upgrade head`, verifies the current head, and drops only the migrated test tables during teardown.
- No `TEST_DATABASE_URL` was present in this run, so the PostgreSQL HTTP and constraint tests were skipped. No local development or production database was contacted.

## Executed checks

| Check | Expected | Actual |
| --- | --- | --- |
| `uv run pytest services/auth/tests services/crud/tests -q` | Complete suite passes | 108 passed, 4 skipped; PostgreSQL tests skipped because `TEST_DATABASE_URL` was unset |
| `uv run pytest services/crud/tests/test_migrations.py services/crud/tests/test_api_postgres.py services/crud/tests/test_postgres_constraints.py -q` | Migration and PostgreSQL contract checks execute or skip safely | 2 passed, 4 skipped; migration-head and SQLite-safe checks passed |
| `uv run ruff check services/crud/tests/conftest.py services/crud/tests/test_api_postgres.py services/crud/tests/test_postgres_constraints.py services/crud/migrations/versions/0006_json_object_constraints.py` | New verification code is lint-clean | Passed |
| `uv run python -c 'from services.crud.migration import migration_heads; print(migration_heads())'` | One migration head | `{'0006'}` |
| `docker compose config` | Compose configuration renders | Blocked: installed Docker CLI has no Compose plugin (`docker: unknown command: docker compose`) |
| `docker compose run --rm crud-migrate` | One-shot migration | Blocked by unavailable Compose plugin before service start |

## HTTP CRUD coverage prepared

`services/crud/tests/test_api_postgres.py` exercises the real FastAPI handlers and session factory for:

- Plan create, detail read, brief update/read-back, destination add/list/remove, delete, deleted view, and restore.
- Direct row read-back proving JSONB returns a dict, destination coordinates are `Decimal`, identifiers are UUIDs, and timestamps are timezone-aware.
- Invalid coordinates, stale revision, foreign owner, unknown record, and missing authorization. Rejected requests assert that no unauthorized destination or plan mutation appears.

These checks are intentionally skipped when the dedicated test database is unavailable; they are not represented as passed.

## Schema constraint coverage prepared

`services/crud/tests/test_postgres_constraints.py` covers migrated PostgreSQL checks for coordinate bounds, bounded provider references, JSON object payloads, one-to-one conversation ownership, and valid structured payload persistence. Migration `0006` adds database-level JSON object checks for planning briefs and action receipt results.

## Limitations

Live PostgreSQL persistence, migration upgrade/downgrade, `/ready` against PostgreSQL, and Compose startup remain unverified in this environment. Run with a disposable database such as `TEST_DATABASE_URL=postgresql+psycopg://.../travella_test` and a working Compose plugin before treating the PostgreSQL gate as complete. Production RDS/Aurora provisioning, production rollback/data migration, AgentCore Memory, MCP evidence storage, and frontend behavior are outside this phase.
