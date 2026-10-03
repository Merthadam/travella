from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from services.agent.claude import ClaudeGatewayAdapter
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
                    text='{"decision":"research","assistant_text":"I can research destinations for food and temples."}',
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
