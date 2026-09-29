# Phase 02.1-03 verification

Date: 2026-09-29

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| `uv run pytest services/auth/tests -q` | PASS | 68 passed; encrypted session, refresh, sign-out, invalidation, enrollment, recovery, and HTTP auth behavior exercised. |
| `uv run pytest services/crud/tests/test_migrations.py services/crud/tests/test_postgres_types.py -q` | PASS | 5 passed, 1 skipped; migration head is `0005`; live PostgreSQL fixture skipped because `TEST_DATABASE_URL` is not configured. |
| `uv run ruff check services/auth/session_store.py services/auth/app.py services/auth/tests/test_api.py services/crud/migrations/versions/0005_auth_sessions.py services/crud/tests/test_migrations.py` | PASS | No lint findings. |
| Compose wiring assertion | PASS | `SESSION_DATABASE_URL` is present; `SESSION_DB_PATH` and `auth-data` are absent. |

## PostgreSQL limitation

The environment does not provide a usable Docker Compose plugin (`docker compose` reports an unsupported command), and no isolated `TEST_DATABASE_URL` is configured. Live PostgreSQL upgrade, restarted-store HTTP persistence, and concurrent cross-process recovery consumption therefore remain unverified here. The service startup path is migration-gated and the migration chain contains explicit auth-owned tables through head `0005`.

No credentials, tokens, or raw provider payloads are included in this evidence.
