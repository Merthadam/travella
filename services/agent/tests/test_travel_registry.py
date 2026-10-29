"""Exact manual observations survive handoff, never client-authored offer facts."""
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.agent.tests.test_canvas_travel import Provider, hotels as original_hotels
from services.agent.tests.test_specialist_worker import STAY
from services.agent.travel_registry import TravelRegistry, travel_registry
from services.auth.contracts import ValidatedIdentity
from services.travel_topics import TravelDiscussion


def hotels(*args, **kwargs):
    return {**original_hotels(*args, **kwargs), 'searched_at': datetime.now(UTC).isoformat()}


def test_carrier_metadata_survives_public_safe_registry_roundtrip():
    from services.mcps.tests.test_liteapi import FLIGHT, flight_payload
    from services.mcps.liteapi import normalize_flights
    from services.agent.travel_contracts import Flight
    from services.agent.claude.canvas_travel import FlightSnapshot
    payload = flight_payload()
    carrier = payload['data'][0]['journeys'][0]['segments'][0]['carrier']
    carrier.update(marketingLogo='https://assets.nuitee.flights/airlines/SA.svg', operatingCode='OA', operatingLogo='https://assets.nuitee.flights/airlines/OA.svg')
    results = normalize_flights(payload, FLIGHT)[0]
    public = Flight.model_validate(results[0]).model_dump()
    assert public['outbound']['segments'][0].get('marketing_code') == 'SA'
    registry, pid = TravelRegistry(), str(uuid4())
    observed = (datetime.now(UTC) - timedelta(minutes=3)).isoformat()
    sid = registry.manual('owner', pid, 'flights/search', FLIGHT, dict(results=[public], searched_at=observed, provider='LiteAPI', sandbox=True, truncated=False, notices=[]))
    snap = registry.get('owner', pid, sid)
    restored = FlightSnapshot.model_validate(snap.model_dump())
    segment = restored.results[0].outbound.segments[0]
    assert segment.marketing_logo == carrier['marketingLogo']
    assert segment.operating_code == 'OA'
    assert segment.operating_logo == carrier['operatingLogo']
    assert restored.searched_at == observed
    assert datetime.fromisoformat(restored.expires_at) == datetime.fromisoformat(observed) + timedelta(minutes=10)


def test_registry_scope_room_and_expiry():
    registry = TravelRegistry(limit=1)
    pid = str(uuid4())
    sid = registry.manual('one', pid, 'hotels/search', STAY, hotels())
    discussion = TravelDiscussion(intent='review', options=[dict(search_id=sid, option_id='stay-0', room_id='room-0')])
    snap = registry.resolve('one', pid, 'stays', discussion)[0]
    assert 'PRIVATE' not in snap.model_dump_json()
    for subject, plan, topic in [('other', pid, 'stays'), ('one', str(uuid4()), 'stays'), ('one', pid, 'flights')]:
        with pytest.raises(HTTPException):
            registry.resolve(subject, plan, topic, discussion)
    with pytest.raises(HTTPException):
        registry.resolve('one', pid, 'stays', TravelDiscussion(intent='review', options=[dict(search_id=sid, option_id='stay-0', room_id='not-observed')]))
    snap.expires_at = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
    registry.put('one', pid, snap)
    with pytest.raises(HTTPException):
        registry.resolve('one', pid, 'stays', discussion)
    registry.manual('one', pid, 'hotels/search', STAY, hotels())
    assert len(registry.entries) == 1


