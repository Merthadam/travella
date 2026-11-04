import asyncio
import json
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from services.agent.stay_location import resolve_stay_location, rank_location_results, distance_m
from services.agent.travel_routes import register_travel_routes
from services.agent.tests.test_specialist_tools import specialist, args, value
from services.agent.tests.test_canvas_travel import Provider, hotels
from services.mcps.liteapi import LiteApi
from services.mcps.tests.test_liteapi import HOTEL, hotel_payload

PLACES = {'map': {'pins': [
    {'id': 'museum', 'name': 'Museum', 'position': {'lat': 41.9, 'lng': 12.5}, 'category': 'activity'},
    {'id': 'food', 'name': 'Market', 'position': {'lat': 41.91, 'lng': 12.5}, 'category': 'food'},
]}}
LOCATION = {'saved_place_ids': ['museum', 'food', 'museum'], 'matching': 'within_each', 'radius_m': 2000}

async def no_lookup(*args):
    raise AssertionError('Saved places require no provider lookup')

def resolved(location=LOCATION):
    return asyncio.run(resolve_stay_location({**HOTEL, 'location': location}, PLACES, no_lookup))


def test_resolution_replaces_forged_coordinates_deduplicates_and_rejects_foreign_places():
    criteria = resolved({**LOCATION, 'anchors': [{'id': 'museum', 'name': 'Fake', 'source': 'saved_place', 'latitude': 0, 'longitude': 0}]})
    assert criteria['location']['saved_place_ids'] == ['food', 'museum']
    assert [p['name'] for p in criteria['location']['anchors']] == ['Market', 'Museum']
    assert criteria['rooms'] == HOTEL['rooms'] and criteria['check_in'] == HOTEL['check_in']
    with pytest.raises(ValueError, match='location_place_changed'):
        resolved({'saved_place_ids': ['foreign-plan-place']})
    with pytest.raises(ValueError):
        resolved({'saved_place_ids': ['museum'], 'radius_m': 0})


def test_distance_intersection_unknowns_and_equal_weight_ranking():
    assert 111000 < distance_m(0, 0, 1, 0) < 112000
    points = [dict(id='far', latitude=42, longitude=12.5), dict(id='near', latitude=41.905, longitude=12.5), dict(id='unknown')]
    location = resolved()['location']
    assert [p['id'] for p in rank_location_results(points, location)] == ['near']
    location['matching'] = 'prefer_nearby'
    result = rank_location_results(points, location)
    assert [p['id'] for p in result] == ['near', 'far', 'unknown']
    assert result[0]['distance_count'] == 2 and result[-1]['distance_mean_m'] is None
    missing = deepcopy(PLACES); missing['map']['pins'][0]['position'] = {}
    with pytest.raises(ValueError, match='location_unavailable'):
        asyncio.run(resolve_stay_location({**HOTEL, 'location': LOCATION}, missing, no_lookup))


def test_provider_uses_meters_one_rate_query_and_hotel_ids_for_exact_rates():
    requests = []
    def respond(request):
        body = json.loads(request.content); requests.append(body)
        data = hotel_payload(); data['hotels'][0].update(latitude=41.905, longitude=12.5)
        return httpx.Response(200, json=data)
    api = LiteApi('sand_test', transport=httpx.MockTransport(respond))
    criteria = resolved()
    result = asyncio.run(api.call('hotels/search', criteria))
    assert len(requests) == 1 and requests[0]['radius'] == 2000
    assert not {'placeId', 'cityName', 'hotelIds'} & requests[0].keys()
    assert result['results'][0]['distance_count'] == 2 and result['truncated']
    assert result['results'][0]['distance_mean_m'] > 0
    asyncio.run(api.call('hotels/search', {**criteria, 'hotel_id': 'lp1'}))
    assert requests[1]['hotelIds'] == ['lp1'] and 'radius' not in requests[1]
    assert requests[1]['checkin'] == HOTEL['check_in']
    narrow = resolved({**LOCATION, 'radius_m': 100})
    result = asyncio.run(api.call('hotels/search', narrow))
    assert requests[2]['radius'] == 1001 and result['results'] == []


def test_reference_details_support_negative_coordinates_and_scope_does_not_pollute_destinations():
    def respond(request):
        if request.url.path.endswith('/reference'):
            return httpx.Response(200, json={'data': {'displayName': 'Named square', 'location': {'latitude': -33.9, 'longitude': -70.6}}})
        return httpx.Response(200, json={'data': [{'placeId': 'reference', 'displayName': 'Named square', 'types': ['tourist_attraction']}]})
    api = LiteApi('sand_test', transport=httpx.MockTransport(respond))
    assert asyncio.run(api.call('places', {'q': 'Square', 'country_code': 'CL'}))['places'] == []
    assert len(asyncio.run(api.call('places', {'q': 'Square', 'country_code': 'CL', 'scope': 'reference'}))['places']) == 1
    assert asyncio.run(api.call('places/detail', {'place_id': 'reference'}))['place']['longitude'] == -70.6


