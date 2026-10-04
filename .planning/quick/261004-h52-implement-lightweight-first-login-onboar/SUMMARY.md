---
quick_id: 261004-h52
description: Implement the single-purpose traveler intake node
status: complete
---

# Summary

Implemented a standalone LangGraph onboarding intake node that asks or clarifies one question at a time and returns grounded answer candidates. The node has no tools, profile reads, persistence, search, or confirmation side effects. Both configured model-provider paths request structured output without tools.

## Verification

- `uv run --locked pytest -q services/agent/tests/test_onboarding_intake.py services/agent/tests/test_agent_turn.py` — 9 passed.
- `uv run --locked ruff check services/agent/graph/nodes/onboarding_intake.py services/agent/graph/onboarding.py services/agent/claude/messages.py services/agent/tests/test_onboarding_intake.py` — passed.
- `git diff --check` — passed.

## Scope boundary

This task does not route first login into the graph or save profile data. The repository has no first-login completion signal or traveler profile API. Those belong in the surrounding application flow, outside this node.