@pytest.mark.parametrize("large", [False, True])
def test_manual_search_and_snapshot_through_authenticated_http_and_runtime(large):
    pid = str(uuid4())
    def verifier(token):
        if token != 'valid':
            raise ValueError()
        return ValidatedIdentity('owner', 'client', frozenset({'aws.cognito.signin.user.admin'}), 1, 9999999999)
    def plan(subject, plan_id, token):
        return {'lifecycle': 'active', 'traveler_subject': 'owner'} if str(plan_id) == pid else None
    class SearchProvider(Provider):
        async def call(self, *args, **kwargs):
            result = await super().call(*args, **kwargs)
            result['searched_at'] = datetime.now(UTC).isoformat()
            if large:
                for option in result['results']:
                    room = option['rooms'][0]
                    option['rooms'] = [{**room, 'id': f"rate-{i}", 'name': 'Apartment ' + 'large description ' * 10} for i in range(30)]
            return result
    app = create_app(verifier=verifier, plan_reader=plan, adapter=object(), travel_client=SearchProvider(100 if large else 4))
    headers = {'Authorization': 'Bearer valid'}
    base = f'/v1/agent/plans/{pid}/travel/'
    with TestClient(app) as client:
        found = client.post(base+'hotels/search', json=STAY, headers=headers)
        assert found.status_code == 200, found.text
        sid = found.json()['search_id']
        result = client.get(base+'research/snapshot', params={'search_id': sid}, headers=headers)
        assert result.status_code == 200 and result.json()['criteria']['check_in'] == STAY['check_in']
        assert 'PRIVATE' not in result.text and 'checkout_token' not in result.text
        assert result.json()['results'][0]['rooms'][0]['id'] == ('rate-0' if large else 'room-0')
        assert len(found.json()['results']) == result.json()['returned_count']
        if large:
            assert found.json()['truncated'] and found.json()['returned_count'] < 100
        assert client.get(base+'research/snapshot', params={'search_id': sid}).status_code == 401
        assert client.get(base.replace(pid,str(uuid4()))+'research/snapshot', params={'search_id':sid}, headers=headers).status_code == 404
        runtime = client.post('/invocations', headers=headers, json={'operation':'travel', 'payload':{'plan_id':pid,'action':'research/snapshot','criteria':{'search_id':sid}}})
        assert runtime.status_code == 200, runtime.text
        assert runtime.json()['search_id'] == sid


@pytest.mark.parametrize('city,airport,groups', [('MIL','MXP',{}),('MIL','LIN',{}),('MIL','BGY',{}),('LON','SEN',{'LON':['LHR','SEN']})])
def test_manual_city_airports_survive_authenticated_search_and_snapshot(city, airport, groups):
    from services.mcps.tests.test_liteapi import FLIGHT, flight_payload
    from services.mcps.liteapi import normalize_flights
    payload = flight_payload()
    segments = payload['data'][0]['journeys'][0]['segments']
    segments[0]['destinationCode'] = segments[1]['originCode'] = airport
    criteria = FLIGHT | {'destination': city}
    results = normalize_flights(payload, criteria, city_airports=groups)[0]
    class CityProvider:
        async def call(self, *args, **kwargs):
            return dict(status='ready',provider='LiteAPI',sandbox=True,searched_at=datetime.now(UTC).isoformat(),results=results,returned_count=len(results),truncated=False,notices=[],airport_groups=groups)
    pid = str(uuid4())
    def verifier(token):
        if token != 'valid': raise ValueError()
        return ValidatedIdentity('owner','client',frozenset({'aws.cognito.signin.user.admin'}),1,9999999999)
    app = create_app(verifier=verifier,plan_reader=lambda *args:{'lifecycle':'active','traveler_subject':'owner'},adapter=object(),travel_client=CityProvider())
    with TestClient(app) as client:
        base=f'/v1/agent/plans/{pid}/travel/'
        found=client.post(base+'flights/search',json=criteria,headers={'Authorization':'Bearer valid'})
        assert found.status_code == 200, found.text
        snap=client.get(base+'research/snapshot',params={'search_id':found.json()['search_id']},headers={'Authorization':'Bearer valid'})
        assert snap.status_code == 200
        assert snap.json()['criteria']['destination'] == city
        assert snap.json()['results'][0]['outbound']['segments'][-1]['destination'] == airport
        assert 'checkout_token' not in snap.text


def test_city_membership_cannot_broaden_a_specific_airport_or_accept_unrelated_routes():
    from services.mcps.tests.test_liteapi import FLIGHT, flight_payload
    from services.mcps.liteapi import normalize_flights
    from services.agent.travel_contracts import FlightSearch
    from services.agent.claude.canvas_travel import safe_flight
    flight=normalize_flights(flight_payload(),FLIGHT)[0][0]
    with pytest.raises(ValueError,match='flight_route_mismatch'):
        safe_flight(flight,FlightSearch.model_validate(FLIGHT | {'destination':'MIL'}))
    with pytest.raises(ValueError,match='flight_route_mismatch'):
        safe_flight(flight,FlightSearch.model_validate(FLIGHT | {'destination':'LHR'}),{'LHR':['FCO']})
