from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.agent.claude import ClaudeGatewayAdapter, GatewayProtocolError
from services.auth.contracts import ValidatedIdentity


@pytest.fixture(autouse=True)
def _bedrock_isolated_provider_configuration(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "bedrock")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


@dataclass
class FakeAdapter:
    calls: int = 0
    research_tokens: list[str | None] = field(default_factory=list)

    async def complete_conversation(self, **_kwargs):
        return {
            "decision": "research",
            "research_intent": "destination_discovery",
            "assistant_text": "I’ll find a few places.",
        }

    async def research(self, **kwargs):
        self.calls += 1
        self.research_tokens.append(kwargs.get("authorization_token"))
        return {
            "status": "ready",
            "run_id": "run-1",
            "candidates": [
                {
                    "candidate_id": "c-1",
                    "name": "Kyoto",
                    "status": "shortlisted",
                    "confidence": "strong",
                    "fit_summary": "Temples and food.",
                    "caveats": [],
                    "evidence": [{"evidence_id": "e-1"}],
                }
            ],
        }

    async def resolve_map(self, **kwargs):
        return {
            "status": "ready",
            "locations": [
                {
                    "candidate_name": "Kyoto",
                    "place_id": "p-1",
                    "label": "Kyoto, Japan",
                    "city": "Kyoto",
                    "country": "Japan",
                    "location": {"lat": 35.0, "lng": 135.0},
                    "temporary": True,
                    "attribution": "Google Maps",
                }
            ],
        }

    async def sources(self, **kwargs):
        return {
            "status": "ready",
            "evidence": [
                {
                    "evidence_id": "e-1",
                    "title": "Kyoto",
                    "url": "https://example.test/kyoto",
                    "excerpt": "safe",
                }
            ],
        }

    async def synthesize_research(self, *, page_read, **_kwargs):
        if page_read.get("read_status") == "read":
            return {
                "answer": "The page provides destination information.",
                "evidence_ids": [page_read["evidence_id"]],
                "uncertainty": [],
            }
        return {
            "answer": "I could not read a source page.",
            "evidence_ids": [],
            "uncertainty": ["The selected source page was unavailable."],
        }


def _app(adapter=None, *, plan=None):
    identity = ValidatedIdentity(
        "traveler-1", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
    )
    plan = plan or {"plan_id": str(uuid4()), "lifecycle": "active", "revision": 1}

    def verifier(token: str) -> ValidatedIdentity:
        if token == "good":
            return identity
        raise ValueError("bad token")

    def reader(subject: str, plan_id: object, token: str) -> dict | None:
        if subject == identity.subject and token == "good" and str(plan_id) == plan["plan_id"]:
            return plan
        return None

    return create_app(verifier=verifier, plan_reader=reader, adapter=adapter or FakeAdapter()), plan


