"""Deterministic provider/SDK edges around the real HTTP → graph → SSE → React path."""
import asyncio
from copy import deepcopy
from datetime import date, timedelta
import json
import os
from pathlib import Path
import subprocess
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from claude_agent_sdk import ResultMessage
from mcp.types import CallToolRequest, CallToolRequestParams

from services.agent.app import create_app
from services.agent.config import ResearchWorkerConfig
from services.agent.claude.runtime import ClaudeSdkRuntime
from services.agent.claude.canvas_travel import CanvasTravelObserver, TravelSelection
from services.agent.graph import AgentGraph
from services.agent.turn import TurnContext
from services.agent.checkpoint import safe_checkpoint_state
from services.auth.contracts import ValidatedIdentity
from services.crud.canvas import CanvasSnapshot


START = (date.today() + timedelta(days=180)).isoformat()
END = (date.today() + timedelta(days=187)).isoformat()
MESSAGE = 'Find stays; 1 room for 2 adults; nationality: HU'


def components():
    travel = dict(status='ready', need='undecided', bookingStatus='not-booked', title='Travel to Lisbon', subtitle='2 travelers', detail='Exact dates', availability='unavailable')
    return dict(essentials=dict(status='ready', dates=dict(start=START, end=END, note='', flexible=False), travelers=2, budget=dict(label='', noFixedBudget=True)),
                map=dict(status='ready', destination='Lisbon, Portugal', final=True, pins=[]),
                themes=dict(status='ready', items=[]), flights=travel.copy(), accommodation=travel.copy(), findings=dict(status='ready', items=[]), links=dict(status='ready', items=[]))


def hotels(count=4):
    return {'provider':'LiteAPI','sandbox':True,'status':'ready' if count else 'empty','searched_at':'2026-10-16T12:00:00Z', 'returned_count':count,'truncated':False,'notices':[],
        'results':[{'id':f'stay-{i}','hotel_id':f'property-{i}','name':f'Observed stay {i}', 'address':'Lisbon',
                    'price':{'amount':str(700+i), 'currency':'EUR', 'basis':'stay','estimated':i==1,'excluded_taxes':[{'name':'City tax','amount':'14','currency':'EUR'}]},
                    'rooms':[{'id':f'room-{i}','name':'Double room','total':{'amount':str(700+i),'currency':'EUR'},'refundable':False,'board_name':'Breakfast included','checkout_token':'PRIVATE_CHECKOUT_SENTINEL'}],
                    'raw_payload':'PRIVATE_RAW_SENTINEL'} for i in range(count)]}


class Provider:
    def __init__(self, count=4): self.calls=[]; self.count=count
    async def call(self, name, args, **scope):
        self.calls.append((name, deepcopy(args), scope))
        assert name=='travel_search' and args['action'] in {'capabilities','places','hotels/search'}
        if args['action']=='capabilities': return dict(provider='LiteAPI',sandbox=True,hotels=True,flights=True)
        return hotels(self.count)


class Transport:
    def __init__(self, **kwargs): self.closed=False
    async def close(self): self.closed=True


def runtime(provider, tool_texts, *, tamper=None):
    config=ResearchWorkerConfig(api_key='sk-ant-test-only-no-network')
    async def query(*, prompt, options, transport):
        assert options.skills == ['canvas-activities','canvas-travel']
        assert options.setting_sources == ['project']
        assert Path(options.cwd, '.claude/skills/canvas-travel/SKILL.md').is_file()
        guard=options.hooks['PreToolUse'][0].hooks[0]
        assert await guard({'tool_name':'mcp__travel__search_stays','tool_input':{}},'',None)=={}
        assert await guard({'tool_name':'mcp__maps__search_places','tool_input':{}},'',None)=={}
        assert await guard({'tool_name':'mcp__travel__sandbox/book','tool_input':{}},'',None)!={}
        server=options.mcp_servers['travel']['instance']
        result=await server.request_handlers[CallToolRequest](CallToolRequest(method='tools/call', params=CallToolRequestParams(name='search_stays',arguments={})))
        wire=result.root.model_dump()
        assert not wire.get('isError'),wire
        payload=json.loads(wire['content'][0]['text']); tool_texts.append(wire)
        selected=[] if 'search_id' not in payload else [{'search_id':payload['search_id'],'mode':'stays','option_ids':[x['id'] for x in payload['options'][:3]]}]
        if tamper: selected=tamper(selected)
        yield ResultMessage(subtype='success',duration_ms=1,duration_api_ms=1,is_error=False,num_turns=1,session_id='fixture',total_cost_usd=0.01,
            structured_output=dict(answer='MODEL_UNGROUNDED_BOOKING_CLAIM',needs_input=False,suggestions=[],add_ids=[],addition_quote='',travel=selected))
    return SimpleNamespace(config=config,worker=ClaudeSdkRuntime(config,query_fn=query,transport_factory=Transport))


