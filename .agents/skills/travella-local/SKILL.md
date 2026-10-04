---
name: travella-local
description: Start Travella's local Docker stack and verify example-account authentication. Use when launching, restarting, or diagnosing the local app for manual browser checks.
---

# Start Travella locally

Use the repository's single-container stack and verify the authenticated flow before handing the browser to the user.

## Start and verify

From the repository root, run:

```bash
bash scripts/start-local-ready.sh
```

This starts or updates the Compose stack in detached mode, waits for the local auth health endpoint, reads the example account from `~/.config/travella/test-account.json`, and performs one sign-in → session check → sign-out cycle. It prints only result states. Keep the stack running while the user checks the UI.

To stop it after the browser check, run `docker-compose -p travella-local-single -f compose.local-single.yaml down`. This preserves the PostgreSQL data volume.

The default browser origin is `http://localhost:5174`. Open that exact origin. Cookies are host and port scoped; do not switch between `localhost` and `127.0.0.1` or between 5173 and 5174 during one sign-in flow. If a custom port is needed, set both `TRAVELLA_FRONTEND_PORT` and `FRONTEND_ORIGIN` to matching values in the local environment, and set `TRAVELLA_LOCAL_ORIGIN` for the check/browser URL.

## If authentication fails

1. Read the checker's stage and HTTP status. It waits for `/health` and requires `auth_configured: true` before attempting credentials.
2. Do not retry a rejected password repeatedly, print it, put it in shell history, or reset it. The checker makes one attempt only. Confirm the ignored account file is present and valid without displaying its contents.
3. Inspect the app container health and recent auth logs, keeping cookies, tokens, usernames, and provider payloads out of output. Check that `.env` Cognito pool/client/issuer/JWKS values match, and that the app's `FRONTEND_ORIGIN` exactly matches the browser origin.
4. If the checker succeeds but browser login fails, use a fresh isolated browser context at the same canonical origin and enter the supplied example account. Inspect the sign-in and `/auth/session` results. Do not clear the user's existing cookies or stop the stack while they are checking it.
5. If Cognito rejects the one attempt, stop there and report the status. Ask before changing the account password or pool configuration.

Avoid `docker-compose down -v` and volume deletion during local startup or troubleshooting; the PostgreSQL volume contains local Plans and sessions.
