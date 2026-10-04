---
quick_id: 261004-di1
status: complete
description: Add reliable local Travella startup and authentication automation skill
---

# Summary

Added a detached local startup path that waits for the app container healthcheck and verifies one example-account sign-in/session/sign-out cycle before reporting the browser URL. Added a project skill for the canonical origin and safe auth troubleshooting. Updated the local verification docs and clarified detached startup output.

The test-account credentials succeeded against Cognito and the local `/auth/sign-in` plus `/auth/session` flow. The browser must use the exact `http://localhost:5174` origin so its cookie matches the auth origin.

## Verification

- `bash -n scripts/start-local-ready.sh` — passed.
- `uv run --locked ruff check scripts/check-local-auth.py` — passed.
- `uv run --locked ruff format --check scripts/check-local-auth.py` — passed.
- `bash scripts/start-local-ready.sh` — passed against the live Compose stack; app health became healthy and the one-shot local authentication check completed and signed out its temporary session.
- `git diff --check` — passed.

No credentials or tokens were printed. No Plan data or PostgreSQL volume was deleted. No commit was created.
