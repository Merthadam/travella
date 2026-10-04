from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

from services.agent.claude.messages import ClaudeMessagesClient
from services.agent.graph.nodes.onboarding_intake import OnboardingIntakeNode
from services.agent.graph.onboarding import build_onboarding_intake_graph


class IntakeModel:
    def __init__(self, result):
        self.result = result
        self.calls = []

    async def collect_onboarding_answers(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


def test_intake_node_returns_only_explicit_candidate_from_user_quote():
    quote = "I usually fly from Budapest"
    model = IntakeModel(
        {
            "action": "candidate",
            "assistant_text": "Should I keep Budapest as your usual departure city?",
            "answer_candidates": [
                {"topic": "departure_base", "value": "Budapest", "source_quote": quote}
            ],
        }
    )
    node = OnboardingIntakeNode(model)

    result = asyncio.run(node({"messages": [{"role": "user", "content": quote}]}))

    assert result["action"] == "candidate"
    assert result["answer_candidates"] == [
        {"topic": "departure_base", "value": "Budapest", "source_quote": quote}
    ]
    assert list(model.calls[0]) == ["messages"]


def test_intake_node_rejects_inferred_or_untrusted_candidates():
    model = IntakeModel(
        {
            "action": "candidate",
            "assistant_text": "What city do you usually leave from?",
            "answer_candidates": [
                {
                    "topic": "departure_base",
                    "value": "Budapest",
                    "source_quote": "I usually leave from Budapest",
                },
                {
                    "topic": "passport_number",
                    "value": "X1234567",
                    "source_quote": "My passport is X1234567",
                },
                {
                    "topic": "food_needs",
                    "value": "vegan",
                    "source_quote": "I am vegan",
                },
            ],
        }
    )
    node = OnboardingIntakeNode(model)

    result = asyncio.run(
        node(
            {
                "messages": [
                    {"role": "user", "content": "I usually leave from Budapest"},
                    {"role": "user", "content": "I am vegan"},
                    {"role": "assistant", "content": "Should I keep that?"},
                ],
                "profile": {"departure_base": "ignored"},
            }
        )
    )

    assert result["action"] == "candidate"
    assert result["answer_candidates"] == [
        {"topic": "food_needs", "value": "vegan", "source_quote": "I am vegan"}
    ]
    assert "profile" not in model.calls[0]


def test_intake_node_falls_back_to_one_question_when_output_is_invalid():
    model = IntakeModel(
        {
            "action": "candidate",
            "assistant_text": "What matters?",
            "answer_candidates": [
                {"topic": "departure_base", "value": "Rome", "source_quote": "I live in Rome"}
            ],
        }
    )
    node = OnboardingIntakeNode(model)

    result = asyncio.run(node({"messages": [{"role": "user", "content": "Tell me more"}]}))

    assert result == {
        "action": "ask",
        "assistant_text": "What matters?",
        "answer_candidates": [],
    }


def test_intake_finish_drops_candidates_and_graph_ends_after_one_node():
    model = IntakeModel(
        {
            "action": "finish",
            "assistant_text": "We can start your Plan whenever you are ready.",
            "answer_candidates": [
                {
                    "topic": "departure_base",
                    "value": "Budapest",
                    "source_quote": "I fly from Budapest",
                }
            ],
        }
    )
    graph = build_onboarding_intake_graph(model)

    result = asyncio.run(
        graph.ainvoke({"messages": [{"role": "user", "content": "Skip this"}]})
    )

    assert result["action"] == "finish"
    assert result["answer_candidates"] == []
    assert len(model.calls) == 1


def test_openai_intake_call_uses_structured_output_without_registering_tools(monkeypatch):
    class FakeResponses:
        def __init__(self):
            self.calls = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(output_text=json.dumps({"action": "ask"}))

    fake = SimpleNamespace(responses=FakeResponses())
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    client = ClaudeMessagesClient(provider="openai", model="gpt-6-luna", sdk_client=fake)

    asyncio.run(
        client.collect_onboarding_answers(messages=[{"role": "user", "content": "I like food"}])
    )

    request = fake.responses.calls[0]
    assert request["store"] is False
    assert "tools" not in request
    assert request["text"]["format"]["strict"] is True
    assert "only job is to ask concise questions" in request["instructions"]


def test_bedrock_intake_call_does_not_register_tools(monkeypatch):
    class FakeMessages:
        def __init__(self):
            self.calls = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(content=[SimpleNamespace(text=json.dumps({"action": "ask"}))])

    fake = SimpleNamespace(messages=FakeMessages())
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "bedrock")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = ClaudeMessagesClient(provider="bedrock", sdk_client=fake)

    asyncio.run(
        client.collect_onboarding_answers(messages=[{"role": "user", "content": "I like food"}])
    )

    request = fake.messages.calls[0]
    assert "tools" not in request
    assert "only job is to ask concise questions" in request["system"]
