---
status: complete
---

# Shared local credentials through AWS Secrets Manager

Use one development secret (`travella/local-development`, eu-north-1) as the
source for existing application/provider credentials across worktrees. Import
available values from the current checkout and the configured zircon-poet checkout
without printing values or replacing existing cloud values implicitly.

1. Add an allowlisted secret bootstrap/pull/hidden-prompt update command.
2. Pull at local startup; preserve worktree settings, write ignored env files with
   owner-only permissions, and keep backend keys out of frontend configuration.
3. Document one-time setup, key updates, AWS authentication, and an explicit offline mode.
4. Test routing, quoting, failure behavior, and real retrieval into independent
   directories. Validate Compose without printing its expanded secrets.

All four tasks are complete. See `SUMMARY.md` and the linked testing evidence.

Application UI and durable CRUD behavior are unchanged. No browser gate applies.
