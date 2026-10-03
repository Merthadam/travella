from __future__ import annotations

import asyncio

from services.agent.graph import AgentGraph
from services.agent.request_context import current_authorization_token


class ResearchAdapter:
    def __init__(self) -> None:
        self.research_token: str | None = None
        self.map_token: str | None = None

    async def complete_conversation(self, **_kwargs):
        return {"decision": "research", "assistant_text": "I will look into options."}

    async def research(self, *, authorization_token: str | None, **_kwargs):
        self.research_token = authorization_token
        return {
            "status": "ready",
            "run_id": "run-1",
            "candidates": [{"candidate_id": "candidate-1", "name": "Tarifa, Spain"}],
        }

    async def resolve_map(self, *, authorization_token: str | None, **_kwargs):
        self.map_token = authorization_token
        return {"status": "ready", "locations": []}


def test_research_graph_passes_request_token_without_putting_it_in_state():
    async def run():
        adapter = ResearchAdapter()
        graph = AgentGraph(adapter)
        result = await graph.invoke(
            {
                "traveler_scope": "traveler-1",
                "plan_id": "plan-1",
                "plan_revision": 1,
                "event_id": "event-1",
                "generation": 1,
                "message": "Find windy surf destinations.",
            },
            authorization_token="verified-access-token",
        )
        return adapter, result

    adapter, result = asyncio.run(run())

    assert adapter.research_token == "verified-access-token"
    assert adapter.map_token == "verified-access-token"
    assert "verified-access-token" not in repr(result)
    assert current_authorization_token() is None
