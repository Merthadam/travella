"""Cookie -> gateway -> independently verified CRUD -> real database integration."""

import time
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from services.auth.api import create_app
from services.auth.crud_client import CrudClient
from services.auth.session_store import SessionStore
from services.crud.tests.test_api import system, write_headers  # noqa: F401

ORIGIN = "https://travella.test"
HEADERS = {"Origin": ORIGIN, "X-Travella-Request": "1", "Content-Type": "application/json"}
CREDENTIALS = {"email": "travella.local@example.com", "password": "isolated-fixture-password"}


@pytest.fixture
def gateway(system, tmp_path):  # noqa: F811 — imported pytest fixture
    captured = []
    provider = Mock()
    provider.sign_in.return_value = {
        "AuthenticationResult": {"AccessToken": system.token, "RefreshToken": "private-refresh"}
    }
    provider.get_user.return_value = {
        "Username": "canonical-user",
        "UserAttributes": [
            {"Name": "sub", "Value": "traveler-one"},
            {"Name": "email_verified", "Value": "true"},
            {"Name": "email", "Value": "travella.local@example.com"},
        ]
    }
    now = [time.time()]
    store = SessionStore(str(tmp_path / "sessions.db"), Fernet.generate_key().decode())

    def upstream(request):
        captured.append(request)
        result = system.client.request(
            request.method, str(request.url), headers=dict(request.headers), content=request.content
        )
        return httpx.Response(result.status_code, json=result.json())

    adapter = CrudClient("http://crud.test", transport=httpx.MockTransport(upstream))
    app = create_app(
        provider, system.verifier, store, origin=ORIGIN, clock=lambda: now[0], crud_client=adapter
    )
    with TestClient(app, base_url=ORIGIN, headers=HEADERS) as client:
        yield SimpleNamespace(
            client=client, captured=captured, store=store, now=now, system=system, adapter=adapter
        )
    store.close()


def login(gateway):
    response = gateway.client.post("/auth/sign-in", json=CREDENTIALS)
    assert response.status_code == 200
    assert gateway.system.token not in response.text


def test_cookie_forwards_only_server_token_and_lifecycle_persists(gateway, caplog):
    login(gateway)
    client = gateway.client
    cookie = client.cookies.get("__Host-travella")
    response = client.post(
        "/v1/plans",
        json={},
        headers=write_headers(gateway.system)
        | {"Authorization": "Bearer browser-spoof", "X-Traveler-ID": "victim"},
    )
    assert response.status_code == 200
    plan = response.json()
    assert client.get(f"/v1/plans/{plan['plan_id']}").json() == plan
    conversation_path = f"/v1/plans/{plan['plan_id']}/conversation/messages"
    assert (
        gateway.system.client.post(
            conversation_path,
            json={"event_id": "turn-1:user", "role": "user", "content": "Quiet coast"},
        ).status_code
        == 200
    )
    history = client.get(conversation_path)
    assert history.status_code == 200
    assert [message["content"] for message in history.json()] == ["Quiet coast"]
    sent = gateway.captured[0]
    assert sent.headers["authorization"] == f"Bearer {gateway.system.token}"
    assert "cookie" not in sent.headers and "x-traveler-id" not in sent.headers
    assert not any(
        secret in response.text
        for secret in (
            cookie,
            gateway.system.token,
            "private-refresh",
            CREDENTIALS["email"],
            "traveler-one",
        )
    )
    assert response.headers["cache-control"] == "no-store"
    assert all(
        secret not in caplog.text
        for secret in (cookie, gateway.system.token, "private-refresh", CREDENTIALS["email"])
    )
    assert gateway.system.client.get("/v1/plans").json()["plans"] == [plan]


