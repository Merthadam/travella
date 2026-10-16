"""Model-driven Canvas tools: scripted SDK transport, real HTTP/graph/MCP/SSE.

These fixtures supply explicit model tool calls, never run the old language
parser. Live-model interpretation is exercised separately in browser evidence.
"""
import asyncio
from copy import deepcopy
import json
from types import SimpleNamespace

import pytest
from claude_agent_sdk import ResultMessage
from fastapi.testclient import TestClient
from mcp.types import CallToolRequest, CallToolRequestParams

from services.agent.claude.canvas_travel_tools import CanvasTravelTools
from services.agent.claude.runtime import ClaudeSdkRuntime
from services.agent.config import ResearchWorkerConfig
from services.agent.turn import TurnContext
from services.crud.canvas import CanvasSnapshot
from services.agent.tests.test_canvas_travel import (
    Conversation, Provider, Transport, START, END, components, context, make_app, post, terminal, bundles,
)


def stay_args():
    return {'criteria': {'destination': {'city': 'Obertauern', 'country_code': 'AT'},
        'check_in': START, 'check_out': END, 'rooms': [{'adults': 2, 'children_ages': []}],
        'guest_nationality': 'HU', 'currency': 'EUR'}, 'dates': {'source': 'canvas'}}


def flight_args():
    return {'criteria': {'origin':'BUD','destination':'LIS','departure_date':START,'return_date':END,
        'adults':3,'children_ages':[],'infant_ages':[],'country_code':'HU','currency':'EUR','cabin_class':'ECONOMY'},
        'dates':{'source':'canvas'}}


def semantic_app(monkeypatch, steps, *, history=None, provider=None):
    calls=[]
    async def query(*, prompt, options, transport):
        payload=json.loads(prompt);calls.append(payload)
        assert 'travel_search_readiness' not in payload
        assert 'ALWAYS available' in options.system_prompt
        guard=options.hooks['PreToolUse'][0].hooks[0]
        assert await guard({'tool_name':'mcp__travel__search_stays','tool_input':stay_args()},'',None)=={}
        assert await guard({'tool_name':'mcp__travel__sandbox/book','tool_input':{}},'',None)!={}
        step=steps[len(calls)-1]
        server=options.mcp_servers['travel']['instance']
        selected=[]
        for name, arguments in step.get('tools', []):
            result=await server.request_handlers[CallToolRequest](CallToolRequest(method='tools/call',params=CallToolRequestParams(name=name,arguments=arguments)))
            wire=result.root.model_dump()
            assert not wire.get('isError'),wire
            data=json.loads(wire['content'][0]['text'])
            if 'search_id' in data:
                selected.append({'search_id':data['search_id'],'mode':data['mode'],'option_ids':[v['id'] for v in data['options'][:3]]})
        yield ResultMessage(subtype='success',duration_ms=1,duration_api_ms=1,is_error=False,num_turns=1,session_id='fixture',total_cost_usd=0.01,
            structured_output={'answer':step['answer'],'needs_input':step.get('needs_input',False),
                'suggestions':[],'add_ids':[],'addition_quote':'','travel':selected})
    def runtime(*args, **kwargs):
        config=ResearchWorkerConfig(api_key='sk-ant-test-only-no-network')
        return SimpleNamespace(config=config,worker=ClaudeSdkRuntime(config,query_fn=query,transport_factory=Transport))
    monkeypatch.setattr('services.agent.tests.test_canvas_travel.runtime',runtime)
    result=make_app(monkeypatch,provider=provider,context_reader=history)
    return result,calls


def test_bare_city_and_natural_room_reply_keep_model_and_tools_available(monkeypatch):
    history=Conversation();history.messages=[
        {'role':'user','content':'okay can you show me some accomodations in obertauern?'},
        {'role':'assistant','content':'Which city and country should I search? Reply destination: city, country.'},
    ]
    steps=[{'answer':'Are you both adults sharing one room?', 'needs_input':True},
        {'tools':[('search_stays',stay_args())], 'answer':'I found these stays in Obertauern for your dates.'}]
    (app,pid,plan,provider,_,compiled),model_calls=semantic_app(monkeypatch,steps,history=history)
    draft=components();draft['map']['destination']='Obertauern';before=deepcopy(draft)
    with TestClient(app) as c:
        first=post(c,pid,draft,'obertauern')
        assert terminal(first)['status']=='needs your input' and not provider.calls
        assert 'Are you both adults sharing one room?' in first.text
        second=post(c,pid,draft,'yes we are both adults sharing one room')
    assert terminal(second)['status']=='complete',second.text
    assert len(model_calls)==2
    assert model_calls[0]['current_message']=='obertauern'
    assert model_calls[1]['conversation_history'][-2:]==[
        {'role':'user','content':'obertauern'}, {'role':'assistant','content':steps[0]['answer']}]
    snap=bundles(second)[0]
    assert snap['criteria']['destination']['country_code']=='AT'
    assert snap['criteria']['rooms']==[{'adults':2,'children_ages':[]}]
    assert snap['criteria']['check_in']==START and len(snap['preview_ids'])==3
    assert 'I found these stays' in second.text and 'Here are stays options' not in second.text
    assert 'PRIVATE_' not in second.text
    assert draft==before and plan['revision']==1 and compiled[-1]['state_changes']==[]
    assert 'search_id' not in json.dumps(compiled)


