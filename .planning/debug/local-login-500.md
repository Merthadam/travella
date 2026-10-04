---
slug: local-login-500
status: resolved
trigger: "i still cant log in"
created: 2026-10-04
updated: 2026-10-04
---

# Debug: Local login unavailable

## Symptoms

- **Expected:** The example user can sign in to the local Travella frontend through Cognito.
- **Actual:** The frontend cannot reach `/auth/session` or `/auth/sign-in`; its Vite proxy logs connection refused. `/auth/session` returns HTTP 500.
- **Errors:** The Docker app exited during startup with Alembic error `Can't locate revision identified by '0008'`.
- **Timeline:** Cognito settings were just configured in the ignored root `.env`; login remains unavailable.
- **Reproduction:** Open `http://localhost:5174` and attempt to sign in.

## Current Focus

- **hypothesis:** The issue is resolved after restoring migration 0008, setting the ignored local Cognito/model/session config, and replacing stale host Vite with the Docker-published frontend.
- **test:** Verify container and auth health, anonymous session behavior, then run the one-shot example-account sign-in/session/sign-out checker exactly once.
- **expecting:** Healthy container, `auth_configured:true`, anonymous session 401, and successful sign-in/session/sign-out.
- **next_action:** None — the user confirmed successful sign-in by sharing a screenshot of the authenticated conversation.

### Reasoning checkpoint

```yaml
reasoning_checkpoint:
  hypothesis: "Local auth availability required restoring migration 0008, selecting Bedrock instead of unconfigured OpenAI, generating the required Fernet key, and freeing port 5174 from the stale host Vite process."
  confirming_evidence:
    - "The app container exited with Alembic error: Can't locate revision identified by '0008'."
    - "The database's alembic_version is 0008, while the checkout's current migration head is 0007."
    - "Commit beb989e contains the exact migration with revision 0008 and down_revision 0007."
    - "Container health is healthy and direct auth health reports auth_configured true; direct anonymous session returns 401."
    - "Host port 5174 is occupied by host Vite PID 3071; inside the app container Vite proxies the session route correctly."
  falsification_test: "A failed one-shot example-account sign-in, or a host `/auth/session` response other than signed-out 401, would show the issue remains."
  fix_rationale: "The exact migration matches Alembic to the existing schema; Bedrock matches the source default; auth requires a valid Fernet key; and removing the stale host listener lets Docker's frontend proxy auth. Database data remains intact."
  blind_spots: "AWS credentials could fail later agent model calls, but the local auth sign-in/session/sign-out checker succeeded. User browser confirmation is still pending."
  candidate_causes:
    - "config/data: database schema revision is 0008 while the migration graph omits 0008."
    - "environment/config: Compose selects OpenAI while the key is empty; the agent exits and terminates the shared launcher."
    - "environment/config: Cognito auth is configured but no valid Fernet session key exists; auth exits and terminates the shared launcher."
    - "environment: stale host Vite process occupied 5174 and shadowed the Docker frontend's proxy."
  and_gate: "yes — the migration, configured model provider, session-encryption key, and available Docker frontend port were all needed for the requested local login path."
```

## Evidence

- timestamp: 2026-10-04 — `curl http://localhost:5174/auth/session` returns HTTP 500; ports 8000 and 8003 refuse connections.
- timestamp: 2026-10-04 — app container exits with `Can't locate revision identified by '0008'`.
- timestamp: 2026-10-04 — database `alembic_version` is `0008`; this checkout's only head is `0007`.
- timestamp: 2026-10-04 — exact `0008_traveler_profiles.py` migration exists in Git history; it follows `0007` and creates the traveler_profiles table.
- timestamp: 2026-10-04 — Cognito local pool/client discovery succeeded; client has no client secret and allows `ALLOW_USER_PASSWORD_AUTH`; example user exists in the pool.
- timestamp: 2026-10-04 — `0008_traveler_profiles.py` is absent from the worktree but present in commit `beb989e`; it declares revision `0008`, down revision `0007`, and creates the traveler_profiles table.
- timestamp: 2026-10-04 — After restoring the migration and rebuilding, Alembic passed revision resolution; the app then exited because `OPENAI_API_KEY` is required when Compose defaults `AGENT_MODEL_PROVIDER=openai`, leaving auth unavailable.
- timestamp: 2026-10-04 — Setting ignored `.env` `AGENT_MODEL_PROVIDER=bedrock` exposed the next missing setting: auth requires a valid `SESSION_ENCRYPTION_KEY`; generated and stored one using the documented Fernet method.
- timestamp: 2026-10-04 — Container health became healthy and `/health` returned 200 with `auth_configured:true`; direct auth session returned the expected anonymous 401.
- timestamp: 2026-10-04 — A stale host Vite process occupied host port 5174 and returned 500 for `/auth/session`; stopped that process, recreated only the app container, and host `/auth/session` then returned 401.
- timestamp: 2026-10-04 — Ran `uv run --locked python scripts/check-local-auth.py` once; example-account sign-in, session validation, and sign-out all succeeded, with no credential/token output.
- timestamp: 2026-10-04 — PostgreSQL volume `travella-local-single_postgres-data` remains present; database revision is `0008` and `traveler_profiles` exists.
- timestamp: 2026-10-04 — User shared a screenshot showing the authenticated Travella conversation, confirming browser sign-in works.

## Eliminated

- hypothesis: Cognito settings are absent.
  evidence: Existing pool/client were discovered via the default AWS profile and the ignored root `.env` now contains the derived Cognito settings.
- hypothesis: Cognito example account is absent.
  evidence: The example account exists in the selected pool; no password attempt was made.
- hypothesis: Only the frontend proxy port is wrong.
  evidence: Both candidate auth ports refuse connections because the app container exited before binding either port.

## Resolution

- **root_cause:** The checkout omitted Alembic revision `0008` already recorded by the preserved database. After that was restored, startup also required selecting a configured agent provider and generating the missing Fernet session key. Finally, a stale host Vite process occupied 5174 and produced proxy 500s instead of exposing the Docker frontend.
- **fix:** Restored the exact migration from commit `beb989e`; configured ignored `.env` to use the existing Bedrock provider and a generated stable Fernet key; stopped stale host Vite and recreated only the app container. No volume was deleted or reset.
- **verification:** App container healthy; `/health` 200 with `auth_configured:true`; anonymous session returns 401 both directly and through port 5174; one example-account sign-in/session/sign-out checker run succeeded; database remains at revision `0008` with `traveler_profiles`; named PostgreSQL volume remains present.
- **files_changed:** `services/crud/migrations/versions/0008_traveler_profiles.py` restored from original commit; ignored `.env` runtime settings (untracked/ignored).
- **human_confirmation:** Confirmed — user shared a screenshot of the authenticated conversation in Travella.
