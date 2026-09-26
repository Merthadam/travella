# Account access local runbook

## Tooling and feedback

Python dependencies live in root `pyproject.toml` and `uv.lock`. Use **uv** for
dependency changes (`uv add`, `uv add --dev`), installation and test/service commands.
The React app remains a separate npm project with `frontend/package-lock.json`.

```bash
uv sync --locked
uv run --locked pytest -q
bash scripts/check.sh
```

The check script runs Python lint/format/tests and React tests/build, and stops on
any failure. Run focused tests after a task and the full script before accepting a
wave. Tests inject a fake Cognito boundary; no AWS credentials are needed for them.
JWT tests sign real RSA tokens and check actual cryptographic verification.

## Start the app without AWS

In separate terminals, from the repository root:

```bash
uv run --locked uvicorn services.auth.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
```

Open `http://localhost:5173`. Vite proxies `/auth` and `/health` to Python, so cookies
are same-origin. Without Cognito configuration, health reports `auth_configured: false`
and auth requests return 503 with an explanatory message. There is no fake login.

## Connect a development Cognito pool later

Use `services/.env.example` as the settings reference. Keep actual values in a local
ignored `.env` file. Start with `uv run --env-file .env uvicorn ...` using the same
arguments above. No AWS provisioning happens when starting this application.

- Configure a public app client without a secret; enable `USER_PASSWORD_AUTH`.
- Use required email verification, optional TOTP MFA, email recovery, token revocation
  and refresh rotation. Leave device remembering disabled for this implementation.
- Set region, user-pool ID, app-client ID, issuer and JWKS URL to matching pool values.
- Set short-lived access tokens (for example 5 minutes) and a 30-day refresh lifetime.
- Generate `SESSION_ENCRYPTION_KEY` locally using:

```bash
uv run python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

Keep that key secret and stable across service restarts. Losing/changing it makes
existing encrypted local sessions unreadable; clear the local session database
when deliberately rotating the development key. Never commit the key or database.
Pool/client identifiers are configuration, not AWS credentials.

The end-user Boto3 adapter uses unsigned Cognito user-pool calls; it does not fetch
IAM credentials. Administrative operations for recovery will need a separately
scoped IAM role once implemented.

## HTTP boundary and session model

Implemented routes:

- `POST /auth/register`, `/auth/verify-email`, `/auth/resend-verification`
- `POST /auth/sign-in`, `/auth/mfa/challenge` (existing authenticator)
- `POST /auth/mfa/enrollment/start`, `/auth/mfa/enrollment/verify`
- `POST /auth/mfa/recovery`, `/auth/mfa/recovery/verify`
- `POST /auth/forgot-password` (neutral request), `/auth/reset-password`
- `GET /auth/session`, `POST /auth/refresh`, `POST /auth/sign-out`
- `GET /private/probe` (walking-skeleton private authorization boundary)

React holds no Cognito tokens. An opaque HttpOnly cookie identifies a server-side
session. SQLite stores only a hash of the cookie and encrypted token/challenge data.
Session expiry stays fixed at 30 days from full sign-in, including across refreshes.
Each private session check validates the JWT signature and claims, then checks
Cognito GetUser for revocation and verified email. Identity comes from the signed
subject and must match GetUser. ID tokens are not used for API authorization.

POSTs require the exact configured Origin, JSON, and `X-Travella-Request: 1`.
Cookies use SameSite Strict, HttpOnly and Secure; HTTP localhost uses a separately
named development cookie. Responses are non-cacheable and validation errors do not
echo submitted inputs. There is no permissive CORS configuration.

The local backend serializes challenge/refresh/signout transitions, consumes
challenges once, rate-limits POSTs and enforces a 16 KiB body check. Run **one worker**.
Production mode is rejected by the entrypoint until shared sessions, distributed
rate limits, upstream body limits and deployment security are implemented.

Public CRUD handlers should use `services.auth.authorization.require_owner` with
the independently validated token subject. Browser-supplied owner IDs are never
an authorization input; foreign resources should be mapped to a non-disclosing
not-found response.

## Remaining Phase 1 work

- Live Cognito behavior for recovery-code replacement must still be verified; the
  local flow requires a replacement authenticator before issuing a session.
- Resource-aware authorization and safe return to a Plan; `/plans` is a placeholder.
- The old `AuthFlow` is a UI-domain sketch, not a security authority; HTTP routes
  grant sessions only from verified Cognito outcomes.
- Live AWS checks for verification delivery, TOTP challenge sessions, refresh
  rotation/revocation, neutral recovery behavior, and reset invalidation.
- Browser-level visual/accessibility review and a full end-to-end journey.

Offline passing tests do not establish these missing capabilities. Do not expose
this development slice as a completed authentication product.

## Provider references

- [Cognito refresh rotation](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html)
- [VerifySoftwareToken accepts access token or session, not both](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_VerifySoftwareToken.html)
- [uv project locking](https://docs.astral.sh/uv/concepts/projects/sync/)
