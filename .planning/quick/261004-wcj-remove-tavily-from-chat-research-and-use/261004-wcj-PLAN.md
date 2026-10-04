---
type: quick
id: 261004-wcj
status: planned
---

# Remove duplicate search and route stable destination ideas directly

User decision: remove the Tavily research step completely from chat; use model knowledge for general location discovery, researching current or uncertain details as necessary.

1. Remove legacy destination research from SdkResearchNode, the agent adapter, and its MCP allowlist. Keep existing map/source compatibility for older saved results; no Tavily discovery fallback.
2. Update routing and answer prompts together: direct answers for well-known stable geography and broad destination ideas, web research for volatile/high-stakes/uncertain facts or explicit search/verification. Knowledge-based suggestions may add candidates as agent_inferred; only the user settles a destination. Research requests target the actual knowledge gap.
3. Compile/review source, rebuild the local container through travella-local, and compare changed source hashes. Do not add/run automated tests or incur live model/search charges. Record behavioral verification as pending.

Scope: preserve approved shared state fields, streaming, SDK model, budgets, and LangGraph orchestration. Reuse of persisted evidence and model-call consolidation are separate work.
