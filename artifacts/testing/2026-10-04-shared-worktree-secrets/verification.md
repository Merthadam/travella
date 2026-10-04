# Shared worktree credentials verification

AWS region: `eu-north-1`
Secrets Manager entry: `travella/local-development`

No secret values are recorded here.

## Results

- Bootstrapped the secret from supported, ignored env files in the current checkout
  and existing configured worktree; cloud values were preserved.
- Pulled 14 supported settings into two independent temporary checkout roots.
- Verified destinations, literal quoting, local port preservation, and mode `0600`.
- Verified secret settings disappear from local managed env entries after removal from
  the shared secret, without deleting unrelated worktree settings.
- Tested inaccessible, malformed, partial, symlinked, and nonempty-directory cases.
- Credential helper tests: 14 passed; scoped Ruff check passed.
- `docker-compose config --quiet` for `compose.local-single.yaml` and `compose.yaml`:
  passed.
- `bash scripts/start-local-ready.sh` with isolated ports/project: shared settings
  fetched; app became healthy; Cognito sign-in, session read, and sign-out passed.
- `uv run --locked pytest -q services/agent/tests services/auth/tests
  services/crud/tests services/mcps/tests scripts/tests`: 206 passed, 4 skipped
  because `TEST_DATABASE_URL` did not point to an isolated PostgreSQL database.
- An earlier combined run had one boundary-sensitive auth expiration test fail; its
  isolated rerun passed, and the full suite subsequently passed.
- Repository-wide `ruff check services scripts` reports 17 errors in the existing
  `services/crud/repository.py`; scoped Ruff on the changed helper/tests passes.

The authenticated local stack remains available at `http://localhost:6274` under
Compose project `travella-shared-secrets-check`.
