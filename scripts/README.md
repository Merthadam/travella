# Local verification

## Start local services

With Docker and Colima installed, start the auth gateway, CRUD service, and frontend together:

```bash
bash scripts/start-local.sh
```

The script starts Colima when it is installed but not running, builds the images,
and opens the services at `http://localhost:5173` and `http://localhost:8000`.
Pass standard `docker compose up` options when needed, for example
`bash scripts/start-local.sh -d` for detached mode. Stop detached services with
`docker compose down`.

Run `bash scripts/check.sh` from the checkout. It installs only locked Python and
JavaScript dependencies, checks Python lint/formatting, runs the API/security and
React integration tests, builds the frontend, and validates Compose configuration. It exits nonzero on the first
failed check. It does not contact AWS or deploy anything.

During a task, use the narrower feedback command:

- Python: `uv run --locked pytest -q services/auth/tests/test_api.py`
- Plan HTTP lifecycle: `uv run --locked pytest -q services/crud/tests/test_api.py services/auth/tests/test_crud_client.py`
- React: `npm test --prefix frontend`

Start the frontend with `npm run dev --prefix frontend`; its Vite command forces
optimized dependency regeneration so running `npm ci` cannot leave an existing
dev server pointing at deleted React bundles. Restart the dev server after any
dependency install.

Run the full script before accepting a wave. Phase completion additionally needs
the outstanding live-Cognito and manual checks in `01-VALIDATION.md`. Passing this
script alone is not phase verification.

## Plan API (Phase 2, Plan 02-02)

The local gateway exposes `/v1/plans` and requires the existing opaque session cookie.
It forwards a server-held access token to the private Compose `crud:8001` service,
which independently checks the Cognito signature, issuer, app client, expiry, token
use, and `aws.cognito.signin.user.admin` scope. No AWS resources are provisioned.
Without Cognito configuration, services boot but protected endpoints remain denied.

For separate processes, set `CRUD_BASE_URL=http://127.0.0.1:8001` on the auth process,
and `CRUD_DATABASE_URL=sqlite:///.runtime/plans.sqlite3` on the CRUD process, then run
`uv run uvicorn services.crud.server:app --port 8001 --no-access-log`.
CRUD uses an independent local SQLite database with serialized transactions.
The development entry point initializes its schema; production startup is refused.
PostgreSQL deployment, managed migrations, and multi-process concurrency validation
remain release work; the local HTTP test suite does not claim that proof.

Every write requires `Idempotency-Key: <13-digit Unix milliseconds>.<UUID>`.
Existing-Plan writes also require `If-Match: <revision>`.
Rename, delete, and restore first prepare a short-lived confirmation using
`POST /v1/plans/{id}/challenges` with `operation` and (only for rename) `title`.
The response contains the normalized exact title, revision, and challenge.
Commit with `X-Plan-Challenge`; keep the same write ID, payload, revision and challenge
on an unknown-outcome retry. Challenge preparation does not change the Plan; retrying
preparation returns a new independently expiring challenge. Never auto-commit it.
Use GET to read without changing activity; record explicit opening via `/activity`.
List responses contain `plans` and an optional `next_cursor`; send it with the same
active/deleted view to fetch the next page. Expired deleted Plans are never listed.

My plans UI and its browser request adapter remain Plan 02-03. Live Cognito/browser
verification and the maintenance purge runner remain outstanding phase gates.
