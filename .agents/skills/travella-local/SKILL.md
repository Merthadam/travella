---
name: travella-local
description: Start Travella's local Docker stack and verify example-account authentication. Use when launching, restarting, or diagnosing the local app for manual browser checks.
---

# Start Travella locally

Use the repository's single-container stack and verify the authenticated flow before handing the browser to the user.

## Rebuild after code changes

Run from the user's intended checkout. Check `git status --short --branch` and `git log -1 --oneline` first; preserve uncommitted work and do not switch branches or pull changes unless requested.

Follow the Cognito precheck below, then run `bash scripts/start-local-ready.sh`. Its launcher uses Compose `up --build` to rebuild from this checkout and recreate services when their images or settings change. A plain `docker restart` does not copy source changes into the image. Normal Docker build caching is appropriate; use a cache-free rebuild only when diagnosing a demonstrated cache problem.

After health and the authentication check pass, resolve the running app container with Compose `ps -q app` using the same project and Compose file as the launcher. Compare SHA-256 hashes of representative changed, non-secret source files in this checkout with their copies under `/app/` in that container (for example, the changed React component and stylesheet). Print only file paths and match/mismatch results. If they differ, check the Compose build context and selected worktree, rebuild, and repeat the comparison before reporting the changes as available.

Keep database volumes intact. Tell the user the canonical URL and to refresh their existing tab. A successful rebuild proves the checked code is loaded; it does not establish that optional integrations such as AgentCore Runtime are configured.

## Start and verify

From the repository root, first discover and validate Travella's existing local Cognito pool with the AWS `default` profile in `eu-north-1`. This is read-only: do not create or modify AWS resources. The expected pool is named `User pool - travela-local` and its public app client is named `travella-local-phase2`.

