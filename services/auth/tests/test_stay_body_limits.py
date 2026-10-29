"""Reservation bodies fit the cookie proxy without widening unrelated endpoints."""
import json
from unittest.mock import Mock

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from services.auth.agent_client import AgentClient
from services.auth.api import create_app
from services.auth.session_store import SessionStore
from services.auth.tests.test_crud_client import (
    CREDENTIALS, HEADERS, ORIGIN, gateway, login, system, write_headers,
)
from services.crud.tests.test_stay_reservation import reservation_payload

PLAN = "00000000-0000-4000-8000-000000000001"


def test_multiroom_confirmation_passes_cookie_proxy_and_persists(gateway):
    login(gateway)
    plan = gateway.client.post("/v1/plans", json={}, headers=write_headers(gateway.system)).json()
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = reservation_payload()
    document = payload["snapshot"]["components"]["accommodation"]["mockBooking"]["reservation"]
    document["terms"] = "Provider terms. " * 700
    for room in document["rooms"]:
        room["cancellation"] = "Cancellation policy. " * 180
    assert 16_384 < len(json.dumps(payload).encode()) < 65_536
    response = gateway.client.post(path + "/challenge", json=payload, headers=write_headers(gateway.system, plan["revision"]))
    assert response.status_code == 200, response.text
    saved = gateway.client.put(path, json=payload, headers=write_headers(gateway.system, plan["revision"], response.json()["challenge"]))
    assert saved.status_code == 200, saved.text
    assert gateway.client.get(path).json()["snapshot"] == payload["snapshot"]
    assert gateway.system.client.get(path).json()["snapshot"] == payload["snapshot"]


@pytest.mark.parametrize("method,path,size", [
    ("POST", f"/v1/plans/{PLAN}/canvas/challenge", 65_536),
    ("PUT", f"/v1/plans/{PLAN}/canvas", 65_536),
    ("POST", f"/v1/agent/plans/{PLAN}/travel/sandbox/prebook", 65_536),
    ("POST", f"/v1/agent/plans/{PLAN}/travel/sandbox/book", 65_536),
    ("POST", f"/v1/agent/plans/{PLAN}/travel/sandbox/status", 65_536),
    ("POST", "/auth/sign-in", 16_384),
    ("PATCH", f"/v1/plans/{PLAN}/title", 16_384),
    ("POST", f"/v1/agent/plans/{PLAN}/travel/hotels/search", 16_384),
    ("POST", f"/v1/agent/plans/{PLAN}/travel/sandbox/flights/status", 16_384),
    ("POST", f"/v1/plans/{PLAN}/canvas/challenge/extra", 16_384),
    ("PATCH", f"/v1/plans/{PLAN}/canvas", 16_384),
])
def test_body_limits_reject_before_forwarding(gateway, method, path, size):
    response = gateway.client.request(method, path, json={"token": "x" * size})
    assert response.status_code == 413
    assert response.json() == {"message": "Request too large."}
    assert gateway.captured == []


@pytest.mark.parametrize("action", ["prebook", "book", "status"])
def test_large_checkout_handle_passes_authenticated_proxy(system, tmp_path, action):
    provider = Mock()
    provider.sign_in.return_value = {"AuthenticationResult": {"AccessToken": system.token, "RefreshToken": "fixture-refresh"}}
    provider.get_user.return_value = {"UserAttributes": [
        {"Name": "sub", "Value": "traveler-one"},
        {"Name": "email_verified", "Value": "true"},
        {"Name": "email", "Value": CREDENTIALS["email"]},
    ]}
    captured = []

    def upstream(request):
        captured.append(request)
        return httpx.Response(200, json={
            "sandbox": True, "status": "pending", "token": "fixture-receipt",
            "hotel_name": "Test stay", "check_in": "2027-05-12", "check_out": "2027-05-17",
            "room_count": 2, "total": {"amount": "400", "currency": "EUR"},
            "room": {"id": "room", "name": "Twin", "total": {"amount": "400", "currency": "EUR"}},
        })

    store = SessionStore(str(tmp_path / "large-receipt-session.db"), Fernet.generate_key().decode())
    app = create_app(provider, system.verifier, store, origin=ORIGIN,
                     agent_client=AgentClient("https://agent.test", transport=httpx.MockTransport(upstream)))
    with TestClient(app, base_url=ORIGIN, headers=HEADERS) as client:
        assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 200
        payload = {"token": "x" * 40_000}
        if action == "book":
            payload.update(confirm_mock=True, guests=[{"first_name": "Alex", "last_name": "Tester"}])
        result = client.post(f"/v1/agent/plans/{PLAN}/travel/sandbox/{action}", json=payload)
        assert result.status_code == 200, result.text
        assert result.json()["status"] == "pending"
        assert len(captured) == 1
        assert json.loads(captured[0].content) == payload
        assert not captured[0].url.query
    store.close()