def test_owned_plan_research_maps_and_deduplicates():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer good"}
        payload = {"plan_id": plan["plan_id"], "event_id": "event-1", "message": "temples and food"}
        first = client.post("/v1/agent/events", headers=headers, json=payload)
        second = client.post("/v1/agent/events", headers=headers, json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json()["status"] == "shortlist_ready"
    assert first.json() == second.json()
    assert adapter.calls == 1
    assert adapter.research_tokens == ["good"]


def test_health_reports_bedrock_provider_and_missing_gateway_without_secrets():
    app, _ = _app(ClaudeGatewayAdapter(""))
    with TestClient(app) as client:
        health = client.get("/health").json()

    assert health["model_provider"] == "amazon-bedrock"
    assert health["model_id"] == "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
    assert health["gateway_configured"] is False
    assert "AWS_BEARER_TOKEN_BEDROCK" not in str(health)


def test_invalid_identity_and_foreign_plan_fail_before_adapter():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        payload = {"plan_id": plan["plan_id"], "event_id": "event-1", "message": "Paris"}
        assert client.post("/v1/agent/events", json=payload).status_code == 401
        assert (
            client.post(
                "/v1/agent/events", headers={"Authorization": "Bearer bad"}, json=payload
            ).status_code
            == 401
        )
    assert adapter.calls == 0


def test_password_auth_access_token_can_reach_agent(monkeypatch):
    monkeypatch.delenv("AGENT_REQUIRED_SCOPE", raising=False)
    identity = ValidatedIdentity(
        "traveler-1",
        "client",
        frozenset({"aws.cognito.signin.user.admin"}),
        1,
        9999999999,
    )
    plan = {"plan_id": str(uuid4()), "lifecycle": "active", "revision": 1}

    def verifier(token: str) -> ValidatedIdentity:
        assert token == "cognito-user-access"
        return identity

    def reader(subject: str, plan_id: object, token: str) -> dict | None:
        if (
            subject == identity.subject
            and str(plan_id) == plan["plan_id"]
            and token == "cognito-user-access"
        ):
            return plan
        return None

    app = create_app(verifier=verifier, plan_reader=reader, adapter=FakeAdapter())
    with TestClient(app) as client:
        response = client.post(
            f"/v1/agent/plans/{plan['plan_id']}/events",
            headers={"Authorization": "Bearer cognito-user-access"},
            json={"plan_id": plan["plan_id"], "event_id": "event-1", "message": "hello"},
        )

    assert response.status_code == 200


def test_plan_stream_returns_assistant_text_and_terminal_status():
    identity = ValidatedIdentity("traveler-1", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999)
    plan = {"plan_id": str(uuid4()), "lifecycle": "active", "revision": 1}

    def verifier(token):
        assert token == "good"
        return identity

    def reader(subject, plan_id, token):
        return plan if subject == identity.subject and str(plan_id) == plan["plan_id"] else None

    class Graph:
        async def invoke(self, state, *, authorization_token, on_text_delta=None):
            assert state["message"] == "Plan Kyoto"
            if on_text_delta:
                await on_text_delta("Where to?")
            return {"projection": {
                "status": "needs your input", "plan_id": state["plan_id"],
                "event_id": state["event_id"], "generation": state["generation"],
                "assistant_text": "Where to?",
            }}

    app = create_app(verifier=verifier, plan_reader=reader, adapter=FakeAdapter(), graph=Graph())
    with TestClient(app) as client:
        response = client.post(
            f"/v1/agent/plans/{plan['plan_id']}/events/stream",
            headers={"Authorization": "Bearer good"},
            json={"plan_id": plan["plan_id"], "event_id": "stream-1", "message": "Plan Kyoto"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"type":"TEXT_MESSAGE_CONTENT"' in response.text
    assert '"delta":"Where to?"' in response.text
    assert '"type":"TERMINAL","status":"needs your input"' in response.text


def test_bedrock_client_uses_local_aws_profile_when_api_key_is_blank(monkeypatch):
    from services.agent.claude.messages import ClaudeMessagesClient

    captured = {}

    class FakeBedrockClient:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "")
    monkeypatch.setenv("AWS_PROFILE", "local-dev")
    monkeypatch.setattr("services.agent.claude.messages.AsyncAnthropicBedrock", FakeBedrockClient)

    ClaudeMessagesClient()._client()

    assert captured["api_key"] is None
    assert captured["aws_profile"] == "local-dev"
    assert "AWS_BEARER_TOKEN_BEDROCK" not in os.environ


def test_empty_message_is_one_question_and_unknown_actions_are_rejected():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer good"}
        question = client.post(
            "/v1/agent/events",
            headers=headers,
            json={"plan_id": plan["plan_id"], "event_id": "q-1", "message": ""},
        )
        action = client.post(
            "/v1/agent/events",
            headers=headers,
            json={
                "plan_id": plan["plan_id"],
                "event_id": "a-1",
                "message": "",
                "candidate_action": {
                    "action": "reject",
                    "candidate_id": "c-1",
                    "reason": "too far",
                },
            },
        )
    assert question.json()["status"] == "needs your input"
    assert action.status_code == 422
    assert adapter.calls == 0


def test_source_inspection_is_compact():
    app, plan = _app(FakeAdapter())
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer good"}
        research = client.post(
            "/v1/agent/events",
            headers=headers,
            json={"plan_id": plan["plan_id"], "event_id": "r-1", "message": "temples and food"},
        )
        assert research.status_code == 200
        response = client.post(
            "/v1/agent/events",
            headers=headers,
            json={
                "plan_id": plan["plan_id"],
                "event_id": "s-1",
                "message": "ignored",
                "candidate_action": {"action": "inspect", "evidence_ids": ["e-1"]},
            },
        )
    assert response.status_code == 200
    assert response.json()["status"] == "source_detail"
    assert "https://example.test/kyoto" in response.text


class _FakeGateway:
    def __init__(self, payload: dict | Exception):
        self.calls = []
        self.payload = payload

    async def call_tool(self, name: str, arguments: dict) -> dict:
        self.calls.append((name, arguments))
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


def test_claude_adapter_calls_gateway_with_verified_plan_context():
    fake = _FakeGateway({"status": "ready", "run_id": "r-1", "candidates": []})
    captured = {}

    def gateway_factory(url: str, token: str) -> _FakeGateway:
        captured.update(url=url, token=token)
        return fake

    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", gateway_factory=gateway_factory)
    result = asyncio.run(
        adapter.research(
            message="food",
            traveler_scope="traveler-1",
            plan_id="plan-1",
            event_id="e-1",
            authorization_token="cognito",
        )
    )
    assert result["run_id"] == "r-1"
    assert captured == {"url": "https://gateway.example/mcp", "token": "cognito"}
    assert fake.calls == [
        (
            "research_destination_candidates",
            {
                "theme": "food",
                "traveler_scope": "traveler-1",
                "plan_id": "plan-1",
                "request_id": "e-1",
                "research_intent": "destination_discovery",
            },
        )
    ]


def test_claude_adapter_propagates_gateway_protocol_failure():
    fake = _FakeGateway(GatewayProtocolError("Gateway MCP request failed"))
    adapter = ClaudeGatewayAdapter(
        "https://gateway.example/mcp", gateway_factory=lambda url, token: fake
    )
    with pytest.raises(GatewayProtocolError):
        asyncio.run(
            adapter.research(
                message="food",
                traveler_scope="traveler-1",
                plan_id="plan-1",
                event_id="e-1",
                authorization_token="cognito",
            )
        )


def test_claude_adapter_requires_verified_token_and_configured_gateway():
    fake = _FakeGateway({"status": "ready"})
    captured = []
    adapter = ClaudeGatewayAdapter(
        "https://gateway.example/mcp",
        gateway_factory=lambda url, token: captured.append((url, token)) or fake,
    )
    with pytest.raises(GatewayProtocolError, match="verified Cognito token"):
        asyncio.run(
            adapter.research(
                message="food",
                traveler_scope="traveler-1",
                plan_id="plan-1",
                event_id="e-1",
                authorization_token="",
            )
        )
    assert captured == []

    unconfigured = ClaudeGatewayAdapter("", gateway_factory=lambda url, token: fake)
    with pytest.raises(GatewayProtocolError, match="Gateway is not configured"):
        asyncio.run(
            unconfigured.research(
                message="food",
                traveler_scope="traveler-1",
                plan_id="plan-1",
                event_id="e-1",
                authorization_token="cognito",
            )
        )


def test_candidate_actions_validate_and_preserve_plan_scoped_shortlist():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    headers = {"Authorization": "Bearer good"}
    with TestClient(app) as client:
        base = client.post(
            "/v1/agent/events",
            headers=headers,
            json={"plan_id": plan["plan_id"], "event_id": "r-1", "message": "temples and food"},
        )
        assert base.json()["candidates"][0]["candidate_id"] == "c-1"
        explore = client.post(
            "/v1/agent/events",
            headers=headers,
            json={
                "plan_id": plan["plan_id"],
                "event_id": "e-1",
                "message": "",
                "candidate_action": {"action": "explore", "candidate_id": "c-1"},
            },
        )
        assert explore.json()["candidates"][0]["name"] == "Kyoto"
        reject = client.post(
            "/v1/agent/events",
            headers=headers,
            json={
                "plan_id": plan["plan_id"],
                "event_id": "x-1",
                "message": "",
                "candidate_action": {
                    "action": "reject",
                    "candidate_id": "c-1",
                    "reason": "too far",
                },
            },
        )
        assert reject.json()["candidates"] == []
        assert (
            client.post(
                "/v1/agent/events",
                headers=headers,
                json={
                    "plan_id": plan["plan_id"],
                    "event_id": "bad-1",
                    "message": "",
                    "candidate_action": {"action": "inspect", "evidence_ids": ["unknown"]},
                },
            ).status_code
            == 422
        )
