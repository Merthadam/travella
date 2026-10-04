from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.agent.claude.adapter import ClaudeGatewayAdapter
from services.agent.claude.messages import ClaudeMessagesClient


class FakeMessages:
    def __init__(self, *, error: Exception | None = None) -> None:
        self.calls: list[dict] = []
        self.error = error

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(content=[SimpleNamespace(type="text", text="hello")])


class FakeResponses:
    def __init__(self, *, output_text: str = "hello", error: Exception | None = None) -> None:
        self.calls: list[dict] = []
        self.output_text = output_text
        self.error = error

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(output_text=self.output_text)


class FakeOpenAIClient:
    def __init__(self, **kwargs) -> None:
        self.options = kwargs
        self.responses = FakeResponses()


class FakeBedrockClient:
    def __init__(self, **kwargs) -> None:
        self.options = kwargs
        self.messages = FakeMessages()


def test_bedrock_is_default_and_uses_bedrock_model(monkeypatch):
    constructed = {}

    def fake_bedrock_client(**kwargs):
        constructed.update(kwargs)
        return FakeBedrockClient(**kwargs)

    monkeypatch.delenv("AGENT_MODEL_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "local-bedrock-token")
    monkeypatch.setattr("services.agent.claude.messages.AsyncAnthropicBedrock", fake_bedrock_client)
    monkeypatch.setattr(
        "services.agent.claude.messages.AsyncOpenAI",
        lambda **kwargs: pytest.fail("OpenAI client must not be selected"),
    )

    client = ClaudeMessagesClient()
    asyncio.run(client.complete(message="hello", system="system prompt"))

    assert client.provider == "amazon-bedrock"
    assert client.model == "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
    assert constructed["api_key"] == "local-bedrock-token"
    assert client.sdk_client.messages.calls == [
        {
            "model": client.model,
            "max_tokens": 1200,
            "messages": [{"role": "user", "content": "hello"}],
            "system": "system prompt",
        }
    ]


def test_openai_provider_uses_responses_api_and_structured_conversation(monkeypatch):
    constructed = {}
    fake_client = FakeOpenAIClient()
    fake_client.responses.output_text = (
        '{"decision":"question","assistant_text":"Which month?","question":"Which month?"}'
    )

    def fake_openai_client(**kwargs):
        constructed.update(kwargs)
        return fake_client

    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-openai-key")
    monkeypatch.setenv("OPENAI_MODEL_ID", "gpt-5.4-mini")
    monkeypatch.setattr("services.agent.claude.messages.AsyncOpenAI", fake_openai_client)
    monkeypatch.setattr(
        "services.agent.claude.messages.AsyncAnthropicBedrock",
        lambda **kwargs: pytest.fail("Bedrock client must not be selected"),
    )

    client = ClaudeMessagesClient()
    result = asyncio.run(
        client.conversation(
            message="Plan a trip",
            context=SimpleNamespace(
                messages=lambda message: [{"role": "user", "content": message}]
            ),
        )
    )

    assert client.provider == "openai"
    assert client.model == "gpt-5.4-mini"
    assert constructed == {"api_key": "test-only-openai-key"}
    call = fake_client.responses.calls[0]
    assert call["model"] == "gpt-5.4-mini"
    assert call["input"] == [{"role": "user", "content": "Plan a trip"}]
    assert call["instructions"]
    assert call["max_output_tokens"] == 1200
    assert call["store"] is False
    assert call["text"]["format"]["type"] == "json_schema"
    assert "tools" not in call
    assert result == {
        "decision": "question",
        "assistant_text": "Which month?",
        "question": "Which month?",
        "research_intent": None,
    }


def test_openai_stream_emits_only_assistant_text_after_decision(monkeypatch):
    class StreamingResponses:
        async def create(self, **kwargs):
            assert kwargs["stream"] is True

            async def events():
                yield SimpleNamespace(type="response.output_text.delta", delta='{"decision":"respond","assistant_text":"Hello, ')
                yield SimpleNamespace(type="response.output_text.delta", delta='traveler."}')

            return events()

    fake_client = FakeOpenAIClient()
    fake_client.responses = StreamingResponses()
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-openai-key")
    monkeypatch.setattr("services.agent.claude.messages.AsyncOpenAI", lambda **kwargs: fake_client)
    client = ClaudeMessagesClient()
    deltas = []

    result = asyncio.run(client.conversation(
        message="Hi", context=SimpleNamespace(messages=lambda message: [{"role": "user", "content": message}]),
        on_text_delta=deltas.append,
    ))

    assert result["assistant_text"] == "Hello, traveler."
    assert "".join(deltas) == "Hello, traveler."


def test_json_string_field_parses_escape_sequences_incrementally():
    from services.agent.claude.messages import _json_string_field

    assert _json_string_field('{"assistant_text":"A \\u263A"}', "assistant_text") == ("A ☺", True)
    assert _json_string_field('{"assistant_text":"line \\', "assistant_text") == ("line ", False)


def test_openai_model_defaults_when_model_override_is_unset(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-openai-key")
    monkeypatch.delenv("OPENAI_MODEL_ID", raising=False)

    assert ClaudeMessagesClient().model == "gpt-5.4-mini"


def test_unknown_provider_is_rejected_without_fallback(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "automatic")

    with pytest.raises(ValueError, match="AGENT_MODEL_PROVIDER"):
        ClaudeMessagesClient()


def test_openai_requires_nonempty_server_key_and_does_not_echo_values(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "  ")

    with pytest.raises(RuntimeError, match="OPENAI_API_KEY") as error:
        ClaudeMessagesClient()

    assert "  " not in str(error.value)


def test_openai_provider_health_reports_model_without_credentials(monkeypatch):
    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-openai-key")
    monkeypatch.setenv("OPENAI_MODEL_ID", "gpt-test")
    adapter = ClaudeGatewayAdapter("", sdk_client=FakeOpenAIClient())
    app = create_app(adapter=adapter)

    with TestClient(app) as client:
        health = client.get("/health").json()

    assert health["model_provider"] == "openai"
    assert health["model_id"] == "gpt-test"
    assert "test-only-openai-key" not in str(health)
    assert "OPENAI_API_KEY" not in health


def test_selected_provider_error_does_not_switch_to_bedrock(monkeypatch):
    bedrock_constructions = []
    direct_client = FakeOpenAIClient()
    direct_client.responses.error = RuntimeError("direct API unavailable")

    monkeypatch.setenv("AGENT_MODEL_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-openai-key")
    monkeypatch.setattr(
        "services.agent.claude.messages.AsyncOpenAI",
        lambda **kwargs: direct_client,
    )
    monkeypatch.setattr(
        "services.agent.claude.messages.AsyncAnthropicBedrock",
        lambda **kwargs: bedrock_constructions.append(kwargs),
    )

    client = ClaudeMessagesClient()
    with pytest.raises(RuntimeError, match="direct API unavailable"):
        asyncio.run(client.complete(message="hello"))

    assert bedrock_constructions == []