@pytest.mark.parametrize('message', ['obertauern','somewhere to sleep near the slopes','both adults please','yes please'])
def test_tool_call_does_not_require_a_keyword_or_label(monkeypatch,message):
    (app,pid,_,provider,_,_),calls=semantic_app(monkeypatch,[{
        'tools':[('search_stays',stay_args())],'answer':'Here are the options for your stay.'}])
    with TestClient(app) as c: response=post(c,pid,message=message)
    assert terminal(response)['status']=='complete' and len(bundles(response))==1
    assert len(calls)==1 and len(provider.calls)==2


@pytest.mark.parametrize('message', ['cancel','thanks','tell me about skiing'])
def test_conversation_can_reply_without_search(monkeypatch,message):
    (app,pid,_,provider,_,_),calls=semantic_app(monkeypatch,[{'answer':'We can continue talking about skiing.'}])
    with TestClient(app) as c: response=post(c,pid,message=message)
    assert terminal(response)['status']=='complete' and not provider.calls and not bundles(response)
    assert calls[0]['current_message']==message


@pytest.mark.parametrize('mode', ['stays','flights'])
def test_structured_model_search_reaches_provider_and_observed_preview(monkeypatch,mode):
    args=stay_args() if mode=='stays' else flight_args()
    (app,pid,_,provider,_,_),_=semantic_app(monkeypatch,[{'tools':[(f'search_{mode}',args)],'answer':'These are the returned options.'}])
    with TestClient(app) as c: response=post(c,pid,message='yes, those details are right')
    assert terminal(response)['status']=='complete'
    snap=bundles(response)[0]
    assert snap['mode']==mode and len(snap['preview_ids'])==3
    assert next(a for _,a,_ in provider.calls if a['action'].endswith('/search'))['criteria']==snap['criteria']


@pytest.mark.parametrize('case', ['missing_dates','no_year','reversed','past','missing_rooms','missing_country','bad_country','missing_nationality','extra_identity','wrong_draft_dates','no_quotes','assistant_quotes','invented_quotes'])
def test_invalid_model_inputs_never_reach_provider(case):
    async def run():
        args=stay_args();draft=components();ctx=context([{'role':'assistant','content':f'{START} to {END}'}])
        if case=='missing_dates': del args['criteria']['check_in']
        if case=='no_year': args['criteria']['check_in']='Feb 1'
        if case=='reversed': args['criteria']['check_out']=START
        if case=='past': args['criteria'].update(check_in='2020-01-01',check_out='2020-01-07')
        if case=='missing_rooms': del args['criteria']['rooms']
        if case=='missing_country': del args['criteria']['destination']['country_code']
        if case=='bad_country': args['criteria']['destination']['country_code']='ZZ'
        if case=='missing_nationality': del args['criteria']['guest_nationality']
        if case=='extra_identity': args['traveler_subject']='attacker'
        if case=='wrong_draft_dates': draft['essentials']['dates']['start']='2027-01-01'
        if case in {'no_quotes','assistant_quotes','invented_quotes'}:
            args['dates']={'source':'conversation','quotes':[] if case=='no_quotes' else [f'{START} to {END}' if case=='assistant_quotes' else 'invented dates']}
        provider=Provider();observer=CanvasTravelTools(provider,ctx,'valid',CanvasSnapshot(components=draft),'yes')
        result=await observer.invoke('search_stays',args)
        assert result.get('is_error') and not provider.calls and not observer.snapshots
        assert 'attacker' not in json.dumps(result)
    asyncio.run(run())


