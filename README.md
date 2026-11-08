# Travella

Travella is an authenticated, conversational travel-planning app with an editable,
map-first Planning Canvas. Travelers research a destination, compare options, and
explicitly choose what to save.

## Source of truth

Code, tests, schemas, and configuration describe the implementation. Use CodeGraph
as a navigation aid, checking live source when the index is stale or unavailable.
[AGENTS.md](AGENTS.md) holds essential product and engineering constraints;
[CONTEXT.md](CONTEXT.md) defines product vocabulary. Neither a code index nor a
passing local check proves production readiness.

## Run locally

Prerequisites: Docker with Compose, `uv`, Python 3.12+, and AWS CLI access to the
existing development resources. Host-side frontend checks also need Node.js 22
(the Docker build uses Node 22) and npm.

1. Follow the read-only Cognito precheck in
   [the local-stack guide](.agents/skills/travella-local/SKILL.md). It validates the
   existing pool/client using the AWS `default` profile in `eu-north-1` and updates
   ignored local settings. Do not create replacement AWS resources.
2. Ensure the local example-account file exists at
   `~/.config/travella/test-account.json`; never commit or print its credentials.
3. From the repository root, run:

   ```bash
   bash scripts/start-local-ready.sh
   ```

The launcher retrieves shared development secrets into ignored local env files,
rebuilds the single-container app plus PostgreSQL stack, waits for service health,
and checks sign-in → session → sign-out. AWS credentials and the existing shared
secret are required by default. See the local-stack guide for offline settings,
custom ports, authentication troubleshooting, and safe rebuild verification.

Open **http://localhost:5174** after readiness succeeds. Keep the same origin
throughout sign-in; do not substitute `127.0.0.1` or another port. Authentication
readiness does not verify model calls or optional provider integrations.

Stop the default stack without deleting its database volume:

```bash
docker compose -p travella-local-single -f compose.local-single.yaml down
```

Use `docker-compose` instead if that is the installed Compose CLI. Never add `-v`
unless database deletion is explicitly intended and authorized.

## Checks

From the repository root:

```bash
bash scripts/check.sh
```

This syncs locked Python dependencies, runs Ruff lint/format checks on `services/`,
runs auth/CRUD/script tests, installs locked frontend dependencies, runs frontend
tests and the production build, and validates the default Compose configuration.
It does not start containers or verify live AWS/provider behavior; dependency
installation may require network access.

The script does **not** include agent or MCP tests. Run those explicitly when
changing those services, or run all service and script tests:

```bash
uv sync --locked
uv run --locked pytest -q services scripts/tests
```

Focused frontend commands:

```bash
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

Frontend work and backend CRUD changes also require the checks and evidence in
[the Travella testing skill](.agents/skills/travella-testing/SKILL.md).

## Repository layout

- `frontend/` — React/Vite app and frontend tests.
- `services/auth/` — authentication and browser gateway.
- `services/crud/` — durable Plan API, database migrations, and tests.
- `services/agent/` — agent runtime and orchestration.
- `services/mcps/` — provider connector/MCP services.
- `services/shared/` — shared service code.
- `scripts/` — local startup, checks, and operational utilities.
- `.agents/skills/` — project-specific local development and testing procedures.

Generated planning documents, Superpowers docs, agent logs, and verification
artifacts are local-only and ignored by Git.

Historical planning files, agent logs, and artifacts were removed from the working tree.
They remain in Git history at commit `3b8f34e`; older evidence may refer to paths
from that tree. Inspect a removed file with `git show 3b8f34e:<path>` rather than
restoring the entire planning workflow.
