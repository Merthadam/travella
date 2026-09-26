# Phase 1 execution checkpoint

Status: **partial / executing**, not plan or phase completion.

## User-approved changes from the original plans

- Python services + separate React frontend replace the initial TypeScript service sketch.
- uv is the sole Python package manager; root `pyproject.toml` and `uv.lock` replace `services/requirements.txt`.
- Inline execution continues by user request. Earlier subagent failures were not
  conclusively diagnosed; no independent-agent verification is claimed.
- AWS creation/configuration remains deferred.

## Implemented and checked

- `services/auth/api.py`: FastAPI registration, confirmation/resend, sign-in,
  existing-TOTP challenge, recovery request/completion, session, refresh and
  signout routes. Reset completion invalidates matching local sessions and
  attempts Cognito global sign-out for each active access token.
- `jwt_verifier.py`: real RS256/JWKS validation followed by claims checks.
- `session_store.py`: opaque cookie hashes and encrypted SQLite session records,
  fixed expiry and serialized refresh/signout/challenge updates in one local process.
- `app.py`: local service entrypoint; unavailable configuration returns 503;
  production startup is refused until deployment controls are ready.
- `frontend/src/AccountApp.jsx`: forms depend on server results; secrets clear on
  submission/navigation, session refresh handles access expiry, signout returns to sign-in.
- `bash scripts/check.sh`: locked dependencies, lint/format, API/security tests,
  React DOM tests, frontend build. 44 Python tests and 7 React tests currently pass.
- Local proxy was exercised against the running Python service without AWS.
- Previously tracked generated Python bytecode is now ignored and untracked;
  local copies were retained. The replaced requirements file is recoverable from Git.

## Resume without repeating completed work

Implementation commits: `dc97512` (uv and bytecode cleanup), `ea86178`
(HTTP auth/session boundary), `81bee65` (connected React forms). The reset
completion slice is currently uncommitted pending its final check. The full
`bash scripts/check.sh` previously passed after the committed source changes:
42 Python tests, 6 React tests, lint/format, and production frontend build. Dependency
deprecation/install-script warnings remain; no test or build failures occurred.

The original three plans are still incomplete. Their TypeScript paths and Jest
commands are historical planning assumptions; use the selected Python/React paths
and commands above. Required product behavior and D-01 through D-24 still bind.
Do not create complete-plan SUMMARY files until the remaining task criteria pass.

1. Implement TOTP enrollment and a carefully specified recovery-code authority.
   Cognito TOTP challenges do not natively accept Travella backup codes. Recovery
   must never turn code possession into an unverified normal session or allow
   private access before replacement enrollment. Persist hashed, one-use codes
   and enforce the restricted recovery state at every private boundary.
2. Replace private-plan placeholder with token-derived authorization when the
   Plan boundary is available; re-authorize return destinations on the server.
4. Run actual browser and live-Cognito tests, and finish phase verification.

`docs/runbooks/account-access.md` describes local commands, the cookie/proxy model,
provider configuration and deployment limitations. `01-VALIDATION.md` holds test
evidence and open gaps. A green local script is not a phase-completion signal.