def test_manual_http_and_agent_share_authoritative_anchors_and_recovery_rejects_changed_geometry():
    app, plan_id = FastAPI(), str(uuid4())
    saved = deepcopy(PLACES)
    class Client(Provider):
        async def call(self, name, arguments, **scope):
            self.calls.append((name, deepcopy(arguments), scope))
            if arguments['action'] == 'capabilities':
                return dict(provider='LiteAPI', sandbox=True, hotels=True, flights=True)
            return hotels(2)
    provider = Client()
    async def identity(authorization: str | None = Header(default=None)):
        if authorization != 'Bearer example': raise HTTPException(401)
        return SimpleNamespace(subject='example')
    async def read_plan(subject, pid, token):
        if str(pid) != plan_id: raise HTTPException(404)
        return {}
    async def read_canvas(pid, token):
        return {'snapshot': {'components': saved}}
    register_travel_routes(app, identity, read_plan, provider, read_canvas)
    with TestClient(app) as client:
        root = f'/v1/agent/plans/{plan_id}/travel/'
        headers = {'Authorization': 'Bearer example'}
        assert client.post(root+'hotels/search', json={**HOTEL, 'location': LOCATION}).status_code == 401
        assert client.post(root.replace(plan_id, str(uuid4()))+'hotels/search', json=HOTEL, headers=headers).status_code == 404
        result = client.post(root+'hotels/search', json={**HOTEL, 'location': LOCATION}, headers=headers)
        assert result.status_code == 200, result.text
        search_id = result.json()['search_id']
        recovered = client.get(root+'research/snapshot', params={'search_id': search_id}, headers=headers)
        assert recovered.status_code == 200
        manual = recovered.json()['criteria']['location']
        observer = specialist(provider=provider)
        observer.draft.components['map']['pins'] = deepcopy(PLACES['map']['pins'])
        request = args(); request['criteria']['location'] = LOCATION
        observed = value(asyncio.run(observer.invoke('search_stays', request)))
        assert observer.snapshots[observed['search_id']].criteria.location.model_dump() == manual
        assert client.post(root+'hotels/search', json={**HOTEL, 'location': {'saved_place_ids': ['other']}}, headers=headers).status_code == 422
        saved['map']['pins'][0]['position']['lat'] = 40
        assert client.get(root+'research/snapshot', params={'search_id': search_id}, headers=headers).status_code == 409


def test_scripted_agent_mentions_only_observed_places_without_plan_or_search_mutation():
    from claude_agent_sdk import ResultMessage
    from services.agent.claude.runtime import ClaudeSdkRuntime
    from services.agent.claude.travel_specialist import ClaudeSdkTravelSpecialist
    from services.agent.config import ResearchWorkerConfig
    from services.agent.tests.test_canvas_travel import Transport, components, context
    config = ResearchWorkerConfig(api_key='test-only-no-network')
    provider = Provider()
    async def query(*, prompt, options, transport):
        payload = json.loads(prompt)
        assert payload['saved_location_places'][0]['id'] == 'museum'
        yield ResultMessage(subtype='success', duration_ms=1, duration_api_ms=1, is_error=False, num_turns=1,
            session_id='scripted', total_cost_usd=0,
            structured_output={'answer': 'The museum is a useful anchor.', 'needs_input': False,
                               'mentioned_place_ids': ['museum', 'museum', 'foreign']})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=provider)
    draft = components(); draft['map']['pins'] = [{**p, 'description': ''} for p in PLACES['map']['pins']]
    before = deepcopy(draft)
    result = asyncio.run(worker.complete(message='Tell me about the museum', context=context(), topic='stays', brief={}, saved_canvas={'components': draft}))
    assert [p['id'] for p in result['travel_specialist_result']['map_mentions']] == ['museum']
    assert result['state_changes'] == [] and provider.calls == [] and draft == before


def test_map_draft_search_is_allowed_but_view_changes_and_forged_dates_are_not():
    from services.agent.travel_workspace import WorkspaceSession, finalize_workspace_view
    from services.travel_topics import WorkspaceView
    async def run():
        observer = specialist()
        observer.draft.components['map']['pins'] = deepcopy(PLACES['map']['pins'])
        observer.stay_draft = await resolve_stay_location({**HOTEL, "location": LOCATION}, PLACES, no_lookup)
        observer.workspace = WorkspaceSession(observer.context.traveler_scope, observer.context.plan_id, 'stays', {'draft_dirty': True, 'view': WorkspaceView().model_dump()})
        assert (await observer.invoke('update_workspace_view', {'search_id': 'old', 'operation': 'sort', 'sort': 'price'}))['is_error']
        found = value(await observer.invoke('search_stays', {'criteria': HOTEL, 'dates': {'source': 'workspace'}}))
        snapshot = observer.snapshots[found['search_id']]
        assert snapshot.criteria.location.saved_place_ids == ['food', 'museum']
        assert not observer.workspace.dirty and finalize_workspace_view(observer.workspace)
        observer.stay_draft['check_in'] = '2000-01-01'
        rejected = await observer.invoke('search_stays', {'criteria': HOTEL, 'dates': {'source': 'workspace'}})
        assert rejected['is_error'] and 'date_evidence_required' in rejected['content'][0]['text']
    asyncio.run(run())
