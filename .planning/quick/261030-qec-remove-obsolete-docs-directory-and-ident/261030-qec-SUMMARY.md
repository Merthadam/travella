---
status: complete
commit: 14b8a64
---
# Docs removal and backend cleanup candidates

User confirmed the entire docs/ directory. Removed 43 obsolete documents/assets and moved the mandatory testing skill unchanged into .agents/skills/travella-testing. Updated AGENTS.md and four active reference files. Historical .planning and artifacts records remain outside the authorized deletion scope.

Verification: docs/ absent; moved skill byte-identical to the original; mandatory instruction links to existing file; tracked active-reference scan has only an external MCP documentation URL, no local docs/ references; git diff --check passed. Runtime code unchanged, so no application tests or browser checks were run for this documentation-only task.

Read-only backend review found:
- services/auth/api.py:353 and services/agent/app.py:148,177 still synchronize profiles to AgentCore; retrieve_relevant_memory has only definitions and test callers after the earlier cleanup. Recommend reviewing removal of this unused mirror path as the next bounded task.
- services/agent/service.py:64 and services/agent/specialist_service.py:13 repeat reservations, generation checks, shielded commit and cancellation cleanup. Shared lifecycle machinery could reduce drift while preserving topic-specific persistence and replay rules.
- services/auth/api.py:391-487 repeats transactional session-token acquisition and agent availability/Plan-id checks across travel, turn, stream and cancel routes. A small shared authenticated-agent helper would reduce duplication; keep streaming and JSON response handling separate.
- services/agent/claude/canvas_travel.py mixes snapshot contracts, natural-language parsing and provider execution; structured tools inherit it with parse_message=False. A future split could isolate the parser still used by research_flights.py from shared budgets/cache/transport.

These are refactoring opportunities, not demonstrated production failures. No backend refactor was implemented in this task.
