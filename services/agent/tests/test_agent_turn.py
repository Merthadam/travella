from __future__ import annotations

import asyncio

import pytest

from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanCandidateStore, ProcessReceiptCache
from services.agent.state.contracts import ResearchDecision
from services.agent.turn import TurnContext


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
        "food_needs": "Peanut allergy", "travel_interests": "Museums", "accessibility_needs": "",
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


@pytest.mark.parametrize("timestamp", ["old-version", "current-version"])
def test_plan_turn_canonical_clears_beat_stale_mirror_even_with_matching_timestamp(timestamp):
    from services.shared.traveler_profile import profile_context
    plan_id = "00000000-0000-0000-0000-000000000126"
    current = {"departure_base": "Vienna", "home_city": {"name": "Vienna", "country_code": "AT", "source": "manual", "address": "Private address"},
               "default_airport": None, "citizenships": [], "food_needs": "", "accessibility_needs": "",
               "interest_ids": [], "custom_interests": [], "travel_interests": "", "updated_at": "current-version",
               "email": "private@example.test", "onboarding": {"completed_version": 2}, "_account_events": {"private": {}}}
    class ContextReader:
        async def context(self, plan_id, token):
            return {"revision": 1, "brief": {"destination": "Confirmed Lisbon"}}
        async def profile(self, token):
            return current
        async def append(self, *args, **kwargs):
            return None
    class Memory:
        enabled = True
        async def retrieve_relevant_memory(self, subject, topic):
            return {**current, "updated_at": timestamp, "default_airport": "BUD", "citizenships": ["HU"],
                    "food_needs": "Vegan", "accessibility_needs": "Step-free", "interest_ids": ["hiking"],
                    "custom_interests": ["Quiet walks"], "travel_interests": "Hiking, Quiet walks"}
    class Graph:
        async def invoke(self, state, *, traveler_profile, **kwargs):
            assert traveler_profile == profile_context(current)
            assert state["brief"] == {"destination": "Confirmed Lisbon"}
            assert "traveler_profile" not in state
            return {"projection": {"status": "needs your input", "plan_id": plan_id,
                    "event_id": state["event_id"], "generation": state["generation"], "assistant_text": "What dates work?"}}
    service = AgentTurnService(plan_reader=lambda *args: {"lifecycle": "active", "revision": 1},
                               context_reader=ContextReader(), graph=Graph(), tools=object(),
                               candidates=PlanCandidateStore(), receipts=ProcessReceiptCache(), memory=Memory())
    response = asyncio.run(service.handle(AgentRequest(plan_id=plan_id, event_id="cleared", message="A weekend trip"),
                                          "verified-subject", "Bearer access-token"))
    assert response.status == "needs your input"






def test_research_decision_accepts_only_bounded_answer_or_targeted_refinement():
    answer = ResearchDecision.parse(
        '{"action":"answer","answer":"Supported fact.","query":null,"gap":null,'
        '"evidence_ids":["source-1"],"uncertainty":["One detail is unknown."]}',
        evidence_ids={"source-1"},
    )
    refine = ResearchDecision.parse(
        '{"action":"refine","answer":null,"query":"Spain rail pass dates",'
        '"gap":"The page does not state current validity dates.",'
        '"evidence_ids":["source-1"],"uncertainty":[]}',
        evidence_ids={"source-1"},
    )

    assert answer and answer.action == "answer"
    assert refine and refine.action == "refine" and refine.query == "Spain rail pass dates"


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        '{"action":"tool","answer":"x","query":null,"gap":null,"evidence_ids":[],"uncertainty":[]}',
        '{"action":"answer","answer":"x","query":null,"gap":null,"evidence_ids":["foreign"],"uncertainty":[]}',
        '{"action":"refine","answer":null,"query":" ","gap":"gap","evidence_ids":[],"uncertainty":[]}',
        '{"action":"refine","answer":null,"query":"' + ("x" * 301) + '","gap":"gap","evidence_ids":[],"uncertainty":[]}',
    ],
)
def test_research_decision_rejects_malformed_unknown_or_oversized_output(raw):
    assert ResearchDecision.parse(raw, evidence_ids={"source-1"}) is None
