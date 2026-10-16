"""Research flight requests cross real HTTP, graph, provider gate, SSE and A2UI."""
import asyncio
from copy import deepcopy
import json
import os
from pathlib import Path
import subprocess
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from services.agent.tests.test_canvas_travel import (Conversation, Provider, START, END, make_app, events, terminal)
from services.agent.research_flights import flight_preview_requested, research_flight_draft
from services.agent.turn import TurnContext
from services.agent.checkpoint import safe_checkpoint_state
from services.agent.graph.nodes.conversation import ConversationNode

REQUEST = f'Show flights from BUD to LIS from {START} to {END}; all 3 adults; flight country: HU'


def post(client, pid, message):
    return client.post(f'/v1/agent/plans/{pid}/events/stream', headers={'Authorization':'Bearer valid'},
                       json={'plan_id':pid,'event_id':str(uuid4()),'message':message})


def preview(response):
    return next(e['snapshot']['flight_preview'] for e in events(response)
                if e['type']=='STATE_SNAPSHOT' and 'flight_preview' in e['snapshot'])


@pytest.mark.parametrize('count', [0, 1, 4])
def test_research_provider_projection_and_actual_a2ui(monkeypatch, tmp_path, count):
    history=Conversation()
    app,pid,plan,provider,_,compiled=make_app(monkeypatch,Provider(count),context_reader=history)
    with TestClient(app) as client: response=post(client,pid,REQUEST)
    assert response.status_code==200 and terminal(response)['status']=='complete',response.text
    result=preview(response)
    assert result['criteria']['adults']==3 and result['preview_ids']==[f'flight-{i}' for i in range(min(count,3))]
    assert result['returned_count']==count and result['mode']=='flights'
    assert terminal(response)['generation']==result['generation']
    assert all(args['action'] in {'capabilities','flights/search'} for _,args,_ in provider.calls)
    assert all(scope['plan_id']==pid and scope['authorization_token']=='valid' for _,_,scope in provider.calls)
    assert 'PRIVATE_' not in response.text and 'checkout' not in response.text
    assert 'flight_preview' not in json.dumps(compiled) and 'flight-0' not in json.dumps(compiled)
    assert compiled[-1]['state_changes']==[] and plan['revision']==1
    assert 'flight_preview' not in safe_checkpoint_state({'plan_id':pid,'projection':{'flight_preview':result}})['projection']
    assert all('flight-0' not in item['content'] for item in history.messages)
    if count==4:
        fixture=tmp_path/'research-flight.json'
        fixture.write_text(json.dumps({'plan_id':pid,'message':REQUEST,'sse':response.text,'snapshot':result}))
        run=subprocess.run(['npm','test','--','src/features/plans/travel/ResearchFlights.test.jsx'],cwd=Path('frontend'),
                           env={**os.environ,'TRAVELLA_RESEARCH_SSE_FIXTURE':str(fixture)},capture_output=True,text=True,timeout=90)
        assert run.returncode==0,run.stdout+run.stderr


def test_missing_fields_natural_answers_and_no_destination_confirmation(monkeypatch):
    history=Conversation();app,pid,_,provider,_,_=make_app(monkeypatch,context_reader=history)
    with TestClient(app) as client:
        dates=post(client,pid,'Find flights from BUD to LIS')
        assert 'departure and return dates' in dates.text and not provider.calls
        party=post(client,pid,f'{START} to {END}')
        assert 'How many adults' in party.text and not provider.calls
        country=post(client,pid,'all 3 adults')
        assert 'flight country' in ''.join(e.get('delta','') for e in events(country)) and not provider.calls
        result=post(client,pid,'Hungary')
    assert preview(result)['criteria']['adults']==3
    assert 'confirm' not in result.text.lower()


@pytest.mark.parametrize('message', ['Tell me about Budapest', 'We need flights', "Don't search flights yet", 'Show hotels', 'What is a return flight?', 'cancel'])
def test_general_research_is_not_hijacked(message):
    ctx=TurnContext(traveler_scope='owner',plan_id='plan')
    assert not flight_preview_requested(message,ctx)
    calls=[]
    async def complete(**kwargs):
        calls.append(kwargs['message']);return {'decision':'respond','assistant_text':'Ordinary research','state_changes':[]}
    result=asyncio.run(ConversationNode(SimpleNamespace(complete_conversation=complete))({'message':message,'traveler_scope':'owner','plan_id':'plan'}))
    assert result['assistant_text']=='Ordinary research' and calls==[message]


@pytest.mark.parametrize('source', ['user_edit','user_explicit','agent_inferred','research','memory',None])
def test_only_explicit_research_dates_are_eligible(source):
    context={'dateStart':START,'dateEnd':END,'travelers':3,'provenance': {key:{'source':source} for key in ('dateStart','dateEnd')} if source else {}}
    ctx=TurnContext(traveler_scope='owner',plan_id='plan',trip_context=context)
    draft=research_flight_draft(ctx)
    assert draft.components['essentials']['dates']['start']==(START if source in {'user_edit','user_explicit'} else '')
    assert context['dateStart']==START


def test_unavailable_provider_has_no_preview_and_does_not_retry(monkeypatch):
    class Unavailable(Provider):
        async def call(self,*args,**kwargs):
            self.calls.append(args);raise TimeoutError()
    provider=Unavailable();app,pid,_,_,_,_=make_app(monkeypatch,provider)
    with TestClient(app) as client: response=post(client,pid,REQUEST)
    assert 'couldn’t load flights' in response.text and 'Research chat' in response.text
    assert not any(e.get('snapshot',{}).get('flight_preview') for e in events(response))
    assert len(provider.calls)==1


def test_cancelled_research_never_publishes_inventory(monkeypatch):
    class Waiting(Provider):
        async def call(self,*args,**kwargs): raise asyncio.CancelledError()
    app,pid,_,_,_,_=make_app(monkeypatch,Waiting())
    with TestClient(app) as client: response=post(client,pid,REQUEST)
    assert terminal(response)['status']=='interrupted'
    assert not any(e.get('snapshot',{}).get('flight_preview') for e in events(response))
