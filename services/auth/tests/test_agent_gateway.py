"""HTTP behavior shared by agent gateway routes, with real local auth sessions."""

from contextlib import contextmanager
from threading import Event
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from services.auth.api import create_app
from services.auth.tests.test_api import CREDENTIALS, HEADERS, ORIGIN, system  # noqa: F401

PLAN = "00000000-0000-4000-8000-000000000001"
ROUTES = [
    ("GET", "travel/capabilities", "travel"),
    ("POST", "travel/hotels/search", "travel"),
    ("POST", "events", "turn"),
    ("POST", "events/stream", "stream"),
    ("POST", "events/event-1/cancel", "cancel"),
]


@pytest.fixture
def gateway(request):
    _, provider, verifier, store, now = request.getfixturevalue("system")
    transaction_open = Event()
    transaction = store.transaction

    @contextmanager
    def tracked_transaction():
        with transaction():
            transaction_open.set()
            try:
                yield
            finally:
                transaction_open.clear()

    store.transaction = tracked_transaction
    calls = []

    def capture(kind, args, kwargs):
        assert not transaction_open.is_set(), "Upstream I/O must not hold the session transaction"
        calls.append((kind, args, kwargs))

    def operation(kind, payload):
        def forward(*args, **kwargs):
            capture(kind, args, kwargs)
            return 200, payload

        return forward

    async def stream(*args, **kwargs):
        capture("stream", args, kwargs)
        yield 'data: {"type":"RUN_FINISHED"}\n\n'

    agent = SimpleNamespace(
        travel=operation("travel", {"sandbox": True}),
        turn=operation("turn", {"status": "needs your input"}),
        cancel=operation("cancel", {"cancelled": True}),
        stream=stream,
        runtime_arn=None,
    )
    crud = SimpleNamespace(cancel_research_run=Mock(return_value=True))

    @contextmanager
    def client(configured=True):
        app = create_app(
            provider,
            verifier,
            store,
            origin=ORIGIN,
            clock=lambda: now[0],
            agent_client=agent if configured else None,
            crud_client=crud,
        )
        with TestClient(app, base_url=ORIGIN, headers=HEADERS) as http:
            yield http

    yield SimpleNamespace(client=client, calls=calls, now=now, agent=agent, crud=crud)
    store.transaction = transaction


def send(client, method, suffix, *, plan=PLAN, **kwargs):
    return client.request(method, f"/v1/agent/plans/{plan}/{suffix}", **kwargs)


def login(client):
    assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 200


@pytest.mark.parametrize("method,suffix,kind", ROUTES)
def test_routes_authenticate_before_forwarding_and_release_session_transaction(
    gateway, method, suffix, kind
):
    with gateway.client() as client:
        assert send(client, method, suffix, json={}).status_code == 401
        assert gateway.calls == []
        login(client)
        response = send(
            client,
            method,
            suffix,
            json={"message": "test"},
            headers={"Authorization": "Bearer forged", "X-Traveler-ID": "another-traveler"},
        )
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        if kind == "stream":
            assert response.headers["content-type"].startswith("text/event-stream")
            assert response.headers["x-accel-buffering"] == "no"
            assert response.text == 'data: {"type":"RUN_FINISHED"}\n\n'
        elif kind == "travel":
            assert response.json() == {"sandbox": True}
        elif kind == "cancel":
            assert response.json() == {"cancelled": True}
        else:
            assert response.json() == {"status": "needs your input"}
        assert len(gateway.calls) == 1
        actual_kind, args, kwargs = gateway.calls[0]
        assert actual_kind == kind
        assert kwargs["token"] == "secret-access"
        assert "forged" not in repr(gateway.calls) and "another-traveler" not in repr(gateway.calls)
        if kind == "travel":
            assert args == (
                PLAN,
                suffix.removeprefix("travel/"),
                {} if method == "GET" else {"message": "test"},
            )
        else:
            assert args == (f"/v1/agent/plans/{PLAN}/{suffix}",)
        if kind in {"turn", "stream"}:
            assert kwargs["body"] == b'{"message":"test"}'
        gateway.crud.cancel_research_run.assert_not_called()
        gateway.now[0] += 301
        assert send(client, method, suffix, json={}).status_code == 401
        assert len(gateway.calls) == 1


@pytest.mark.parametrize("method,suffix,kind", ROUTES)
def test_unconfigured_agent_preserves_auth_precedence_and_route_message(
    gateway, method, suffix, kind
):
    with gateway.client(configured=False) as client:
        assert send(client, method, suffix, json={}).status_code == 401
        login(client)
        response = send(client, method, suffix, json={})
        assert response.status_code == 503
        assert response.json() == {
            "message": "Travel search unavailable."
            if kind == "travel"
            else "Copilot is not configured yet."
        }
        assert gateway.calls == []


@pytest.mark.parametrize("suffix", ["events", "events/stream", "events/event-1/cancel"])
def test_invalid_chat_plan_is_rejected_after_authentication(gateway, suffix):
    with gateway.client() as client:
        assert send(client, "POST", suffix, plan="invalid", json={}).status_code == 401
        login(client)
        response = send(client, "POST", suffix, plan="invalid", json={})
        assert response.status_code == 404
        assert response.json() == {"message": "Copilot is unavailable."}
        assert gateway.calls == []


def test_travel_allowlist_precedes_auth_and_invalid_json_is_not_forwarded(gateway):
    with gateway.client() as client:
        assert send(client, "POST", "travel/unknown", json={}).status_code == 404
        assert send(client, "GET", "travel/hotels/search").status_code == 404
        login(client)
        response = send(
            client,
            "POST",
            "travel/hotels/search",
            content="{",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422
        assert response.json() == {"message": "Check your search criteria."}
        assert gateway.calls == []


@pytest.mark.parametrize("released", [True, False])
def test_runtime_cancellation_still_releases_crud_lease(gateway, released):
    gateway.agent.runtime_arn = "test-runtime"
    gateway.crud.cancel_research_run.return_value = released
    with gateway.client() as client:
        login(client)
        response = send(client, "POST", "events/event-1/cancel", json={})
        gateway.crud.cancel_research_run.assert_called_once_with(
            PLAN, "event-1", token="secret-access"
        )
        assert response.status_code == (200 if released else 503)
        assert response.json() == (
            {"cancelled": True}
            if released
            else {
                "message": "The reply stopped, but the Trip Brief is still unlocking. Try again shortly."
            }
        )
