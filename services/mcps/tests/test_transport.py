from __future__ import annotations

import asyncio
import json
import time

import httpx
import pytest

from services.mcps.gateway_interceptor import GatewayRequest, GatewayRequestInterceptor
from services.mcps.transport import (
    AuthenticatedMcpASGI,
    AuthenticationError,
    authenticate_tool_call,
    issue_scope_assertion,
    verify_scope_assertion,
)


def test_authenticated_mcp_replays_request_body_once_then_delegates_disconnect(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import jwt

    monkeypatch.setenv("MCP_GATEWAY_OAUTH_ISSUER", "https://issuer.example")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_AUDIENCE", "target")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "gateway-client")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_JWT_KEY", "a" * 32)
    service_token = jwt.encode(
        {
            "sub": "gateway",
            "iss": "https://issuer.example",
            "aud": "target",
            "client_id": "gateway-client",
            "scope": "travella.mcp",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "a" * 32,
        algorithm="HS256",
    )
    request_body = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
    ).encode()
    incoming = [{"type": "http.request", "body": request_body, "more_body": False}]
    observed: list[dict] = []

    async def receive() -> dict:
        if incoming:
            return incoming.pop(0)
        return {"type": "http.disconnect"}

    async def target_app(_scope, replayed_receive, send) -> None:
        observed.append(await replayed_receive())
        observed.append(await replayed_receive())
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"{}"})

    async def run() -> None:
        await AuthenticatedMcpASGI(target_app)(
            {
                "type": "http",
                "path": "/mcp",
                "method": "POST",
                "headers": [(b"authorization", f"Bearer {service_token}".encode())],
            },
            receive,
            lambda _message: asyncio.sleep(0),
        )

    asyncio.run(run())

    assert observed[0]["type"] == "http.request"
    assert json.loads(observed[0]["body"]) == {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {},
    }
    assert observed[1]["type"] == "http.disconnect"


def test_mcp_targets_use_stateless_json_transport() -> None:
    from services.mcps.map_server import map_mcp
    from services.mcps.research_server import research_mcp

    assert research_mcp.settings.stateless_http is True
    assert research_mcp.settings.json_response is True
    assert map_mcp.settings.stateless_http is True
    assert map_mcp.settings.json_response is True


