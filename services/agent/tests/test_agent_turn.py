from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import pytest

from services.agent.claude import ClaudeGatewayAdapter
from services.agent.state.contracts import ResearchDecision
from services.agent.turn import TurnContext, load_prompt


@pytest.fixture(autouse=True)
def _bedrock_isolated_provider_configuration(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "bedrock")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


class FakeMessages:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            content=[
                SimpleNamespace(
                    type="text",
                    text='{"decision":"research","research_intent":"destination_discovery","assistant_text":"I can research destinations for food and temples."}',
                )
            ]
        )


class FakeClient:
    def __init__(self):
        self.messages = FakeMessages()


def test_turn_context_bounds_history_and_excludes_inactive_brief():
    context = TurnContext(
        traveler_scope="traveler-1",
        plan_id="plan-1",
        plan_revision=3,
        brief={
            "interests": {"value": "food", "active": True},
            "old": {"value": "skiing", "active": False},
        },
        recent_messages=tuple({"role": "user", "content": str(i)} for i in range(20)),
    )
    bounded = context.bounded()
    assert "old" not in bounded.brief
    assert len(bounded.recent_messages) == 12


def test_conversation_uses_versioned_system_prompt_and_bounded_messages():
    fake = FakeClient()
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
    context = TurnContext(traveler_scope="traveler-1", plan_id="plan-1", plan_revision=2)
    result = asyncio.run(
        adapter.complete_conversation(
            message="food in spring", context=context, authorization_token="secret"
        )
    )
    call = fake.messages.calls[0]
    assert call["system"] == load_prompt("conversation-v1")
    assert call["messages"][-1]["role"] == "user"
    assert "food in spring" in call["messages"][-1]["content"]
    assert call["model"].startswith("global.anthropic.claude-sonnet-4-5")
    assert result["assistant_text"]
    assert result["research_intent"] == "destination_discovery"
    assert "secret" not in str(call["messages"])


def test_conversation_fails_closed_to_respond_on_malformed_model_decision():
    fake = FakeClient()

    async def malformed_create(**kwargs):
        return SimpleNamespace(content=[SimpleNamespace(type="text", text="not json")])

    fake.messages.create = malformed_create
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
    context = TurnContext(traveler_scope="traveler-1", plan_id="plan-1")

    result = asyncio.run(
        adapter.complete_conversation(message="food", context=context, authorization_token="secret")
    )

    assert result["decision"] == "respond"
    assert result["assistant_text"] == "not json"


def test_research_decision_accepts_only_bounded_answer_or_targeted_refinement():
    answer = ResearchDecision.parse(
        '{"action":"answer","answer":"Supported fact.","query":null,"gap":null,'
        '"evidence_ids":["source-1"],"uncertainty":["One detail is unknown."]}',
        evidence_ids={"source-1"},
    )
    refine = ResearchDecision.parse(
        '{"action":"refine","answer":null,"query":"Spain rail pass dates",'
        '"gap":"The page does not state current validity dates.",'
        '"evidence_ids":["source-1"],"uncertainty":[]}',
        evidence_ids={"source-1"},
    )

    assert answer and answer.action == "answer"
    assert refine and refine.action == "refine" and refine.query == "Spain rail pass dates"


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        '{"action":"tool","answer":"x","query":null,"gap":null,"evidence_ids":[],"uncertainty":[]}',
        '{"action":"answer","answer":"x","query":null,"gap":null,"evidence_ids":["foreign"],"uncertainty":[]}',
        '{"action":"refine","answer":null,"query":" ","gap":"gap","evidence_ids":[],"uncertainty":[]}',
        '{"action":"refine","answer":null,"query":"' + ("x" * 301) + '","gap":"gap","evidence_ids":[],"uncertainty":[]}',
    ],
)
def test_research_decision_rejects_malformed_unknown_or_oversized_output(raw):
    assert ResearchDecision.parse(raw, evidence_ids={"source-1"}) is None


def test_research_prompt_scopes_high_consequence_answers_and_uses_bedrock_messages_api():
    prompt = load_prompt("research-v1")
    assert "passport" in prompt and "purpose" in prompt and "transit" in prompt and "dates" in prompt
    assert "clinician" in prompt
    assert "untrusted data" in prompt

    fake = FakeClient()
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
    result = asyncio.run(
        adapter.messages.research_answer(
            message="What should I know about Spain?",
            page_read={
                "evidence": [{
                    "evidence_id": "source-1",
                    "title": "Spain",
                    "url": "https://example.test/spain",
                    "retrieved_at": "2026-10-04T00:00:00Z",
                    "read_status": "read",
                    "content": "Spain is in Europe.",
                }]
            },
            on_text_delta=None,
        )
    )
    call = fake.messages.calls[-1]
    assert call["model"].startswith("global.anthropic.claude-sonnet-4-5")
    assert "response_format" not in call and "output_config" not in call
    assert result["action"] == "invalid"


def test_research_synthesis_receives_candidates_only_for_destination_discovery():
    async def run(intent, candidates):
        fake = FakeClient()

        async def answer_create(**kwargs):
            fake.messages.calls.append(kwargs)
            return SimpleNamespace(content=[SimpleNamespace(
                type="text",
                text='{"action":"answer","answer":"Supported answer.","query":null,"gap":null,"evidence_ids":["source-1"],"uncertainty":[]}',
            )])

        fake.messages.create = answer_create
        adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", sdk_client=fake)
        result = await adapter.messages.research_answer(
            message="Where should I go?",
            page_read={"evidence": [{
                "evidence_id": "source-1", "title": "Travel guide", "url": "https://example.test/guide",
                "read_status": "read", "content": "A bounded source page.",
            }]},
            research_intent=intent,
            candidates=candidates,
        )
        request = json.loads(fake.messages.calls[0]["messages"][-1]["content"])
        return result, request

    candidates = [
        {"candidate_id": "candidate-1", "name": "Tarifa"},
        {"candidate_id": "candidate-2", "name": "Cadiz"},
    ]
    discovery_result, discovery_request = asyncio.run(run("destination_discovery", candidates))
    factual_result, factual_request = asyncio.run(run("factual_research", []))

    assert discovery_result["action"] == factual_result["action"] == "answer"
    assert discovery_request["destination_candidates"] == candidates
    assert factual_request["destination_candidates"] == []
