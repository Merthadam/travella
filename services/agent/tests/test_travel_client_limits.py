"""Bounded multi-room checkout receipts reach the private transport unchanged."""
import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from services.agent.travel_client import TravelClient


@pytest.fixture
def transport(monkeypatch):
    monkeypatch.setenv("AGENT_MCP_TRANSPORT", "gateway")
    monkeypatch.setenv("AGENTCORE_GATEWAY_URL", "https://gateway.test/mcp")
    session = SimpleNamespace(
        initialize=AsyncMock(),
        list_tools=AsyncMock(return_value=SimpleNamespace(tools=[SimpleNamespace(name="travel_search")])),
        call_tool=AsyncMock(return_value=SimpleNamespace(isError=False, structuredContent={"status": "confirmed"})),
    )

    @asynccontextmanager
    async def streams(*args, **kwargs):
        yield None, None, None

    @asynccontextmanager
    async def client_session(*args):
        yield session

    monkeypatch.setattr("services.agent.travel_client.streamable_http_client", streams)
    monkeypatch.setattr("services.agent.travel_client.ClientSession", client_session)
    return session


def call(action, token):
    return asyncio.run(TravelClient().call(
        "travel_search", {"action": action, "criteria": {"token": token}},
        subject="owner", plan_id="plan", authorization_token="service-token",
    ))


@pytest.mark.parametrize("action", ["sandbox/prebook", "sandbox/book", "sandbox/status"])
def test_large_stay_receipt_reaches_transport(action, transport):
    token = "x" * 40_000
    assert call(action, token) == {"status": "confirmed"}
    transport.call_tool.assert_awaited_once_with("travel_search", {
        "action": action, "criteria": {"token": token}, "plan_id": "plan",
    })


@pytest.mark.parametrize("action,size", [
    ("sandbox/prebook", 65_536), ("sandbox/book", 65_536), ("sandbox/status", 65_536),
    ("hotels/search", 8_000), ("sandbox/flights/status", 8_000),
    ("sandbox/status/extra", 8_000),
])
def test_oversized_arguments_never_open_a_tool_session(action, size, transport):
    assert call(action, "x" * size) == {"status": "invalid"}
    transport.initialize.assert_not_awaited()
    transport.call_tool.assert_not_awaited()