def test_direct_target_call_requires_service_token_and_signed_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_ISSUER", "https://issuer.example")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_AUDIENCE", "target")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "gateway-client")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_JWT_KEY", "a" * 32)
    import jwt

    token = jwt.encode(
        {
            "sub": "gateway",
            "iss": "https://issuer.example",
            "aud": "target",
            "client_id": "gateway-client",
            "scope": "travella.mcp",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "a" * 32,
        algorithm="HS256",
    )
    assertion = issue_scope_assertion("actor-1", "plan-1")
    context = authenticate_tool_call(
        {"Authorization": f"Bearer {token}"}, assertion=assertion, plan_id="plan-1"
    )
    assert context.subject == "actor-1"
    with pytest.raises(AuthenticationError):
        authenticate_tool_call({}, assertion=assertion, plan_id="plan-1")


def test_expired_or_foreign_assertion_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    assertion = issue_scope_assertion("actor-1", "plan-1", ttl_seconds=1)
    monkeypatch.setattr(time, "time", lambda: 100000000)
    with pytest.raises(AuthenticationError):
        verify_scope_assertion(assertion, subject="actor-2")


def test_gateway_removes_spoofed_scope_and_injects_assertion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    import jwt

    token = jwt.encode(
        {
            "sub": "actor-1",
            "iss": "issuer",
            "aud": "client",
            "client_id": "client",
            "token_use": "access",
            "scope": "aws.cognito.signin.user.admin",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "jwt-secret",
        algorithm="HS256",
    )
    interceptor = GatewayRequestInterceptor(
        jwt_key="jwt-secret",
        issuer="issuer",
        client_id="client",
        plan_owner=lambda subject, plan: subject == "actor-1" and plan == "plan-1",
    )
    decision = interceptor.intercept(
        GatewayRequest(
            "tools/call",
            {"Authorization": f"Bearer {token}"},
            {
                "jsonrpc": "2.0",
                "id": 7,
                "method": "tools/call",
                "params": {
                    "name": "research_destination_candidates",
                    "arguments": {
                        "plan_id": "plan-1",
                        "traveler_scope": "attacker",
                        "theme": "quiet",
                    },
                },
            },
        )
    )
    params = decision.body["params"]
    assert params["name"] == "research_destination_candidates"
    assert params["arguments"]["plan_id"] == "plan-1"
    assert params["arguments"]["traveler_scope"] == "actor-1"
    assert params["arguments"]["__travella_scope_assertion"]
    assert decision.body["id"] == 7


def test_agentcore_event_adapter_wraps_real_mcp_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    import jwt

    token = jwt.encode(
        {
            "sub": "actor-1",
            "iss": "issuer",
            "aud": "client",
            "client_id": "client",
            "token_use": "access",
            "scope": "aws.cognito.signin.user.admin",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "jwt-secret",
        algorithm="HS256",
    )
    interceptor = GatewayRequestInterceptor(
        jwt_key="jwt-secret",
        issuer="issuer",
        client_id="client",
        plan_owner=lambda subject, plan: subject == "actor-1" and plan == "plan-1",
    )
    from services.mcps.gateway_interceptor import agentcore_response, request_from_agentcore_event

    event = {
        "interceptorInputVersion": "1.0",
        "mcp": {
            "gatewayRequest": {
                "httpMethod": "POST",
                "path": "/mcp",
                "headers": {"Authorization": f"Bearer {token}"},
                "body": {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "research_destination_candidates",
                        "arguments": {"theme": "quiet", "plan_id": "plan-1"},
                    },
                },
            }
        },
    }
    output = agentcore_response(interceptor.intercept(request_from_agentcore_event(event)))
    args = output["mcp"]["transformedGatewayRequest"]["body"]["params"]["arguments"]
    assert args["plan_id"] == "plan-1"
    assert args["__travella_scope_assertion"]


def test_tools_list_does_not_require_traveler_assertion() -> None:
    interceptor = GatewayRequestInterceptor(
        jwt_key="unused", issuer="issuer", client_id="client", plan_owner=lambda *_: False
    )
    decision = interceptor.intercept(
        GatewayRequest("tools/list", {}, {"method": "tools/list"}, pass_request_headers=False)
    )
    assert decision.allowed is True


def test_mounted_fastmcp_tools_call_uses_interceptor_output_and_denies_direct(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import asyncio

    asyncio.run(_mounted_fastmcp_tools_call(monkeypatch))


async def _mounted_fastmcp_tools_call(monkeypatch: pytest.MonkeyPatch) -> None:
    from services.mcps import research_server
    from services.mcps.transport import authenticated_mcp_app

    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "s" * 32)
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_ISSUER", "https://issuer.example")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_AUDIENCE", "target")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "gateway-client")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_JWT_KEY", "a" * 32)
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    import jwt

    import services.mcps.tests.test_mcp_tools as tool_tests

    real_async_client = httpx.AsyncClient

    def fake_async_client(**kwargs: object) -> object:
        if "transport" in kwargs:
            return real_async_client(**kwargs)
        return tool_tests.FakeClient([tool_tests.FakeResponse({"results": []})], **kwargs)

    monkeypatch.setattr(research_server.httpx, "AsyncClient", fake_async_client)
    service_token = jwt.encode(
        {
            "sub": "gateway",
            "iss": "https://issuer.example",
            "aud": "target",
            "client_id": "gateway-client",
            "scope": "travella.mcp",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "a" * 32,
        algorithm="HS256",
    )
    actor_token = jwt.encode(
        {
            "sub": "actor-1",
            "iss": "issuer",
            "aud": "client",
            "client_id": "client",
            "token_use": "access",
            "scope": "aws.cognito.signin.user.admin",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        "jwt-secret",
        algorithm="HS256",
    )
    interceptor = GatewayRequestInterceptor(
        jwt_key="jwt-secret",
        issuer="issuer",
        client_id="client",
        plan_owner=lambda subject, plan: subject == "actor-1" and plan == "plan-1",
    )
    request = GatewayRequest(
        "tools/call",
        {"Authorization": f"Bearer {actor_token}"},
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "research_destination_candidates",
                "arguments": {"theme": "quiet", "plan_id": "plan-1"},
            },
        },
    )
    transformed = interceptor.intercept(request).body
    app = authenticated_mcp_app(research_server.research_mcp)
    async with research_server.research_mcp.session_manager.run():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://localhost:8000"
        ) as client:
            denied = await client.post(
                "/mcp",
                json=transformed,
                headers={
                    "Authorization": f"Bearer {service_token}",
                    "Accept": "application/json, text/event-stream",
                },
            )
            assert denied.status_code == 200
            assert denied.json()["result"]["isError"] is False
            direct = await client.post(
                "/mcp",
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "research_destination_candidates",
                        "arguments": {"theme": "quiet", "plan_id": "plan-1"},
                    },
                },
                headers={"Accept": "application/json, text/event-stream"},
            )
            assert direct.status_code == 403
            assert "error" in direct.json()
