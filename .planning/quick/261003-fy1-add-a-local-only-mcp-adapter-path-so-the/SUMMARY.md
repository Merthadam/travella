---
status: complete
task: Local-only MCP adapter path
date: 2026-10-03
---

## Summary

Added a development-only LangGraph tool adapter that calls the local FastMCP
research and map servers over Streamable HTTP. The adapter creates the same
short-lived service JWT and Plan-scope assertion checked by the MCP transport.
Development/test mode now defaults to local MCP, and the local Compose setup
starts the application, PostgreSQL, and MCP servers without AgentCore resources.
The local model defaults to the configured OpenAI provider; Cognito remains on
the existing user pool. Long-term agent memory is disabled per user direction.

Generated local service credentials are ignored by Git and stored at mode 0600.
The MCP provider-key file was not opened.

## Verification

- 56 Agent and MCP tests passed.
- Ruff check and format checks passed for files changed by this task.
- Both Compose configurations validated.
- Local Docker stack reported healthy; frontend, auth health, and agent health
  endpoints responded. Agent health reported local MCP, no Gateway configured,
  and OpenAI model `gpt-6-luna`.
- The repository-wide `scripts/check.sh` stopped at Ruff due existing style
  errors in the unrelated, already-modified `services/crud/repository.py`.
- No live Tavily, Google Maps, or authenticated Cognito research call was run;
  the MCP protocol and authorization boundary were covered by local tests.
- See `artifacts/testing/2026-10-03-local-agent-without-agentcore/verification.md`
  for commands and details.

## Working tree

No commit was created because the shared worktree already contains unrelated
uncommitted changes, including edits in files also touched by this task. The
implementation and evidence are left in the worktree for review.
