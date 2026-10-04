# Local verification

## Start local services

The launchers fetch shared credentials from AWS Secrets Manager before starting
Docker. The default secret is `travella/local-development` in `eu-north-1`.
Use your existing AWS CLI login/profile; AWS credentials themselves stay in the
AWS credential chain. Every checkout with these scripts uses the same secret.

One-time setup (already performed for this account):

```bash
uv run --locked python scripts/local_secrets.py bootstrap
```

This imports supported settings from existing ignored env files, without printing
values. Use `--from-checkout /path/to/configured/worktree` to fill missing settings
from another checkout. Existing cloud settings win; bootstrap never silently
rotates them. The secret is a flat JSON object with env variable names as keys.

To change a shared value, enter it at a hidden terminal prompt:

```bash
uv run --locked python scripts/local_secrets.py set OPENAI_API_KEY
```

For the Claude Agent SDK, use the same hidden prompt for its Anthropic API key:

```bash
uv run --locked python scripts/local_secrets.py set ANTHROPIC_API_KEY
```

The same command supports `TAVILY_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`,
`VITE_GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY`, Cognito settings, and the
session encryption key. The key is stored in the shared secret and pulled into
the ignored root `.env`; application containers do not receive it until a
provider explicitly needs it.
Restart each running worktree to pick up changes. Fetch without starting Docker:

```bash
uv run --locked python scripts/local_secrets.py pull
```

Pull writes owner-only, Git-ignored env files atomically: app secrets in `.env`,
provider secrets in `services/mcps/.env`, and only the explicitly supplied browser
Maps key in `frontend/.env.local`. It never derives a browser key from the server
Maps key. These files are local plaintext caches and are excluded from Docker
builds. Worktree-specific settings such as ports remain intact. Shared keys removed
from the secret are removed from these files on the next pull. Internal local MCP
signing credentials continue to be generated automatically per checkout.

Startup stops on retrieval errors or missing required settings, instead of silently
using stale credentials. To deliberately use existing local files without AWS:

```bash
TRAVELLA_SECRETS_MODE=local bash scripts/start-local.sh
```

Select another shared secret with `TRAVELLA_SECRETS_ID`, region with
`TRAVELLA_SECRETS_REGION`, or AWS profile with `AWS_PROFILE` in your shell.
Reading requires `secretsmanager:GetSecretValue`; bootstrap additionally needs
`CreateSecret`/`PutSecretValue`, and key updates require `PutSecretValue`.
Do not run `docker compose config` without `--quiet` or print expanded environments:
those outputs contain credentials.

With Docker and Colima installed, start the frontend, auth gateway, CRUD API, and agent
inside one local app container. PostgreSQL runs in its own container with a named data
volume so app image rebuilds do not remove database data:

```bash
bash scripts/start-local.sh
```

For an authenticated browser check, use the readiness launcher instead:

```bash
bash scripts/start-local-ready.sh
```

It starts the stack detached, waits for configured auth health, then verifies one
example-account sign-in/session/sign-out cycle. The test-account password and tokens
are never printed. The app remains running for browser inspection. See the
[local startup skill](../.agents/skills/travella-local/SKILL.md) for recovery steps.

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

The Agent uses OpenAI's direct Responses API. Manage `OPENAI_API_KEY` through the
shared secret or the hidden-prompt command above. API billing is managed separately
from ChatGPT subscriptions. Compose shell environment overrides still take precedence
over `.env`; unset an old exported key if you want the newly fetched shared value.

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
