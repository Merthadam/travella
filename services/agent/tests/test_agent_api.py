from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.agent.claude import ClaudeGatewayAdapter, GatewayProtocolError
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanCandidateStore, ProcessReceiptCache
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


def _app(adapter=None, *, plan=None, memory_adapter=None):
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

    return create_app(
        research_backend="legacy",
        verifier=verifier,
        plan_reader=reader,
        adapter=adapter or FakeAdapter(),
        memory_adapter=memory_adapter,
    ), plan


def test_profile_memory_sync_uses_verified_identity_and_safe_status():
    class Memory:
        enabled = True

        def __init__(self):
            self.calls = []

        async def sync_profile(self, subject, profile):
            self.calls.append((subject, profile))
            return True

        async def retrieve_relevant_memory(self, subject, topic):
            return None

    memory = Memory()
    app, _ = _app(memory_adapter=memory)
    payload = {
        "departure_base": "Budapest",
        "citizenships": ["Hungarian"],
        "food_needs": "Peanut allergy",
        "accessibility_needs": "",
        "travel_interests": "Museums",
        "updated_at": "2026-10-04T10:00:00Z",
    }
    with TestClient(app) as client:
        assert client.put("/v1/agent/traveler-profile/memory", json=payload).status_code == 401
        response = client.put(
            "/v1/agent/traveler-profile/memory",
            headers={"Authorization": "Bearer good"},
            json=payload,
        )

    assert response.status_code == 200
    assert response.json() == {"status": "synced"}
    assert memory.calls == [("traveler-1", payload)]


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

    app = create_app(research_backend="legacy", verifier=verifier, plan_reader=reader, adapter=FakeAdapter())
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
        async def invoke(self, state, *, authorization_token, traveler_profile=None, on_text_delta=None):
            assert state["message"] == "Plan Kyoto"
            if on_text_delta:
                await on_text_delta("Where to?")
            return {"projection": {
                "status": "needs your input", "plan_id": state["plan_id"],
                "event_id": state["event_id"], "generation": state["generation"],
                "assistant_text": "Where to?",
            }}

    app = create_app(research_backend="legacy", verifier=verifier, plan_reader=reader, adapter=FakeAdapter(), graph=Graph())
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


def test_plan_stream_projects_only_cited_read_sources_beneath_the_answer():
    identity = ValidatedIdentity("traveler-1", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999)
    plan = {"plan_id": str(uuid4()), "lifecycle": "active", "revision": 1}

    def verifier(token):
        assert token == "good"
        return identity

    def reader(subject, plan_id, token):
        return plan if subject == identity.subject and str(plan_id) == plan["plan_id"] else None

    class Graph:
        async def invoke(
            self, state, *, authorization_token, traveler_profile=None, on_text_delta=None
        ):
            if on_text_delta:
                await on_text_delta("Valencia has several central markets.")
            evidence = [
                {"evidence_id": "read-1", "read_status": "read", "title": "Market guide", "url": "https://example.test/market", "content": "private page body"},
                {"evidence_id": "expired-1", "read_status": "read", "title": "Expired", "url": "https://example.test/expired", "expires_at": 1, "content": "expired body"},
                {"evidence_id": "malformed-1", "read_status": "read", "title": "Malformed", "url": "https://user:pass@example.test:bad/page"},
                {"evidence_id": "unread-1", "read_status": "unavailable", "title": "Unread", "url": "https://example.test/unread"},
            ]
            refs = [
                {"evidence_id": evidence_id, "title": title, "url": url}
                for evidence_id, title, url in [
                    ("read-1", "Market guide", "https://attacker.test/replaced"),
                    ("expired-1", "Expired", "https://example.test/expired"),
                    ("malformed-1", "Malformed", "https://example.test/malformed"),
                    ("unread-1", "Unread", "https://example.test/unread"),
                    ("foreign-1", "Foreign", "https://example.test/foreign"),
                ]
            ]
            return {
                "research_evidence": evidence,
                "research_evidence_ids": ["read-1", "expired-1", "malformed-1", "unread-1"],
                "projection": {
                    "status": "shortlist_ready",
                    "plan_id": state["plan_id"],
                    "event_id": state["event_id"],
                    "generation": state["generation"],
                    "assistant_text": "Valencia has several central markets.",
                    "candidates": [{"candidate_id": "candidate-1", "name": "Valencia"}],
                    "sources": refs,
                },
            }

    app = create_app(research_backend="legacy", verifier=verifier, plan_reader=reader, adapter=FakeAdapter(), graph=Graph())
    with TestClient(app) as client:
        response = client.post(
            f"/v1/agent/plans/{plan['plan_id']}/events/stream",
            headers={"Authorization": "Bearer good"},
            json={"plan_id": plan["plan_id"], "event_id": "source-stream", "message": "Markets in Valencia?"},
        )

    assert response.status_code == 200
    events = [json.loads(line.removeprefix("data: ")) for line in response.text.splitlines() if line.startswith("data: ")]
    content_index = next(index for index, event in enumerate(events) if event["type"] == "TEXT_MESSAGE_CONTENT")
    end_index = next(index for index, event in enumerate(events) if event["type"] == "TEXT_MESSAGE_END")
    terminal_index = next(index for index, event in enumerate(events) if event["type"] == "TERMINAL")
    assert content_index < end_index < terminal_index
    assert events[terminal_index]["sources"] == [{"title": "Market guide", "url": "https://example.test/market"}]
    assert "private page body" not in response.text
    assert "foreign-1" not in response.text


