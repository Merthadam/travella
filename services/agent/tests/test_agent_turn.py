from __future__ import annotations

import asyncio

import pytest

from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanRunStore, ProcessReceiptCache
from services.agent.turn import TurnContext
from services.crud.tests.test_api import system, create


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
    profile = context.bounded().traveler_profile
    assert profile == {"departure_base": "Budapest", "food_needs": "Peanut allergy"}


def test_agentcore_profile_reaches_conversation_ephemerally_not_graph_state():
    class Model:
        context = None

        async def complete_conversation(self, *, message, context, authorization_token, **kwargs):
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
        context_reader=ContextReader(), graph=graph,
        runs=PlanRunStore(), receipts=ProcessReceiptCache(), memory=Memory(),
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
        context_reader=ContextReader(), graph=graph,
        runs=PlanRunStore(), receipts=ProcessReceiptCache(), memory=Memory(),
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
        context_reader=ContextReader(), graph=graph,
        runs=PlanRunStore(), receipts=ProcessReceiptCache(), memory=Memory(),
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
                               context_reader=ContextReader(), graph=Graph(),
                               runs=PlanRunStore(), receipts=ProcessReceiptCache(), memory=Memory())
    response = asyncio.run(service.handle(AgentRequest(plan_id=plan_id, event_id="cleared", message="A weekend trip"),
                                          "verified-subject", "Bearer access-token"))
    assert response.status == "needs your input"


@pytest.mark.parametrize('explicit_stop',[False,True])
@pytest.mark.parametrize('cancel_consumer',[False,True])
def test_disconnect_cancels_once_and_releases_real_crud_lease_before_retry(system,explicit_stop,cancel_consumer):
    """Repeated disconnect polling must not cancel the cancellation cleanup."""
    from fastapi import HTTPException
    plan=create(system);pid=plan['plan_id']
    endpoint=f'/v1/plans/{pid}/research-context'
    async def run():
        started=asyncio.Event();releasing=asyncio.Event();release=asyncio.Event()
        polled=asyncio.Event();cleanup_cancelled=asyncio.Event()
        disconnected=False;checks=0;first=True
        class Reader:
            async def context(self,*args): return {'revision':1,'messages':[]}
            async def append(self,*args,**kwargs): pass
            async def context_run(self,plan_id,token,**payload):
                if payload['action']=='cancel' and payload['event_id']=='stopped':
                    releasing.set()
                    try: await release.wait()
                    except asyncio.CancelledError: cleanup_cancelled.set();raise
                response=system.client.post(endpoint+'/run',json=payload)
                if response.status_code!=200: raise HTTPException(response.status_code,response.json())
                return response.json()
        class Graph:
            async def invoke(self,state,**kwargs):
                nonlocal first
                if first:
                    first=False;started.set();await asyncio.Event().wait()
                return {'projection':{'status':'needs your input','plan_id':pid,'event_id':state['event_id'],
                    'generation':state['generation'],'assistant_text':'What exact dates should I use?'}}
        service=AgentTurnService(plan_reader=lambda *_:{'lifecycle':'active'},context_reader=Reader(),
            graph=Graph(),runs=PlanRunStore(),receipts=ProcessReceiptCache())
        async def connection():
            nonlocal checks
            if disconnected and releasing.is_set():
                checks+=1
                if checks>=3:polled.set()
            return disconnected
        async def consume():return [event async for event in service.stream(AgentRequest(plan_id=pid,event_id='stopped',message='Find travel'),'traveler-one','Bearer test',is_disconnected=connection)]
        task=asyncio.create_task(consume());await started.wait()
        assert system.client.get(endpoint).json()['locked']
        if explicit_stop:assert await service.cancel('traveler-one',pid,'stopped')
        disconnected=True
        await asyncio.wait_for(releasing.wait(),2)
        await asyncio.wait_for(polled.wait(),2)
        worker=service._active_streams[('traveler-one',pid,'stopped')]['task']
        if cancel_consumer:
            task.cancel()
            # The outer stream may be cancelled again by ASGI teardown while its
            # shielded worker is still releasing the lease.
            task.get_loop().call_soon(task.cancel)
            with pytest.raises(asyncio.CancelledError): await task
        release.set()
        if not cancel_consumer: await asyncio.wait_for(task,2)
        await asyncio.wait_for(asyncio.shield(worker),2)
        assert not cleanup_cancelled.is_set()
        assert system.client.get(endpoint).json()['locked'] is False
        response=await service.handle(AgentRequest(plan_id=pid,event_id='retry',message='Find travel'),'traveler-one','Bearer test')
        assert response.status=='needs your input' and response.generation==2
        assert system.client.get(endpoint).json()['locked'] is False
        assert not service._active_streams
    asyncio.run(run())
