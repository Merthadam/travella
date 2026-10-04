# Verification

The complete startup wrapper was run against the local Compose stack. It started/updated the app, waited for the Docker healthcheck (which covers the frontend, auth, CRUD, and agent endpoints), then completed an authenticated local sign-in, session check, and sign-out with the configured example account.

The account file values were not printed. A separate one-shot Cognito check also returned successful authentication, and a read-only Cognito account lookup reported the example account as enabled and confirmed without MFA.

Static checks passed:

- `bash -n scripts/start-local-ready.sh`
- `uv run --locked ruff check scripts/check-local-auth.py`
- `uv run --locked ruff format --check scripts/check-local-auth.py`
- `git diff --check`

The browser should use `http://localhost:5174` exactly. This verification tested the local browser-origin auth endpoint and session cookie handling through HTTP; it did not automate typing credentials into the browser UI.
