"""Focused turns exercise the real graph, authenticated CRUD HTTP and SQL store."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from services.agent.crud_client import CrudContextReader, CrudPlanReader
from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanRunStore, ProcessReceiptCache
from services.crud.tests.test_api import create, system, write_headers  # noqa: F401


def setup_turn(system, monkeypatch, implementation):
    original = httpx.AsyncClient
    monkeypatch.setattr('services.agent.crud_client.httpx.AsyncClient', lambda **kw:
        original(transport=httpx.ASGITransport(app=system.app), **kw))
    from services.agent.graph.nodes.travel_specialist import TravelSpecialistNode
    async def research(self, state):
        return {'result': await implementation(state)}
    monkeypatch.setattr(TravelSpecialistNode, '_research', research)
    return AgentTurnService(plan_reader=CrudPlanReader('http://crud'),
        context_reader=CrudContextReader('http://crud'), graph=AgentGraph(SimpleNamespace(config=object())),
        runs=PlanRunStore(), receipts=ProcessReceiptCache())


def test_specialist_isolation_replay_and_return_projection(system, monkeypatch):
    plan = create(system); pid = plan['plan_id']; seen = []
    async def worker(state):
        seen.append(state)
        assert state['topic'] in ('stays','flights')
        return {'status':'in_progress', 'assistant_text':f"{state['topic']} reply",
                'travel_specialist_result':{'topic':state['topic']}}
    handler = setup_turn(system, monkeypatch, worker)
    async def run():
        req = AgentRequest(plan_id=pid,event_id=str(uuid4()),message='Quiet apartment please',topic='stays')
        a = await handler.handle(req,'traveler-one',f'Bearer {system.token}')
        assert a.status == 'in_progress', a
        assert a.travel_specialist_result.topic == 'stays'
        assert a == await handler.handle(req,'traveler-one',f'Bearer {system.token}')
        with pytest.raises(HTTPException) as exc:
            await handler.handle(req.model_copy(update={'topic':'flights'}),'traveler-one',f'Bearer {system.token}')
        assert exc.value.status_code == 409
        f = await handler.handle(AgentRequest(plan_id=pid,event_id=str(uuid4()),message='Direct flight please',topic='flights'),
                                 'traveler-one',f'Bearer {system.token}')
        assert f.status == 'in_progress', f
        assert all('Quiet apartment' not in m['content'] for m in seen[-1]['context'].recent_messages)
    asyncio.run(run())
    base = f'/v1/plans/{pid}'
    assert system.client.get(base+'/conversation/messages').json() == []
    assert system.client.get(base+'/generation-context').json()['messages'] == []
    stays = system.client.get(base+'/travel/stays').json()
    assert [m['content'] for m in stays['messages']] == ['Quiet apartment please','stays reply']
    assert system.client.get(base+'/research-context').json()['revision'] == 1
    assert len(seen) == 2


def test_sdk_failure_releases_lease_and_preserves_interrupted_user(system, monkeypatch):
    pid = create(system)['plan_id']
    async def broken(state):
        raise RuntimeError('private provider failure')
    handler = setup_turn(system, monkeypatch, broken)
    request = AgentRequest(plan_id=pid,event_id=str(uuid4()),message='A quiet stay',topic='stays')
    result = asyncio.run(handler.handle(request,'traveler-one',f'Bearer {system.token}'))
    assert result.status == 'unable to continue'
    assert 'private provider' not in result.model_dump_json()
    saved = system.client.get(f'/v1/plans/{pid}/travel/stays').json()
    assert saved['locked'] is False
    assert saved['messages'][0]['status'] == 'interrupted'
    assert len(saved['messages']) == 1


def test_stop_releases_shared_lease_without_partial_answer(system, monkeypatch):
    pid = create(system)['plan_id']
    async def run():
        entered = asyncio.Event()
        async def slow(state):
            entered.set()
            await asyncio.Event().wait()
        handler = setup_turn(system,monkeypatch,slow)
        request = AgentRequest(plan_id=pid,event_id=str(uuid4()),message='Compare stays',topic='stays')
        task = asyncio.create_task(handler.handle(request,'traveler-one',f'Bearer {system.token}'))
        await entered.wait(); task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    asyncio.run(run())
    saved = system.client.get(f'/v1/plans/{pid}/travel/stays').json()
    assert saved['locked'] is False
    assert [m['role'] for m in saved['messages']] == ['user']
    assert saved['messages'][0]['status'] == 'interrupted'


def test_stream_projects_authoritative_topic_snapshot(system, monkeypatch):
    pid = create(system)['plan_id']
    async def worker(state):
        return {'status':'needs your input','assistant_text':'Which airport do you prefer?'}
    handler = setup_turn(system,monkeypatch,worker)
    async def run():
        async def connected(): return False
        req=AgentRequest(plan_id=pid,event_id=str(uuid4()),message='Help with flights',topic='flights')
        return ''.join([event async for event in handler.stream(req,'traveler-one',f'Bearer {system.token}',is_disconnected=connected)])
    output=asyncio.run(run())
    assert 'STATE_SNAPSHOT' in output and 'travel_specialist_result' in output
    assert '"topic":"flights"' in output
    assert 'saved_canvas' not in output


@pytest.mark.parametrize('extra', [{'topic':'unknown'}, {'topic':'stays','message':''},
    {'topic':'flights','canvas_action':'generate_plan'}])
def test_focused_request_rejects_invalid_or_mixed_actions(extra):
    with pytest.raises(ValidationError):
        AgentRequest.model_validate({'plan_id':str(uuid4()),'event_id':'e','message':'hello',**extra})