def test_full_rename_delete_restore_through_gateway(gateway):
    login(gateway)
    client = gateway.client
    plan = client.post("/v1/plans", json={}, headers=write_headers(gateway.system)).json()
    path = f"/v1/plans/{plan['plan_id']}"
    for operation, method, suffix, body in (
        ("rename", "PATCH", "/title", {"title": "Gateway trip"}),
        ("delete", "DELETE", "", {}),
        ("restore", "POST", "/restore", {}),
    ):
        prepared = client.post(
            path + "/challenges",
            json={"operation": operation, **body},
            headers=write_headers(gateway.system, plan["revision"]),
        )
        assert prepared.status_code == 200
        response = client.request(
            method,
            path + suffix,
            json=body,
            headers=write_headers(gateway.system, plan["revision"], prepared.json()["challenge"]),
        )
        assert response.status_code == 200
        plan = response.json()
        if operation == "delete":
            assert client.get(path).status_code == 404
        else:
            assert client.get(path).json() == plan
    assert plan["title"] == "Gateway trip" and plan["lifecycle"] == "active"


@pytest.mark.parametrize("case", ["missing", "expired", "challenge", "wrong_subject"])
def test_invalid_session_rejected_before_forwarding(gateway, case):
    if case != "missing":
        login(gateway)
    if case == "expired":
        gateway.now[0] += 400
    if case in {"challenge", "wrong_subject"}:
        with gateway.store.transaction():
            sid = gateway.client.cookies.get("__Host-travella")
            value = gateway.store.get(sid, gateway.now[0])
            value["kind" if case == "challenge" else "subject"] = "invalid"
            gateway.store.update(sid, value)
    response = gateway.client.get("/v1/plans")
    assert response.status_code == 401 and gateway.captured == []
    assert "Max-Age=0" in response.headers["set-cookie"]


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/v1/plans"),
        ("PATCH", "/v1/plans/00000000-0000-0000-0000-000000000000/title"),
        ("DELETE", "/v1/plans/00000000-0000-0000-0000-000000000000"),
    ],
)
def test_all_write_methods_require_same_origin(gateway, method, path):
    login(gateway)
    response = gateway.client.request(
        method, path, json={}, headers={"Origin": "https://evil.test"}
    )
    assert response.status_code == 403 and gateway.captured == []


def test_path_and_query_allowlist(gateway):
    login(gateway)
    assert gateway.client.get("/v1/plans/internal/admin").status_code == 404
    assert gateway.captured == []
    assert gateway.client.get("/v1/plans?subject=victim&view=active").status_code == 200
    assert "subject" not in gateway.captured[0].url.params


def test_upstream_independently_rejects_token(gateway):
    login(gateway)
    # The gateway accepts its verified session; CRUD must still verify for itself.
    gateway.system.verifier.keys.get_signing_key_from_jwt.side_effect = None
    original = gateway.system.verifier.keys.get_signing_key_from_jwt.return_value
    from cryptography.hazmat.primitives.asymmetric import rsa

    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # Change the key only after the auth verifier ran, at the transport boundary.
    def reject(request):
        gateway.system.verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(
            key=other.public_key()
        )
        result = gateway.system.client.get(
            "/v1/plans", headers={"Authorization": f"Bearer {gateway.system.token}"}
        )
        gateway.system.verifier.keys.get_signing_key_from_jwt.return_value = original
        return httpx.Response(result.status_code, json=result.json())

    gateway.adapter.transport = httpx.MockTransport(reject)
    response = gateway.client.get("/v1/plans")
    assert response.status_code == 401 and "Max-Age=0" in response.headers["set-cookie"]


@pytest.mark.parametrize(
    "failure", ["timeout", "redirect", "private_error", "malformed", "private_success"]
)
def test_upstream_failures_do_not_leak_secrets(gateway, failure):
    login(gateway)

    def upstream(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("secret-token", request=request)
        if failure == "redirect":
            return httpx.Response(302, headers={"Location": "https://evil.test/secret"})
        if failure == "private_error":
            return httpx.Response(500, json={"code": "private", "message": "secret-token"})
        if failure == "private_success":
            return httpx.Response(200, json={"plans": [], "email": "secret-token"})
        return httpx.Response(200, text="secret-token")

    gateway.adapter.transport = httpx.MockTransport(upstream)
    response = gateway.client.get("/v1/plans")
    assert "secret-token" not in response.text and "location" not in response.headers
    assert response.status_code == (
        200 if failure == "private_success" else 500 if failure == "private_error" else 503
    )
