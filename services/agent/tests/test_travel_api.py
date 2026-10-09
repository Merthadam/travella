from uuid import uuid4
from fastapi.testclient import TestClient
from services.agent.app import create_app
from services.auth.contracts import ValidatedIdentity


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
