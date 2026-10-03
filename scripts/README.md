# Local verification

## Start local services

With Docker and Colima installed, start the frontend, auth gateway, CRUD API, and agent
inside one local app container. PostgreSQL runs in its own container with a named data
volume so app image rebuilds do not remove database data:

```bash
bash scripts/start-local.sh
```

The script starts Colima when it is installed but not running, builds the app image,
runs database migrations, and opens the frontend at `http://localhost:5174` and the
auth gateway at `http://localhost:8003`. The agent health endpoint is available at
`http://localhost:8103`; CRUD stays private inside the app container. These defaults
avoid the existing local service tunnels on ports 5173, 8000, and 8002.
The frontend reads `VITE_GOOGLE_MAPS_API_KEY` from `frontend/.env.local`, mounted
read-only at runtime so the key is not included in the image build context. The
local stack runs the Agent and MCP servers without provisioning AgentCore. Its
default model provider is OpenAI; Tavily and Google Maps remain external provider
APIs, with keys loaded only into the local MCP containers from `services/mcps/.env`.
The local auth process still talks to your existing Cognito user pool, so the
container mounts `~/.aws` read-only for its AWS SDK configuration.

The Agent uses OpenAI's direct Responses API. Create a key in the
[OpenAI Platform API Keys page](https://platform.openai.com/api-keys). API billing
is managed separately from ChatGPT subscriptions. The ignored project-root `.env`
has a provider block; paste the token after `OPENAI_API_KEY=` and leave the model
line at its default unless you want another model. Keep this key out of
`frontend/.env.local`.

Alternatively, enter the key at a hidden prompt in the shell that starts the local
services, without writing it to a file:

```bash
export OPENAI_API_KEY="$(python3 -c 'import getpass; print(getpass.getpass("OpenAI API key: "))')"
export AGENT_MODEL_PROVIDER=openai
export OPENAI_MODEL_ID=gpt-5.4-mini # optional; this is the default
bash scripts/start-local.sh
```

The key is used by the server-side agent only. In the combined local app container,
Docker stores it in that container's environment; the launcher gives it to the agent,
then removes it before starting auth, CRUD, and Vite. The browser build and configuration
never receive it. For stricter container isolation, use the separate-service Compose
setup, which injects the key only into the agent container. Direct calls require an
OpenAI API key with API billing enabled and access to the selected model; failures are
returned as errors and do not switch providers automatically. The OpenAI Responses API
call is stateless, and model-side tool execution is disabled so LangGraph continues to
own research and map tools through the local FastMCP servers. `/health` reports the
selected provider and model ID but never credentials.

To use Bedrock instead, set `AGENT_MODEL_PROVIDER=bedrock` and configure AWS
credentials for the local app before restarting. OpenAI remains the local default.

Pass standard `docker compose up` options when needed, for example
`bash scripts/start-local.sh -d` for detached mode. Stop detached services with
`docker-compose -p travella-local-single -f compose.local-single.yaml down` (or use
`docker compose` if that is the installed command). The PostgreSQL named volume remains
after stopping; add `-v` to `down` only when intentionally removing local database data.

To keep using the separate-service Compose setup, run
`TRAVELLA_COMPOSE_FILE=compose.yaml bash scripts/start-local.sh`.
If the local defaults are occupied, set `TRAVELLA_FRONTEND_PORT`,
`TRAVELLA_AUTH_PORT`, and `TRAVELLA_AGENT_PORT`; also set `FRONTEND_ORIGIN` to the
matching frontend origin.

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
