"""Browser gateway exposes research reads and reviewed choices, never worker writes."""
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException

from services.auth.crud_client import CrudClient


def snapshot(plan_id):
    return {"plan_id": plan_id, "topic": "stays", "revision": 1, "brief": {}, "messages": [],
            "notes": {"items": [], "covered_through_sequence": 0, "incomplete": True}}


def test_gateway_topic_route_and_history_query_are_allowed():
    plan_id = str(uuid4())
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=[] if request.url.path.endswith("messages") else snapshot(plan_id))
    client = CrudClient("http://crud", transport=httpx.MockTransport(handler))
    status, value = client.request("GET", f"/v1/plans/{plan_id}/travel/stays", token="test", headers={}, params={}, body=b"")
    assert status == 200 and value["topic"] == "stays"
    status, value = client.request("GET", f"/v1/plans/{plan_id}/conversation/messages", token="test", headers={}, params={"topic": "stays", "limit": "12", "subject": "forged"}, body=b"")
    assert status == 200 and value == []
    assert dict(requests[-1].url.params) == {"topic": "stays", "limit": "12"}


@pytest.mark.parametrize("suffix,method", [("run", "POST"), ("", "POST"), ("choices", "GET"), ("choices/challenge", "GET")])
def test_gateway_rejects_internal_runs_and_wrong_methods(suffix, method):
    path = f"/v1/plans/{uuid4()}/travel/stays" + ("/" + suffix if suffix else "")
    client = CrudClient("http://crud", transport=httpx.MockTransport(lambda request: pytest.fail("must not forward")))
    with pytest.raises(HTTPException) as error:
        client.request(method, path, token="test", headers={}, params={}, body=b"{}")
    assert error.value.status_code in (404, 405)


def test_gateway_forwards_exact_choice_confirmation_headers():
    plan_id = str(uuid4())
    def handler(request):
        assert request.headers["if-match"] == "3"
        assert request.headers["idempotency-key"] == "request"
        assert request.headers["x-plan-challenge"] == "challenge"
        assert "cookie" not in request.headers
        return httpx.Response(200, json=snapshot(plan_id))
    client = CrudClient("http://crud", transport=httpx.MockTransport(handler))
    status, _ = client.request("POST", f"/v1/plans/{plan_id}/travel/stays/choices", token="test",
        headers={"if-match": "3", "idempotency-key": "request", "x-plan-challenge": "challenge", "cookie": "private"}, params={}, body=b"{}")
    assert status == 200
