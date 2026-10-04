---
id: 261004-wcj
status: complete
verification: static_and_startup_only
---

# SDK-only research with direct destination suggestions

Removed the legacy Tavily discovery step from SdkResearchNode, the agent adapter protocol/implementation, its local MCP routing table and the Gateway allowlist. The research node now invokes Claude Agent SDK directly. Existing connector infrastructure remains for legacy source lookup; it is not a chat search fallback.

Routing and answer prompts now agree on these rules:
- Confident stable geography, broad destination ideas and general comparisons can use model knowledge.
- Prices, conditions, availability, schedules, entry rules, safety/health guidance, uncertain/niche facts, and explicit search/research/verification requests require web research.
- Mixed questions focus web work on the actual changing or uncertain details.
- Direct destination ideas can add up to five agent_inferred candidates using the existing shared state schema. The final destination still requires explicit traveler intent. No invented sources or claims of fresh verification.
- The native research skill limits its scope to the requested knowledge gap.

## Checks performed

- `git diff --check`: passed.
- `uv run --locked python -m compileall -q services/agent`: passed.
- Static search: no remaining production agent references to RESEARCH_TOOL, tools.research calls, or adapter research methods.
- `bash scripts/start-local-ready.sh`: rebuilt and passed health and example-account authentication; database volumes preserved.
- All six changed source/prompt hashes match the running container.

No automated tests or paid model/search calls were run. Prompt routing behavior and knowledge-only candidate edits remain pending manual acceptance. Existing legacy adapter tests still describe the removed research method and need migration when tests are next requested.

## Scope

No model or budget change. Ordinary conversation still has separate routing and answer calls. Evidence persistence/reuse and call consolidation remain follow-up work. No cloud deployment or push.

Local URL: http://localhost:5174.
