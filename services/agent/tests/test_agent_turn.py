from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from services.agent.claude import ClaudeGatewayAdapter
from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanCandidateStore, ProcessReceiptCache
from services.agent.turn import TurnContext, load_prompt


@pytest.fixture(autouse=True)
def _bedrock_isolated_provider_configuration(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "bedrock")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


class FakeMessages:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            content=[
                SimpleNamespace(
                    type="text",
                    text='{"decision":"research","assistant_text":"I can research destinations for food and temples."}',
                )
            ]
        )


class FakeClient:
    def __init__(self):
        self.messages = FakeMessages()


def test_turn_context_bounds_history_and_excludes_inactive_brief():
    context = TurnContext(
        traveler_scope="traveler-1",
        plan_id="plan-1",
        plan_revision=3,
        brief={
            "interests": {"value": "food", "active": True},
            "old": {"value": "skiing", "active": False},
        },
        recent_messages=tuple({"role": "user", "content": str(i)} for i in range(20)),
    )
    bounded = context.bounded()
    assert "old" not in bounded.brief
    assert len(bounded.recent_messages) == 12


def test_turn_context_projects_only_allowlisted_traveler_preferences():
    context = TurnContext(
        traveler_scope="traveler-1",
        plan_id="plan-1",
        traveler_profile={
            "departure_base": "Budapest",
            "food_needs": "Peanut allergy",
            "email": "private@example.test",
            "updated_at": "internal-version",
        },
    )
    messages = context.messages("Find a weekend trip")
    assert '"departure_base":"Budapest"' in messages[-1]["content"]
    assert '"food_needs":"Peanut allergy"' in messages[-1]["content"]
    assert "private@example.test" not in messages[-1]["content"]
    assert "internal-version" not in messages[-1]["content"]


def test_agentcore_profile_reaches_conversation_ephemerally_not_graph_state():
    class Model:
        context = None

        async def complete_conversation(self, *, message, context, authorization_token):
            self.context = context
            return {"decision": "respond", "assistant_text": "I’ll keep that in mind."}

    model = Model()
    graph = AgentGraph(model)
    result = asyncio.run(graph.invoke(
        {
            "traveler_scope": "traveler-1",
            "plan_id": "plan-1",
            "event_id": "event-1",
            "message": "Plan a weekend away",
        },
        authorization_token="access-token",
        traveler_profile={"departure_base": "Budapest", "food_needs": "Peanut allergy"},
    ))

    assert model.context.traveler_profile == {
        "departure_base": "Budapest", "food_needs": "Peanut allergy"
    }
    assert "traveler_profile" not in result
    assert "access-token" not in str(result)


def test_plan_turn_uses_only_agentcore_profile_matching_current_crud_version():
    plan_id = "00000000-0000-0000-0000-000000000123"
    current = {
        "departure_base": "Budapest", "citizenships": ["Hungarian"],
        "food_needs": "Peanut allergy", "accessibility_needs": "",
        "travel_interests": "Museums", "updated_at": "2026-10-04T10:00:00Z",
    }

    class ContextReader:
        async def context(self, plan_id, token):
            return {"revision": 1, "messages": [], "brief": {}}

        async def profile(self, token):
            return {**current, "exists": True}

        async def append(self, *args, **kwargs):
            return None

    class Memory:
        enabled = True

        async def retrieve_relevant_memory(self, subject, topic):
            return {**current}

    class Graph:
        profile = None

        async def invoke(self, state, *, authorization_token, traveler_profile, on_text_delta=None):
            assert "traveler_profile" not in state
            self.profile = traveler_profile
            return {"projection": {
                "status": "needs your input", "plan_id": plan_id,
                "event_id": state["event_id"], "generation": state["generation"],
                "assistant_text": "What dates work?",
            }}

    graph = Graph()
    service = AgentTurnService(
        plan_reader=lambda *args: {"lifecycle": "active", "revision": 1},
        context_reader=ContextReader(), graph=graph, tools=object(),
        candidates=PlanCandidateStore(), receipts=ProcessReceiptCache(), memory=Memory(),
    )
    response = asyncio.run(service.handle(
        AgentRequest(plan_id=plan_id, event_id="event-1", message="A weekend trip"),
        "verified-subject", "Bearer access-token",
    ))

    assert response.status == "needs your input"
    assert graph.profile == {
        "departure_base": "Budapest", "citizenships": ["Hungarian"],
        "food_needs": "Peanut allergy", "travel_interests": "Museums",
    }


