from uuid import uuid4
from fastapi.testclient import TestClient
from services.agent.app import create_app
from services.auth.contracts import ValidatedIdentity


def test_manual_stay_registry_preserves_multi_rule_cancellation_terms():
    from services.agent.claude.canvas_travel import safe_stay
    terms = 'From 2027-05-10 12:00 UTC: 123.00 EUR cancellation penalty. ' * 8
    result = safe_stay({'id': 'h1', 'hotel_id': 'h1', 'name': 'Test hotel',
        'price': {'amount': '200', 'currency': 'EUR', 'basis': 'stay'},
        'rooms': [{'id': 'r1', 'name': 'Twin', 'total': {'amount': '200', 'currency': 'EUR'},
                   'cancellation_summary': terms}]})
    assert result.rooms[0].cancellation_summary == terms


class Travel:
    def __init__(self):
        self.calls = []

    async def call(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return {
            "provider": "LiteAPI",
            "sandbox": True,
            "hotels": True,
            "flights": True,
            "secret": "OMIT_ME",
        }


def test_owned_plan_auth_runtime_and_projection():
    pid = str(uuid4())
    travel = Travel()
    plan = {"lifecycle": "active", "traveler_subject": "owner"}

    def verifier(token):
        if token != "valid":
            raise ValueError()
        return ValidatedIdentity(
            "owner", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
        )

    def read(subject, plan_id, token):
        return plan if str(plan_id) == pid else None

    app = create_app(verifier=verifier, plan_reader=read, adapter=object(), travel_client=travel)
    path = f"/v1/agent/plans/{pid}/travel/capabilities"
    headers = {"Authorization": "Bearer valid"}
    with TestClient(app) as c:
        assert c.get(path).status_code == 401
        assert c.get(path.replace(pid, str(uuid4())), headers=headers).status_code == 404
        assert travel.calls == []
        plan["traveler_subject"] = "other"
        assert c.get(path, headers=headers).status_code == 404
        plan["traveler_subject"] = "owner"
        plan["lifecycle"] = "deleted"
        assert c.get(path, headers=headers).status_code == 404
        plan["lifecycle"] = "active"
        r = c.get(path, headers=headers)
        assert r.status_code == 200 and "OMIT_ME" not in r.text
        assert travel.calls[-1][1]["subject"] == "owner"
        r = c.post(
            "/invocations",
            headers=headers,
            json={
                "operation": "travel",
                "payload": {"plan_id": pid, "action": "capabilities", "criteria": {}},
            },
        )
        assert r.status_code == 200 and r.json()["sandbox"]
        count = len(travel.calls)
        assert (
            c.post(
                path.replace("capabilities", "hotels/search"),
                headers=headers,
                json={"guest_nationality": "SECRET"},
            ).status_code
            == 422
        )
        assert len(travel.calls) == count
        assert (
            c.post(path.replace("capabilities", "book"), headers=headers, json={}).status_code
            == 404
        )


def test_places_owned_plan_and_validation_before_provider_calls():
    pid = str(uuid4())
    calls = []

    class Places:
        async def call(self, *args, **kwargs):
            calls.append((args, kwargs))
            return {
                "provider": "LiteAPI",
                "sandbox": True,
                "status": "ready",
                "places": [
                    {
                        "place_id": "vienna-place",
                        "name": "Wien",
                        "address": "Austria",
                        "secret": "PRIVATE",
                    }
                ],
            }

    def verifier(token):
        if token != "valid":
            raise ValueError()
        return ValidatedIdentity(
            "owner", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
        )

    plan = {"lifecycle": "active", "traveler_subject": "owner"}
    app = create_app(
        verifier=verifier, plan_reader=lambda *args: plan, adapter=object(), travel_client=Places()
    )
    path = f"/v1/agent/plans/{pid}/travel/places"
    headers = {"Authorization": "Bearer valid"}
    with TestClient(app) as c:
        assert c.get(path, params={"q": "Wien", "country_code": "AT"}).status_code == 401
        plan["traveler_subject"] = "someone-else"
        assert (
            c.get(path, headers=headers, params={"q": "Wien", "country_code": "AT"}).status_code
            == 404
        )
        plan["traveler_subject"] = "owner"
        assert (
            c.get(path, headers=headers, params={"q": "Wien", "country_code": "XX"}).status_code
            == 422
        )
        assert not calls
        r = c.get(path, headers=headers, params={"q": "Wien", "country_code": "AT"})
        assert r.status_code == 200 and r.json()["places"][0]["name"] == "Wien"
        assert "PRIVATE" not in r.text and len(calls) == 1


def test_sandbox_http_flow_auth_validation_and_readback():
    from services.mcps.tests.test_sandbox_checkout import Supplier
    from services.mcps.liteapi import LiteApi
    from services.mcps.tests.test_liteapi import HOTEL
    import httpx
    supplier = Supplier()
    pid = str(uuid4())
    plan = {'lifecycle':'active','traveler_subject':'owner'}
    class Connector:
        async def call(self, name, arguments, **scope):
            api = LiteApi('sand_TEST', scope=(scope['subject'],scope['plan_id']), transport=httpx.MockTransport(supplier))
            return await api.call(arguments['action'],arguments['criteria'])
    def verifier(token):
        if token != 'valid': raise ValueError()
        return ValidatedIdentity('owner','client',frozenset({'aws.cognito.signin.user.admin'}),1,9999999999)
    app=create_app(verifier=verifier,plan_reader=lambda subject, plan_id, token: plan if str(plan_id)==pid else None,adapter=object(),travel_client=Connector())
    h={'Authorization':'Bearer valid'};root=f'/v1/agent/plans/{pid}/travel/'
    with TestClient(app) as c:
        for action in ['sandbox/prebook','sandbox/book','sandbox/status']:
            assert c.post(root+action,json={}).status_code==401
            assert c.post(root.replace(pid,str(uuid4()))+action,json={},headers=h).status_code==404
            assert c.get(root+action,headers=h).status_code==404
            assert c.post(root+action,json={},headers=h).status_code==422
        r=c.post(root+'hotels/search',json=HOTEL,headers=h)
        assert r.status_code==200
        token=r.json()['results'][0]['rooms'][0]['checkout_token']
        r=c.post(root+'sandbox/prebook',json={'token':token},headers=h)
        assert r.status_code==200 and r.json()['status']=='review'
        token=r.json()['token']
        body={'token':token,'confirm_mock':True,'guests':[{'first_name':'Test','last_name':'Guest'}]}
        plan['traveler_subject']='other'
        assert c.post(root+'sandbox/book',json=body,headers=h).status_code==404
        plan['traveler_subject']='owner'
        assert not supplier.posts
        r=c.post(root+'sandbox/book',json=body,headers=h)
        assert r.status_code==200 and r.json()['status']=='confirmed'
        r=c.post(root+'sandbox/status',json={'token':token},headers=h)
        assert r.status_code==200 and r.json()['booking_id']=='TEST123'
        assert len(supplier.posts)==1 and 'PRIVATE' not in r.text


def test_flight_services_validate_scope_inputs_and_public_projection():
    from services.agent.travel_contracts import FlightSearch
    from services.mcps.liteapi import normalize_flights
    from services.mcps.tests.test_liteapi import FLIGHT, flight_payload
    pid = str(uuid4())
    calls = []
    flight = normalize_flights(flight_payload(), FlightSearch.model_validate(FLIGHT).model_dump(mode='json'))[0][0]
    class Flights:
        async def call(self, *args, **kwargs):
            calls.append((args, kwargs))
            return {'status': 'ready_to_book', 'token': 'x' * 60, 'flight': flight, 'passenger_count': 2,
                    'services': [{'id': 'seat', 'kind': 'seat', 'label': '12A', 'segment_index': 0, 'passenger_indexes': [0, 1], 'price': {'amount': '12', 'currency': 'EUR'}, 'provider_id': 'PRIVATE'}], 'raw': 'PRIVATE'}
    def verifier(token):
        if token != 'valid': raise ValueError()
        return ValidatedIdentity('owner', 'client', frozenset({'aws.cognito.signin.user.admin'}), 1, 9999999999)
    def read(subject, plan_id, token):
        return {'lifecycle': 'active', 'traveler_subject': 'owner'} if str(plan_id) == pid else None
    app = create_app(verifier=verifier, plan_reader=read, adapter=object(), travel_client=Flights())
    path = f'/v1/agent/plans/{pid}/travel/sandbox/flights/services'
    payload = {'token': 'x' * 60, 'confirm_mock': True, 'selected_services': [{'id': 'seat', 'passenger_index': 0, 'quantity': 1}]}
    headers = {'Authorization': 'Bearer valid'}
    with TestClient(app) as client:
        assert client.post(path, json=payload).status_code == 401
        assert client.post(path.replace(pid, str(uuid4())), json=payload, headers=headers).status_code == 404
        assert client.post(path, json={**payload, 'card_number': '4242'}, headers=headers).status_code == 422
        assert not calls
        result = client.post(path, json=payload, headers=headers)
        assert result.status_code == 200, result.text
        assert result.json()['services'][0]['id'] == 'seat' and 'PRIVATE' not in result.text
        assert calls[0][1]['subject'] == 'owner' and calls[0][1]['plan_id'] == pid


def test_saved_stay_blocks_another_checkout_before_provider_access():
    from fastapi import FastAPI
    from services.agent.travel_routes import register_travel_routes
    from types import SimpleNamespace
    pid=uuid4(); calls=[]
    async def read(*args): return {'lifecycle':'active'}
    async def canvas(*args): return {'snapshot': {'components': {'accommodation': {'mockBooking': {'reference':'OLD'}}}}}
    class Client:
        async def call(self,*args,**kwargs): calls.append(args); raise AssertionError('Provider must not be called')
    app=FastAPI();register_travel_routes(app,lambda:SimpleNamespace(subject='owner'),read,Client(),read_canvas=canvas)
    with TestClient(app) as client:
        for action in ['prebook','book']:
            result=client.post(f'/v1/agent/plans/{pid}/travel/sandbox/{action}',json={'token':'opaque'})
            assert result.status_code==409 and result.json()['code']=='stay_already_booked'
    assert not calls
