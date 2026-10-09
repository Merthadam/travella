"""Search proxy rejects browser identity and projects only public search fields."""

import json
import httpx
from services.auth.agent_client import AgentClient
from services.auth.tests.test_crud_client import gateway, system, login  # noqa: F401

PLAN = "00000000-0000-4000-8000-000000000001"


def test_proxy_session_csrf_and_read_only_allowlist(gateway):
    path = f"/v1/agent/plans/{PLAN}/travel/"
    assert gateway.client.get(path + "capabilities").status_code == 401
    login(gateway)
    assert (
        gateway.client.post(
            path + "hotels/search", json={}, headers={"Origin": "https://evil.test"}
        ).status_code
        == 403
    )
    assert gateway.client.post(path + "book", json={}).status_code == 404


def test_direct_and_runtime_projection_and_server_token():
    for runtime in (False, True):
        captured = []

        def upstream(request):
            captured.append(request)
            return httpx.Response(
                200,
                json={
                    "provider": "LiteAPI",
                    "sandbox": True,
                    "hotels": True,
                    "flights": True,
                    "offerId": "SECRET",
                    "api_key": "SECRET",
                },
            )

        client = AgentClient(
            "https://agent.test",
            transport=httpx.MockTransport(upstream),
            runtime_arn="arn:aws:bedrock-agentcore:eu-north-1:123456789012:runtime/test"
            if runtime
            else None,
            runtime_region="eu-north-1" if runtime else None,
        )
        status, data = client.travel(str(PLAN), "capabilities", {}, token="server-token")
        assert status == 200 and data["sandbox"] is True and "SECRET" not in json.dumps(data)
        assert captured[0].headers["authorization"] == "Bearer server-token"
        if runtime:
            assert json.loads(captured[0].content)["operation"] == "travel"
        else:
            assert captured[0].method == "GET"


def test_invalid_search_and_failure_do_not_leak_provider_data():
    requests = []

    def upstream(request):
        requests.append(request)
        return httpx.Response(500, json={"message": "SECRET"})

    client = AgentClient("https://agent.test", transport=httpx.MockTransport(upstream))
    assert client.travel(str(PLAN), "hotels/search", {}, token="private")[0] == 422
    assert requests == []
    status, data = client.travel(str(PLAN), "capabilities", {}, token="private")
    assert status == 503 and "SECRET" not in json.dumps(data)


def test_successful_cookie_proxy_ignores_browser_identity_and_revalidates_output(tmp_path):
    from unittest.mock import Mock
    from cryptography.fernet import Fernet
    from fastapi.testclient import TestClient
    from services.auth.api import create_app
    from services.auth.session_store import SessionStore
    from services.auth.contracts import ValidatedIdentity
    from services.auth.tests.test_crud_client import ORIGIN, HEADERS, CREDENTIALS

    provider = Mock()
    provider.sign_in.return_value = {
        "AuthenticationResult": {"AccessToken": "server-access", "RefreshToken": "server-refresh"}
    }
    provider.get_user.return_value = {
        "Username": "canonical",
        "UserAttributes": [
            {"Name": "sub", "Value": "owner"},
            {"Name": "email_verified", "Value": "true"},
            {"Name": "email", "Value": CREDENTIALS["email"]},
        ],
    }
    verifier = Mock(
        return_value=ValidatedIdentity(
            "owner", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
        )
    )
    sent = []

    def upstream(request):
        sent.append(request)
        return httpx.Response(
            200,
            json={
                "provider": "LiteAPI",
                "sandbox": True,
                "hotels": True,
                "flights": True,
                "secret": "PRIVATE",
            },
        )

    store = SessionStore(str(tmp_path / "search-sessions.db"), Fernet.generate_key().decode())
    app = create_app(
        provider,
        verifier,
        store,
        origin=ORIGIN,
        agent_client=AgentClient("https://agent.test", transport=httpx.MockTransport(upstream)),
    )
    with TestClient(app, base_url=ORIGIN, headers=HEADERS) as client:
        assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 200
        response = client.get(
            f"/v1/agent/plans/{PLAN}/travel/capabilities",
            headers={"Authorization": "Bearer spoof", "X-Traveler-ID": "victim"},
        )
        assert response.status_code == 200 and response.json()["sandbox"] is True
        assert response.headers["cache-control"] == "no-store"
        assert not any(x in response.text for x in ["PRIVATE", "server-access", "server-refresh"])
        assert sent[0].headers["authorization"] == "Bearer server-access"
        assert "cookie" not in sent[0].headers and "x-traveler-id" not in sent[0].headers
    store.close()
