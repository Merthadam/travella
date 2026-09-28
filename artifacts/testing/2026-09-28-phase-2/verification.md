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

## Plan 02-03: My plans UI

Implementation preview rendered with Chrome DevTools from the UI contract:
`plan/my-plans-preview.html`. The preview shows the two-column active Plan cards,
stable New plan action, and Recently deleted entry.

Automated UI evidence:
- `npm test --prefix frontend`: 13 passed (9 account regression tests and 4
  PlansApp lifecycle tests).
- `npm run build --prefix frontend`: passed.

Chrome DevTools evidence on `http://localhost:5173`:
- Signed-out account shell rendered at 1440px and showed `Welcome back` with
  email/password fields.
- Sign-in interaction disabled the form while pending and produced the expected
  401 request; network inspection showed `/auth/session` 401 and `/auth/sign-in`
  401, with no private Plan DOM rendered.
- Console inspection found only the expected Vite/React development messages,
  favicon 404, and the expected unauthorized 401s.

The authenticated browser path is blocked locally because the running service has
no live Cognito configuration. The example account is available at the required
local credential path, but this environment cannot establish a managed-identity
session. This is recorded as incomplete browser verification rather than claimed
as passed. The preview screenshot was inspected visually; saving a DevTools
screenshot directly into this worktree was blocked by the browser tool's separate
workspace-root policy.

Plan 02-02 changes no frontend source. The API helper and Vite proxy wiring are
now consumed by Plan 02-03.
PostgreSQL runtime/concurrency, live Cognito and production deployment remain
unverified; the development entry points refuse production mode.

## Plan 02-04: retention and security checks

- `uv run pytest -q services/crud/tests/test_purge.py services/crud/tests/test_security.py`:
  5 passed.
- Purge uses supplied database time, treats the exact recovery deadline as
  expired, deletes linked rows transactionally, is safe to rerun, and returns only
  an aggregate `purged_count` metric.
- Projection tests assert owner identity, credentials, raw payload, and internal
  reasoning are absent from public Plan output and purge telemetry.

## Docker runtime smoke check

Started the isolated stack with `docker-compose -p travella-phase2 -f compose.yaml
-f /tmp/phase2-compose.override.yaml up -d` because the default ports were already
occupied by another local stack. The Docker frontend is available at
`http://localhost:5174/`, auth at `http://localhost:8002/`, and CRUD is internal
to the Compose network.

- CRUD container reached `healthy`; auth reached `healthy`; frontend served HTTP 200.
- Auth health returned `{"status":"ok","auth_configured":false}`.
- `/v1/plans` returned HTTP 503 with `Account access is not configured yet`, which
  is the expected safe response until Cognito settings are provided.
- The private authenticated My plans journey therefore remains blocked by missing
  Cognito configuration, matching `02-UAT.md`.

Follow-up against the configured AWS Cognito pool (`travela-local` in
`eu-north-1`) showed that the pool and app client are reachable, so the Docker
auth health endpoint changed to `auth_configured:true`. The pool currently has
no users, including no `travella.local@example.com`, and the app client exposes
`ALLOW_USER_AUTH`/SRP rather than the `USER_PASSWORD_AUTH` flow used by the
implemented adapter. The sign-in request therefore returned the expected generic
HTTP 401 response; authenticated browser UAT remains blocked until a compatible
test user and client auth flow are provisioned.

Resolution completed during Docker verification:

- Created a dedicated public client `travella-local-phase2` with
  `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`.
- Created and confirmed `travella.local@example.com` with the local test-account
  password and verified email attribute.
- Restarted Docker with the new client ID and `FRONTEND_ORIGIN=http://localhost:5174`.
- Authenticated HTTP smoke test returned 200 and established the opaque session cookie.
- Full Docker CRUD sequence passed: create/read, rename, delete, deleted-list,
  restore, and cleanup delete; all returned 200 and persisted the expected state.

The remaining gate is visual browser interaction and screenshot capture for the
authenticated My plans workspace.