def make_app(monkeypatch, provider=None, tamper=None):
    provider=provider or Provider(); texts=[]; pid=str(uuid4()); plan={'lifecycle':'active','traveler_subject':'owner','revision':1}
    monkeypatch.setattr('services.agent.travel_client.TravelClient.call', lambda self,*args,**kwargs: provider.call(*args,**kwargs))
    graph=AgentGraph(runtime(provider,texts,tamper=tamper))
    graph_results=[]
    # Observe actual compiled execution without replacing the graph/node/editor.
    original=graph.compiled.ainvoke
    async def observe(*args,**kwargs):
        value=await original(*args,**kwargs); graph_results.append(deepcopy(value)); return value
    monkeypatch.setattr(graph.compiled,'ainvoke',observe)
    def verifier(token):
        if token!='valid': raise ValueError()
        return ValidatedIdentity('owner','client',frozenset({'aws.cognito.signin.user.admin'}),1,9999999999)
    app=create_app(verifier=verifier,plan_reader=lambda subject,plan_id,token: plan if str(plan_id)==pid else None,graph=graph,adapter=object())
    return app,pid,plan,provider,texts,graph_results


def post(client,pid,draft=None,message=MESSAGE,event=None):
    return client.post(f'/v1/agent/plans/{pid}/events/stream',headers={'Authorization':'Bearer valid'},json={'plan_id':pid,'event_id':event or str(uuid4()),'message':message,'canvas_edit':{'draft':{'components':draft or components()},'suggestions':[],'area':None}})


def events(response): return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
def terminal(response): return next(e for e in events(response) if e['type']=='TERMINAL')
def bundles(response): return next(e['snapshot']['canvas_edit_result']['travel'] for e in events(response) if e['type']=='STATE_SNAPSHOT' and 'canvas_edit_result' in e['snapshot'])


def test_stay_journey_actual_sse_to_react(monkeypatch,tmp_path):
    app,pid,plan,provider,texts,compiled=make_app(monkeypatch)
    original=components(); before=deepcopy(original)
    with TestClient(app) as client: response=post(client,pid,original)
    assert response.status_code==200
    assert terminal(response)['status']=='complete',response.text
    snapshot=bundles(response)[0]
    assert snapshot['preview_ids']==['stay-0','stay-1','stay-2'] and len(snapshot['results'])==4
    assert snapshot['criteria']['check_in']==START and snapshot['results'][0]['rooms'][0]['refundable'] is False
    assert len(provider.calls)==2 and all(c[2]['plan_id']==pid and c[2]['subject']=='owner' for c in provider.calls)
    assert original==before and plan['revision']==1
    for value in [response.text,json.dumps(texts),json.dumps(compiled)]:
        assert 'PRIVATE_CHECKOUT_SENTINEL' not in value and 'PRIVATE_RAW_SENTINEL' not in value
    assert 'MODEL_UNGROUNDED_BOOKING_CLAIM' not in response.text
    assert 'search_id' not in json.dumps(compiled) and compiled[0]['state_changes']==[]
    assert 'search_id' not in json.dumps(safe_checkpoint_state(compiled[0]))
    fixture=tmp_path/'actual-sse.json';fixture.write_text(json.dumps({'sse':response.text,'plan_id':pid,'components':original,'message':MESSAGE}))
    result=subprocess.run(['npm','--prefix','frontend','test','--','src/features/plans/travel/CanvasTravelJourney.test.jsx'],env={**os.environ,'TRAVELLA_CANVAS_SSE_FIXTURE':str(fixture)},capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr


@pytest.mark.parametrize('case',['missing','ambiguous','nationality','rooms','country'])
def test_stay_gate_zero_calls(monkeypatch,case):
    app,pid,_,provider,_,_=make_app(monkeypatch); draft=components(); message=MESSAGE
    if case=='missing': draft['essentials']['dates'].update(start='',end='')
    if case=='ambiguous': message+='; instead in July'
    if case=='nationality': message='Find stays; 1 room for 2 adults'
    if case=='rooms': message='Find stays; nationality: HU'
    if case=='country': draft['map']['destination']='Lisbon'
    with TestClient(app) as c: response=post(c,pid,draft,message)
    assert response.status_code==200 and terminal(response)['status']=='needs your input',response.text
    assert not provider.calls


@pytest.mark.parametrize('case',['foreign','deleted','missing'])
def test_stay_authorization_before_provider(monkeypatch,case):
    app,pid,plan,provider,_,_=make_app(monkeypatch)
    if case=='foreign': plan['traveler_subject']='other'
    if case=='deleted': plan['lifecycle']='deleted'
    if case=='missing': pid=str(uuid4())
    with TestClient(app) as c: response=post(c,pid)
    assert response.status_code==404 and not provider.calls


def test_stay_unknown_selection_rejected(monkeypatch):
    def tamper(values): values[0]['option_ids']=['invented']; return values
    app,pid,_,_,_,_=make_app(monkeypatch,tamper=tamper)
    with TestClient(app) as c: response=post(c,pid)
    assert terminal(response)['status']=='error'
    assert not any(e['type']=='STATE_SNAPSHOT' for e in events(response))


@pytest.mark.parametrize('count',[0,1,2,4])
def test_stay_counts_and_no_padding(monkeypatch,count):
    app,pid,_,_,_,_=make_app(monkeypatch,Provider(count))
    with TestClient(app) as c: response=post(c,pid)
    s=bundles(response)[0]
    assert len(s['results'])==count and len(s['preview_ids'])==min(3,count)