def test_plan_turn_ignores_stale_agentcore_profile_snapshot():
    plan_id = "00000000-0000-0000-0000-000000000124"
    current = {"departure_base": "Budapest", "updated_at": "new-version"}

    class ContextReader:
        async def context(self, plan_id, token):
            return {"revision": 1}

        async def profile(self, token):
            return current

        async def append(self, *args, **kwargs):
            return None

    class Memory:
        enabled = True

        async def retrieve_relevant_memory(self, subject, topic):
            return {"departure_base": "Vienna", "updated_at": "old-version"}

    class Graph:
        profile = None

        async def invoke(self, state, *, authorization_token, traveler_profile, on_text_delta=None):
            self.profile = traveler_profile
            return {"projection": {
                "status": "needs your input", "plan_id": plan_id,
                "event_id": state["event_id"], "generation": state["generation"],
                "assistant_text": "What dates work?",
            }}

    graph = Graph()
    service = AgentTurnService(
        plan_reader=lambda *args: {"lifecycle": "active", "revision": 1},
        context_reader=ContextReader(), graph=graph, tools=object(),
        candidates=PlanCandidateStore(), receipts=ProcessReceiptCache(), memory=Memory(),
    )
    asyncio.run(service.handle(
        AgentRequest(plan_id=plan_id, event_id="event-1", message="A weekend trip"),
        "verified-subject", "Bearer access-token",
    ))
    assert graph.profile == {"departure_base": "Budapest"}


def test_plan_turn_keeps_current_crud_profile_when_agentcore_is_unavailable():
    plan_id = "00000000-0000-0000-0000-000000000125"
    class ContextReader:
        async def context(self, plan_id, token):
            return {"revision": 1}

        async def profile(self, token):
            return {"departure_base": "Budapest", "updated_at": "current"}

        async def append(self, *args, **kwargs):
            return None

    class Memory:
        enabled = True

        async def retrieve_relevant_memory(self, subject, topic):
            raise RuntimeError("AgentCore is temporarily unavailable")

    class Graph:
        profile = None

        async def invoke(self, state, *, authorization_token, traveler_profile, on_text_delta=None):
            self.profile = traveler_profile
            return {"projection": {
                "status": "needs your input", "plan_id": plan_id,
                "event_id": state["event_id"], "generation": state["generation"],
                "assistant_text": "What dates work?",
            }}

    graph = Graph()
    service = AgentTurnService(
        plan_reader=lambda *args: {"lifecycle": "active", "revision": 1},
        context_reader=ContextReader(), graph=graph, tools=object(),
        candidates=PlanCandidateStore(), receipts=ProcessReceiptCache(), memory=Memory(),
    )
    asyncio.run(service.handle(
        AgentRequest(plan_id=plan_id, event_id="event-1", message="A weekend trip"),
        "verified-subject", "Bearer access-token",
    ))
    assert graph.profile == {"departure_base": "Budapest"}


def test_conversation_uses_versioned_system_prompt_and_bounded_messages():
    fake = FakeClient()
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
    context = TurnContext(traveler_scope="traveler-1", plan_id="plan-1", plan_revision=2)
    result = asyncio.run(
        adapter.complete_conversation(
            message="food in spring", context=context, authorization_token="secret"
        )
    )
    call = fake.messages.calls[0]
    assert call["system"] == load_prompt("conversation-v1")
    assert call["messages"][-1]["role"] == "user"
    assert "food in spring" in call["messages"][-1]["content"]
    assert call["model"].startswith("global.anthropic.claude-sonnet-4-5")
    assert result["assistant_text"]
    assert "secret" not in str(call["messages"])


def test_conversation_fails_closed_to_respond_on_malformed_model_decision():
    fake = FakeClient()

    async def malformed_create(**kwargs):
        return SimpleNamespace(content=[SimpleNamespace(type="text", text="not json")])

    fake.messages.create = malformed_create
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
    context = TurnContext(traveler_scope="traveler-1", plan_id="plan-1")

    result = asyncio.run(
        adapter.complete_conversation(message="food", context=context, authorization_token="secret")
    )

    assert result["decision"] == "respond"
    assert result["assistant_text"] == "not json"
