from __future__ import annotations

import asyncio
from types import SimpleNamespace

from services.agent.claude import ClaudeGatewayAdapter
from services.agent.turn import TurnContext, load_prompt


class FakeMessages:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text="I can research destinations for food and temples.")])


class FakeClient:
    def __init__(self):
        self.messages = FakeMessages()
        self.beta = SimpleNamespace(messages=self.messages)


def test_turn_context_bounds_history_and_excludes_inactive_brief():
    context = TurnContext(
        traveler_scope="traveler-1", plan_id="plan-1", plan_revision=3,
        brief={"interests": {"value": "food", "active": True}, "old": {"value": "skiing", "active": False}},
        recent_messages=tuple({"role": "user", "content": str(i)} for i in range(20)),
    )
    bounded = context.bounded()
    assert "old" not in bounded.brief
    assert len(bounded.recent_messages) == 12


def test_conversation_uses_versioned_system_prompt_and_bounded_messages():
    fake = FakeClient()
    adapter = ClaudeGatewayAdapter("https://gateway.example/mcp", anthropic_client=fake)
    context = TurnContext(traveler_scope="traveler-1", plan_id="plan-1", plan_revision=2)
    result = asyncio.run(adapter.complete_conversation(message="food in spring", context=context, authorization_token="secret"))
    call = fake.messages.calls[0]
    assert call["system"] == load_prompt("conversation-v1")
    assert call["messages"][-1]["role"] == "user"
    assert "food in spring" in call["messages"][-1]["content"]
    assert result["assistant_text"]
    assert "secret" not in call["messages"][-1]["content"]