Run the following in Bash before starting Docker. It requires AWS CLI, Python 3 (`python3`), and an ignored root `.env` file (the repository's `.env` is ignored by Git). It deliberately suppresses AWS command output and prints only sanitized status messages:

```bash
set -euo pipefail
set +x
export AWS_PROFILE=default
export AWS_REGION=eu-north-1

aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "AWS default-profile credentials are unavailable; configure the existing default profile and retry." >&2
  exit 1
}

pool_json="$(aws cognito-idp list-user-pools --profile default --region eu-north-1 --max-results 60 \
  --query "UserPools[?Name=='User pool - travela-local'].Id" --output json 2>/dev/null)" || {
  echo "Could not list Cognito pools in the local region; check AWS access and retry." >&2
  exit 1
}
pool_count="$(python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' <<<"$pool_json")"
if [[ "$pool_count" != "1" ]]; then
  echo "Expected exactly one Cognito pool named User pool - travela-local in eu-north-1; found none or an ambiguous result." >&2
  exit 1
fi
pool_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)[0])' <<<"$pool_json")"

client_json="$(aws cognito-idp list-user-pool-clients --profile default --region eu-north-1 \
  --user-pool-id "$pool_id" --query "UserPoolClients[?ClientName=='travella-local-phase2'].ClientId" \
  --output json 2>/dev/null)" || {
  echo "Could not list app clients for the expected local pool; check AWS access and retry." >&2
  exit 1
}
client_count="$(python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' <<<"$client_json")"
if [[ "$client_count" != "1" ]]; then
  echo "Expected exactly one app client named travella-local-phase2; found none or an ambiguous result." >&2
  exit 1
fi
client_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)[0])' <<<"$client_json")"

client_config="$(aws cognito-idp describe-user-pool-client --profile default --region eu-north-1 \
  --user-pool-id "$pool_id" --client-id "$client_id" \
  --output json 2>/dev/null)" || {
  echo "Could not inspect the expected Cognito app client; check AWS access and retry." >&2
  exit 1
}
client_valid="$(python3 -c 'import json,sys; c=json.load(sys.stdin)["UserPoolClient"]; print("true" if "ClientSecret" not in c and "ALLOW_USER_PASSWORD_AUTH" in c.get("ExplicitAuthFlows", []) else "false")' <<<"$client_config")"
if [[ "$client_valid" != "true" ]]; then
  echo "The expected app client must have no client secret and allow USER_PASSWORD_AUTH; resolve its configuration before starting." >&2
  exit 1
fi

if ! git check-ignore -q .env; then
  echo "The repository root .env is not ignored by Git; refusing to write Cognito settings." >&2
  exit 1
fi
issuer="https://cognito-idp.eu-north-1.amazonaws.com/${pool_id}"
export COGNITO_USER_POOL_ID="$pool_id"
export COGNITO_APP_CLIENT_ID="$client_id"
export COGNITO_ISSUER="$issuer"
export COGNITO_JWKS_URL="${issuer}/.well-known/jwks.json"
python3 - <<'PY'
import os
from pathlib import Path

path = Path(".env")
keys = {
    "AWS_REGION": os.environ["AWS_REGION"],
    "COGNITO_USER_POOL_ID": os.environ["COGNITO_USER_POOL_ID"],
    "COGNITO_APP_CLIENT_ID": os.environ["COGNITO_APP_CLIENT_ID"],
    "COGNITO_ISSUER": os.environ["COGNITO_ISSUER"],
    "COGNITO_JWKS_URL": os.environ["COGNITO_JWKS_URL"],
}
lines = path.read_text().splitlines() if path.exists() else []
lines = [line for line in lines if line.partition("=")[0] not in keys]
lines.extend(f"{key}={value}" for key, value in keys.items())
path.write_text("\n".join(lines) + "\n")
PY
unset pool_json pool_count pool_id client_json client_count client_id client_config client_valid issuer
echo "Validated the existing local Cognito pool and app client; local settings are ready."
```

If discovery is missing or ambiguous, stop with the sanitized message shown by the command. Do not print AWS output, pool/client IDs, account identity, credentials, or the contents of `.env` while diagnosing it.

Then start and authenticate the local stack:

```bash
bash scripts/start-local-ready.sh
```

This starts or updates the Compose stack in detached mode, waits for the local auth health endpoint, reads the example account from `~/.config/travella/test-account.json`, and performs one sign-in → session check → sign-out cycle. It prints only result states. Keep the stack running while the user checks the UI.

Successful Cognito discovery does not bypass application startup failures. If the app fails during database migration, including a missing migration revision, treat that as a separate blocker: capture the sanitized migration error and diagnose the migration history. Preserve the PostgreSQL data volume while troubleshooting.
The launcher first pulls `travella/local-development` from AWS Secrets Manager in
`eu-north-1` into ignored, owner-only env files. New worktrees need AWS login but no
manual credential copying. Manage keys with
`uv run --locked python scripts/local_secrets.py set ANTHROPIC_API_KEY` (hidden prompt).
All model calls use Claude Agent SDK; `ANTHROPIC_MODEL` selects its model unless
`AGENT_RESEARCH_MODEL` overrides it. There is no direct-model-provider switch.
If retrieval fails, fix AWS access or explicitly use `TRAVELLA_SECRETS_MODE=local`
for offline startup with existing files. Never print expanded Compose configuration.

To stop it after the browser check, run `docker-compose -p travella-local-single -f compose.local-single.yaml down`. This preserves the PostgreSQL data volume.

The default browser origin is `http://localhost:5174`. Open that exact origin. Cookies are host and port scoped; do not switch between `localhost` and `127.0.0.1` or between 5173 and 5174 during one sign-in flow. If a custom port is needed, set both `TRAVELLA_FRONTEND_PORT` and `FRONTEND_ORIGIN` to matching values in the local environment, and set `TRAVELLA_LOCAL_ORIGIN` for the check/browser URL.

## If the app disappears when an agent request starts

Inspect only the container state (`OOMKilled`, `ExitCode`, `Running`) and Docker's
total memory before assuming credentials failed. Exit137 with `OOMKilled=true`
means Docker killed the app for memory exhaustion. The Claude SDK subprocess,
Vite, three Python services and other worktree stacks share the VM allocation;
the default 2 GiB Colima VM has caused this failure locally. A successful
authentication check does not verify model execution.

The launcher warns below 4 GiB, and readiness stops immediately on a killed app.
Inspect `docker stats --no-stream` and host RAM before selecting an allocation.
Increasing Colima memory requires a VM restart: explain that it interrupts all
local Docker stacks and obtain approval first. Record which containers were
running, preserve every volume, and restore those containers afterward. Do not
stop unrelated stacks or repeatedly restart an OOM-killed app without addressing
memory pressure. A minimal model smoke call requires user authorization.

## If authentication fails

1. Read the checker's stage and HTTP status. It waits for `/health` and requires `auth_configured: true` before attempting credentials.
2. Do not retry a rejected password repeatedly, print it, put it in shell history, or reset it. The checker makes one attempt only. Confirm the ignored account file is present and valid without displaying its contents.
3. Inspect the app container health and recent auth logs, keeping cookies, tokens, usernames, and provider payloads out of output. Check that `.env` Cognito pool/client/issuer/JWKS values match, and that the app's `FRONTEND_ORIGIN` exactly matches the browser origin.
4. If the checker succeeds but browser login fails, use a fresh isolated browser context at the same canonical origin and enter the supplied example account. Inspect the sign-in and `/auth/session` results. Do not clear the user's existing cookies or stop the stack while they are checking it.
5. If Cognito rejects the one attempt, stop there and report the status. Ask before changing the account password or pool configuration.

Avoid `docker-compose down -v` and volume deletion during local startup or troubleshooting; the PostgreSQL volume contains local Plans and sessions.

## If Cognito discovery fails

The pre-start discovery uses only the AWS `default` profile and `eu-north-1`, and expects one pool named `User pool - travela-local` with one public client named `travella-local-phase2`. Confirm locally that the profile is configured, the expected resources exist exactly once, and the client allows password authentication without a client secret. Keep IDs and account identity out of terminal output. The commands do not provision or mutate AWS resources.