@pytest.mark.parametrize("url", ["https://", "https://user@example.test/path", "https://example.test:bad/path", "https://example.test/a b"])
def test_research_source_projection_rejects_malformed_urls(url):
    sources = [{"evidence_id": "source-1", "title": "A source", "url": url}]
    evidence = [{"evidence_id": "source-1", "read_status": "read", "title": "A source", "url": url}]

    assert AgentTurnService._validated_research_sources(
        sources, evidence=evidence, evidence_ids=["source-1"]
    ) == []


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


def test_superseded_research_cannot_emit_late_text_or_sources():
    async def run():
        plan_id = str(uuid4())
        started = asyncio.Event()
        release = asyncio.Event()
        deltas = []

        class LateGraph:
            async def invoke(
                self, state, *, authorization_token, traveler_profile=None, on_text_delta=None
            ):
                started.set()
                await release.wait()
                if on_text_delta:
                    await on_text_delta("obsolete answer")
                return {"projection": {
                    "status": "shortlist_ready", "plan_id": state["plan_id"],
                    "event_id": state["event_id"], "generation": state["generation"],
                    "assistant_text": "obsolete answer",
                    "sources": [{"title": "Old source", "url": "https://example.test/old"}],
                }, "research_evidence": [], "research_evidence_ids": []}

        service = AgentTurnService(
            plan_reader=lambda *_args: {"plan_id": plan_id, "lifecycle": "active"},
            context_reader=None, graph=LateGraph(), tools=FakeAdapter(),
            candidates=PlanCandidateStore(), receipts=ProcessReceiptCache(),
        )
        request = AgentRequest(plan_id=plan_id, event_id="slow-event", message="Old question")
        task = asyncio.create_task(service.handle(request, "traveler-1", "Bearer good", on_text_delta=deltas.append))
        await started.wait()
        await service.candidates.reserve("traveler-1", plan_id, "newer-event")
        release.set()
        response = await task
        return response, deltas

    response, deltas = asyncio.run(run())
    assert response.status == "interrupted"
    assert response.sources == []
    assert deltas == []


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


def test_onboarding_endpoint_is_authenticated_and_tool_free():
    class IntakeModel:
        async def collect_onboarding_answers(self, *, messages):
            return {
                "action": "candidate",
                "assistant_text": "I’ll keep that in mind. Any food allergies?",
                "answer_candidates": [
                    {"topic": "departure_base", "value": "Budapest", "source_quote": "I live in Budapest"}
                ],
            }

    adapter = FakeAdapter()
    adapter.messages = IntakeModel()
    app, _ = _app(adapter)
    with TestClient(app) as client:
        denied = client.post("/v1/agent/onboarding/events", json={"messages": []})
        assert denied.status_code == 401
        allowed = client.post(
            "/v1/agent/onboarding/events",
            headers={"Authorization": "Bearer good"},
            json={"messages": [{"role": "user", "content": "I live in Budapest"}]},
        )
        assert allowed.status_code == 200
        assert allowed.json()["action"] == "candidate"
        assert allowed.json()["answer_candidates"] == [{"topic": "departure_base", "value": "Budapest"}]
        assert adapter.calls == 0
