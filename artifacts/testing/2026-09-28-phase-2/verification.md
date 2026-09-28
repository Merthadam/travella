# Phase 2 verification — 2026-09-28

## Plan 02-02: backend API and cookie gateway

Executed against the actual FastAPI handlers and temporary SQLite databases.
Local RSA-signed JWTs exercise the real Cognito verifier; JWKS/provider I/O is
isolated in test fixtures. No live Cognito/AWS deployment is claimed.

| Operation / boundary | Executed evidence | Observed outcome |
|---|---|---|
| Create | `test_complete_lifecycle_and_persistence`; concurrent HTTP create test | HTTP 200, one owner-scoped Plan and linked Conversation; four concurrent duplicates yield one ID |
| Read / list | lifecycle, pagination, foreign identity tests | Detail survives separate requests; GET preserves activity/revision; keyset order, invalid cursors, missing/foreign 404 verified |
| Activity | lifecycle test | Explicit POST updates time and revision; GET does not |
| Rename | lifecycle, title limits, challenge binding tests | NFC exact title persists, manual provenance and Conversation preserved; invalid/control/121-character values rejected; 120 Unicode code points accepted |
| Delete | lifecycle and idempotent delete/restore tests | Active read becomes 404; active list excludes Plan; deleted list includes seven-day server deadline; duplicate write does not repeat mutation |
| Restore | lifecycle, gateway full lifecycle, recovery deadline tests | Active record returns with preserved title/Conversation; deleted list clears; expiry rejects without title leakage |
| Confirmation | binding/expiry/replay tests | Exact operation, Plan, revision, title and single-use token enforced; conflicts leave persisted values unchanged |
| Authentication / ownership | signed-invalid-claims, bad signature, foreign identity, gateway tests | Missing/expired/wrong-issuer/client/token-use/scope/signature denied; foreign reads and all writes denied |
| Gateway | `services/auth/tests/test_crud_client.py` | Cookie authenticates before forwarding; only server token forwarded; browser identity/cookies excluded; POST/PATCH/DELETE origin checks; error and response redaction verified |
| Expiry/purge read boundary | expired-and-purged test | Expired deleted records hidden; purged records 404; old write IDs cannot replay |

Executed checks:
- `bash scripts/check.sh`: passed — 95 Python tests, 9 React tests, lint/format,
  production frontend build, locked dependencies, Compose configuration.
- After adding two review-driven regressions:
  `uv run pytest -q services/crud/tests/test_api.py services/auth/tests/test_crud_client.py`:
  39 passed (23 CRUD HTTP + 16 gateway).
- `git diff --check`: passed.
- Docker Compose plugin is unavailable; installed `docker-compose config --quiet`
  passed and the check script supports that fallback.

Existing warning: Starlette deprecates the current httpx TestClient integration.
It does not fail these tests. Test records use pytest temporary directories.

Plan 02-02 changes no frontend source. UI screenshots/browser verification belong
to Plan 02-03. The helper and Vite proxy wiring move together with that consumer.
PostgreSQL runtime/concurrency, live Cognito and production deployment remain
unverified; the development entry points refuse production mode.
