---
status: complete
date: 2026-10-04
---

# Shared local credentials across worktrees

Implemented an allowlisted Secrets Manager sync command and made local startup pull
the shared `travella/local-development` secret before launching Docker. Bootstrapped
the secret with 14 supported settings from existing ignored checkout files without
printing or placing secret values in Git. Shared keys route only to the intended
backend, MCP, or browser env files. Local ports/settings stay per-worktree and files
are written atomically with owner-only permissions. Internal per-checkout MCP keys
remain auto-generated.

## Verification

- Full agent, auth, CRUD, MCP, and credential suite: 206 passed, 4 skipped because
  an isolated PostgreSQL database was not configured.
- Credential helper Ruff check and both Compose syntax checks: passed. Repository-wide
  Ruff check reports 17 errors in the existing `services/crud/repository.py`.
- Isolated local startup: successful; authenticated sign-in, session check, and
  sign-out passed. Stack remains running at `http://localhost:6274`.
- A separate earlier run had one boundary-sensitive auth test failure; that test
  passed alone, and the full suite subsequently passed.
- Evidence: `artifacts/testing/2026-10-04-shared-worktree-secrets/verification.md`.

## Changed files

- `scripts/local_secrets.py` and focused tests.
- Local launcher, check command, lockfile and direct dotenv dependency.
- Local startup guide and testing skill instructions.
