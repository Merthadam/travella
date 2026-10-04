from __future__ import annotations

import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from services.agent.app import create_app
from services.agent.claude import GatewayProtocolError, LocalMcpAdapter
from services.agent.local_mcp import LocalMcpClient, LocalMcpError
from services.mcps.transport import authenticated_mcp_app, require_tool_context


def _configure_local_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_ISSUER", "https://local.invalid/mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_AUDIENCE", "travella-local-mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "travella-local-agent")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp")
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_JWT_KEY", "service-secret-for-tests-32-bytes")
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "assertion-secret-for-tests-32-bytes")
    monkeypatch.setenv("MCP_ASSERTION_AUDIENCE", "travella-mcp")


def test_local_mcp_client_calls_authenticated_streamable_http_server(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _configure_local_auth(monkeypatch)
    server = FastMCP(
        "test-local-target",
        json_response=True,
        stateless_http=True,
        transport_security=TransportSecuritySettings(allowed_hosts=["localhost:8000"]),
    )

    @server.tool()
    async def echo(message: str, plan_id: str) -> dict[str, str]:
        context = require_tool_context(plan_id=plan_id)
        return {"message": message, "subject": context.subject, "plan_id": context.plan_id}

    target_app = authenticated_mcp_app(server)
    url = "http://localhost:8000/mcp"

    def client_factory(_url: str, headers: dict[str, str]) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url="http://localhost:8000",
            headers=headers,
            transport=httpx.ASGITransport(app=target_app),
        )

    client = LocalMcpClient(tool_urls={"echo": url}, http_client_factory=client_factory)

    async def run_call() -> dict[str, str]:
        async with target_app.app.router.lifespan_context(target_app.app):
            return await client.call_tool(
                "echo",
                {
                    "message": "windy surf trip",
                    "plan_id": "plan-123",
                    "traveler_scope": "traveler-7",
                },
            )

    result = asyncio.run(run_call())

    assert result == {
        "message": "windy surf trip",
        "subject": "traveler-7",
        "plan_id": "plan-123",
    }


def test_local_mcp_client_rejects_a_tool_not_in_its_local_catalog() -> None:
    client = LocalMcpClient(tool_urls={"research_destination_candidates": "http://research/mcp"})

    with pytest.raises(LocalMcpError, match="not allowlisted"):
        asyncio.run(
            client.call_tool(
                "unlisted_tool",
                {"plan_id": "plan-123", "traveler_scope": "traveler-7"},
            )
        )


def test_local_mcp_client_fails_closed_without_its_local_service_auth(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _configure_local_auth(monkeypatch)
    monkeypatch.delenv("MCP_ASSERTION_SIGNING_SECRET")
    client = LocalMcpClient(tool_urls={"research_destination_candidates": "http://research/mcp"})

    with pytest.raises(LocalMcpError, match="Local MCP request failed|not configured"):
        asyncio.run(
            client.call_tool(
                "research_destination_candidates",
                {"theme": "surf", "plan_id": "plan-123", "traveler_scope": "traveler-7"},
            )
        )


def test_local_adapter_requires_verified_user_token_and_uses_local_tools() -> None:
    class FakeMcpClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, dict]] = []

        async def call_tool(self, name: str, arguments: dict) -> dict:
            self.calls.append((name, arguments))
            return {"status": "ready"}

    fake = FakeMcpClient()
    adapter = LocalMcpAdapter(
        research_url="http://research-mcp:8000/mcp",
        map_url="http://map-mcp:8001/mcp",
        mcp_client=fake,
    )

    with pytest.raises(GatewayProtocolError, match="verified Cognito token"):
        asyncio.run(
            adapter.research(
                message="surf",
                traveler_scope="traveler-7",
                plan_id="plan-123",
                event_id="event-1",
                authorization_token="",
            )
        )

    result = asyncio.run(
        adapter.research(
            message="surf",
            traveler_scope="traveler-7",
            plan_id="plan-123",
            event_id="event-1",
            authorization_token="verified-cognito-token",
        )
    )

    assert adapter.transport == "local"
    assert result == {"status": "ready"}
    assert fake.calls == [
        (
            "research_destination_candidates",
            {
                "theme": "surf",
                    "traveler_scope": "traveler-7",
                    "plan_id": "plan-123",
                    "request_id": "event-1",
                    "research_intent": "destination_discovery",
                },
        )
    ]


def test_app_selects_local_transport_and_reports_it_without_gateway(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AGENT_MCP_TRANSPORT", "local")
    monkeypatch.delenv("AGENTCORE_GATEWAY_URL", raising=False)
    monkeypatch.delenv("COGNITO_USER_POOL_ID", raising=False)
    monkeypatch.delenv("CRUD_BASE_URL", raising=False)

    app = create_app(
        verifier=lambda _token: None,
        plan_reader=lambda *_args: None,
    )
    with TestClient(app) as client:
        health = client.get("/health").json()

    assert health["tool_transport"] == "local"
    assert health["gateway_configured"] is False
    assert health["local_mcp_configured"] is True


def test_development_defaults_to_local_transport_without_agentcore_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("AGENT_MCP_TRANSPORT", raising=False)
    monkeypatch.delenv("AGENTCORE_GATEWAY_URL", raising=False)
    monkeypatch.delenv("COGNITO_USER_POOL_ID", raising=False)
    monkeypatch.delenv("CRUD_BASE_URL", raising=False)

    app = create_app(verifier=lambda _token: None, plan_reader=lambda *_args: None)
    with TestClient(app) as client:
        health = client.get("/health").json()

    assert health["tool_transport"] == "local"
    assert health["gateway_configured"] is False


def test_local_transport_is_refused_outside_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("AGENT_MCP_TRANSPORT", "local")
    monkeypatch.delenv("COGNITO_USER_POOL_ID", raising=False)
    monkeypatch.delenv("CRUD_BASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="only available in development or test"):
        create_app(
            verifier=lambda _token: None,
            plan_reader=lambda *_args: None,
        )
