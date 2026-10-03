---
slug: second-turn-agent-provider-unavailable
status: resolved
trigger: "Still on the second message it says agent provider not available."
created: 2026-10-03
updated: 2026-10-03
---

# Debug: second-turn agent provider unavailable

## Symptoms

- **Expected:** A research-triggering Copilot message returns destination candidates, or a specific safe research-unavailable status.
- **Actual:** The research-triggering turn displayed `Agent provider unavailable.`
- **Error:** The Agent API's catch-all hid failures from the graph and MCP layers behind one generic response.
- **Reproduction:** Open a plan Copilot and send a specific destination-research request after earlier conversation messages.

## Resolution

- **root_cause:** Two defects blocked the research turn. First, AgentTurnService placed the Cognito access token in graph input, but `AgentState` does not declare it; LangGraph filtered it, so ResearchNode passed no verified token and LocalMcpAdapter rejected the tool call. Second, AuthenticatedMcpASGI recreated its `sent` flag on each `receive()` call and replayed the same HTTP request body forever. Stateful FastMCP initialization timed out. After fixing that, stateful MCP execution still lacked the request-local authorization context, because these tools do not need long-lived sessions.
- **fix:** Bind the verified access token in a request-scoped ContextVar around graph invocation, and read it only while research/map nodes call tools. The token remains outside LangGraph state and checkpoints. Replay the authenticated HTTP body once, then delegate subsequent receive calls to the original ASGI receive function. Configure both MCP targets for stateless JSON transport so tool execution inherits the authenticated request context.
- **verification:** The regression tests failed before each fix and pass afterward. A live graph call with the surf-holiday request returned `shortlist_ready` with one candidate and one map projection using the configured OpenAI, Tavily, and Google Maps paths. Agent/MCP suites: 59 passed. Focused Ruff: passed. Health reports OpenAI `gpt-6-luna`, local MCP, and memory disabled. Chrome UI replay could not be completed because a Chrome extension UI blocked automation.
- **files_changed:** `services/agent/request_context.py`, `services/agent/graph/builder.py`, `services/agent/graph/nodes/research.py`, `services/agent/service.py`, `services/agent/tests/test_agent_graph.py`, `services/agent/tests/test_agent_api.py`, `services/mcps/transport.py`, `services/mcps/map_server.py`, `services/mcps/research_server.py`, `services/mcps/tests/test_transport.py`.

## Evidence

- timestamp: 2026-10-03 — UI replay reproduced `Agent provider unavailable.` on a research-triggering message.
- timestamp: 2026-10-03 — A graph-level live call reached ResearchNode with `authorization_token=None`; the adapter raised `GatewayProtocolError` before invoking MCP.
- timestamp: 2026-10-03 — A red regression test showed LangGraph graph input rejected the separately passed authorization token; the service-level test observed `None` where it expected the verified token.
- timestamp: 2026-10-03 — A bounded MCP probe showed `ReadTimeout` during `initialize`; code inspection found each `receive()` invocation reset the replay guard and returned the same request body.
- timestamp: 2026-10-03 — After fixing body replay, the tool error was classified as missing authenticated MCP context; stateless FastMCP configuration made authenticated dispatch execute in the request context.
- timestamp: 2026-10-03 — Live local graph returned `shortlist_ready`, one destination candidate, and one map projection for the user's surf-holiday request.
- timestamp: 2026-10-03 — `uv run --no-sync pytest -q services/agent/tests services/mcps/tests`: 59 passed.
- timestamp: 2026-10-03 — Focused Ruff checks passed; no `[DEBUG-...]` instrumentation remains.