def test_explicit_conversation_dates_are_search_only_without_language_parser():
    async def run():
        message='We agreed on the first through seventh of February, 2027.'
        args=stay_args();args['criteria'].update(check_in='2027-02-01',check_out='2027-02-07')
        args['dates']={'source':'conversation','quotes':[message]}
        draft=CanvasSnapshot(components=components());before=draft.model_dump();provider=Provider()
        observer=CanvasTravelTools(provider,context(),'valid',draft,message)
        result=await observer.invoke('search_stays',args)
        assert not result.get('is_error'),result
        assert next(iter(observer.snapshots.values())).search_only_dates
        assert draft.model_dump()==before
    asyncio.run(run())


def test_lookup_does_not_require_room_allocation_or_exact_dates():
    class Lookup(Provider):
        async def call(self,name,args,**scope):
            self.calls.append((name,args,scope))
            return {'status':'ready','provider':'LiteAPI','sandbox':True,'places':[{'place_id':'obertauern','name':'Obertauern','address':'Austria'}]}
    async def run():
        provider=Lookup();observer=CanvasTravelTools(provider,context(),'valid',CanvasSnapshot(components={}), 'obertauern')
        result=await observer.invoke('search_destinations',{'q':'Obertauern','country_code':'AT'})
        assert not result.get('is_error') and provider.calls[0][1]['action']=='places'
        assert observer.snapshots=={}
    asyncio.run(run())

@pytest.mark.parametrize('code', ['LON', 'NYC', 'ZZZ'])
def test_city_or_unknown_airport_is_correctable_before_provider_search(code):
    async def run():
        provider = Provider()
        observer = CanvasTravelTools(provider, context(), 'valid', CanvasSnapshot(components=components()), 'any airport is fine')
        args = flight_args(); args['criteria']['destination'] = code
        result = await observer.invoke('search_flights', args)
        error = json.loads(result['content'][0]['text'])
        assert error['error'] == 'airport_selection_required'
        assert error['detail']['fields'] == ['destination']
        assert provider.calls == [] and observer.counts['flights'] == 0
        # Model can correct its city code without another user turn.
        result = await observer.invoke('search_flights', flight_args())
        assert not result.get('is_error') and len(observer.snapshots) == 1
    asyncio.run(run())


@pytest.mark.parametrize('code', ['provider_timeout', 'provider_response_invalid', 'provider_unavailable', 'PRIVATE_RAW_PROVIDER_ERROR'])
def test_failure_codes_are_actionable_and_sanitized_and_new_turn_can_retry(code):
    class Failing(Provider):
        async def call(self, name, args, **scope):
            if args['action'] == 'flights/search':
                self.calls.append((name, args, scope))
                return {'status': 'unavailable', 'code': code, 'message': 'PRIVATE_PROVIDER_RESPONSE'}
            return await super().call(name, args, **scope)
    async def run():
        provider = Failing()
        for message in ['search flights', 'can you retry or alter the search']:
            observer = CanvasTravelTools(provider, context(), 'valid', CanvasSnapshot(components=components()), message)
            result = await observer.invoke('search_flights', flight_args())
            error = json.loads(result['content'][0]['text'])
            assert error['error'] == (code if code.startswith('provider_') else 'provider_unavailable')
            assert 'new traveler request' in error['instruction']
            assert 'PRIVATE' not in json.dumps(result) and not observer.snapshots
            before = len(provider.calls)
            assert (await observer.invoke('search_flights', flight_args())).get('is_error')
            assert len(provider.calls) == before  # no automatic retry on failure
        assert len([c for c in provider.calls if c[1]['action'] == 'flights/search']) == 2
    asyncio.run(run())


def test_flight_timeout_allows_connector_latency_but_respects_turn_deadline(monkeypatch):
    import time
    timeouts = []
    original = asyncio.timeout
    def timeout(seconds):
        timeouts.append(seconds)
        return original(seconds)
    monkeypatch.setattr(asyncio, 'timeout', timeout)
    async def run():
        observer = CanvasTravelTools(Provider(), context(), 'valid', CanvasSnapshot(components=components()), 'search', deadline=time.monotonic() + 300)
        result = await observer.invoke('search_flights', flight_args())
        assert not result.get('is_error')
        assert timeouts == [45, 120]
        timeouts.clear()
        observer = CanvasTravelTools(Provider(), context(), 'valid', CanvasSnapshot(components=components()), 'search', deadline=time.monotonic() + 30)
        await observer.invoke('search_flights', flight_args())
        assert all(0 < seconds <= 25 for seconds in timeouts)
    asyncio.run(run())
