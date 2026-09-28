from __future__ import annotations

import asyncio

import pytest

from services.mcps import map_server, research_server
from services.mcps.config import McpSettings, required_secret
from services.mcps.memory import MemoryProvider


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


class FakeClient:
    def __init__(self, responses: list[FakeResponse], **_: object):
        self.responses = iter(responses)
        self.requests: list[tuple[str, dict]] = []

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, url: str, json: dict) -> FakeResponse:
        self.requests.append((url, json))
        return next(self.responses)

    async def get(self, url: str, params: dict) -> FakeResponse:
        self.requests.append((url, params))
        return next(self.responses)


def test_research_returns_compact_candidates_without_raw_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    monkeypatch.setattr(
        research_server.httpx,
        "AsyncClient",
        lambda **kwargs: FakeClient(
            [
                FakeResponse(
                    {
                        "results": [
                            {
                                "title": "Kyoto",
                                "url": "https://example.test/kyoto",
                                "content": "A cultural city with temples.",
                                "raw_content": "private raw payload",
                            }
                        ]
                    }
                )
            ],
            **kwargs,
        ),
    )

    result = asyncio.run(
        research_server.research_destination_candidates(
            "slow cultural weekend", "traveler-1", "plan-1", max_candidates=9
        )
    )

    assert result["plan_id"] == "plan-1"
    assert len(result["candidates"]) == 1
    assert "raw_content" not in result["candidates"][0]
    assert result["candidates"][0]["evidence"][0]["url"] == "https://example.test/kyoto"


def test_map_projection_is_temporary_and_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "test-key")
    monkeypatch.setattr(
        map_server.httpx,
        "AsyncClient",
        lambda **kwargs: FakeClient(
            [
                FakeResponse(
                    {
                        "results": [
                            {
                                "place_id": "abc",
                                "formatted_address": "Kyoto, Japan",
                                "geometry": {"location": {"lat": 35.0116, "lng": 135.7681}},
                            }
                        ]
                    }
                )
            ]
            * 5,
            **kwargs,
        ),
    )

    result = asyncio.run(
        map_server.get_candidate_map_projection(
            [" Kyoto ", "", "Osaka", "Tokyo", "Paris", "Rome", "Lisbon"], "traveler-1"
        )
    )

    assert result["plan_id"] == "temporary"
    assert result["locations"][0]["temporary"] is True
    assert result["locations"][0]["location"]["lat"] == 35.0116


def test_memory_namespace_and_secret_boundary() -> None:
    settings = McpSettings(
        tavily_api_key=None,
        google_maps_server_api_key=None,
        memory_provider="agentcore",
        agentcore_memory_id="memory-1",
        memory_namespace_template="traveler/{actorId}",
    )
    provider = MemoryProvider(settings)
    assert provider.enabled is True
    assert provider.namespace("actor-7") == "traveler/actor-7"
    with pytest.raises(RuntimeError, match="TAVILY_API_KEY"):
        required_secret(None, "TAVILY_API_KEY")
