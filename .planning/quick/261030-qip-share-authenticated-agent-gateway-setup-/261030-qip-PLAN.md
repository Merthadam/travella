---
status: complete
created: 2026-10-30
---
# Share authenticated agent gateway setup

User selected item 3 as the next implementation. Memory remains in scope for future Agent-owned short/long-term memory design; do not remove the profile mirror. Shared agent turn lifecycle is discussion only.

1. Characterize the travel, turn, stream and cancel HTTP routes using real FastAPI handlers and SQLite-backed auth sessions. Preserve server-derived identity, verification ordering, route-specific errors, travel action allowlist, stream headers and remote cancellation cleanup.
2. Extract one small local helper in services/auth/api.py for transactional session-token retrieval in a worker thread, agent availability and optional chat Plan-id validation. Keep ready/body/allowlist ordering in callers; provider operations execute after the session transaction ends. No CRUD persistence or frontend changes.
3. Run the new tests before and after extraction plus existing auth gateway/client regressions, inspect diff and record verification. Commit source and GSD records separately.

Threat checks: never accept browser-supplied identity/token, never hold the session transaction across upstream I/O, do not change unauthenticated/configuration/validation precedence, preserve SSE and cancellation behavior.
