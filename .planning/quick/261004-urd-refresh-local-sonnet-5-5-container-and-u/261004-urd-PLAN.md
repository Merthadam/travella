---
mode: quick
status: planned
---
# Refresh local Sonnet 5.5 container

1. Remove the shared SDK options' hardcoded disabled-thinking override. Let the selected model and bundled SDK choose supported defaults; preserve tools, context, streaming and budgets.
2. Refresh the local stack through scripts/start-local-ready.sh, preserving volumes and secret handling. Observe health/model, startup authentication and source hashes.

Scope: services/agent/claude/research_worker.py and this quick task's planning records. No automated tests or paid model calls; user checks chat manually.

Evidence: Sonnet 5.5 rejects thinking.type=disabled according to https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5 . Current shared _options sends that value for every model stage.
