"""Model adapter using Bedrock by default or OpenAI directly."""

from __future__ import annotations

import inspect
import json
import os
import re
from typing import Any

from anthropic import AsyncAnthropicBedrock
from openai import AsyncOpenAI

from ..turn import TurnContext, load_prompt

DEFAULT_MODEL = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
DEFAULT_PROVIDER = "bedrock"


def _json_string_field(raw: str, key: str) -> tuple[str, bool] | None:
    marker = f'"{key}"'
    key_at = raw.find(marker)
    if key_at < 0:
        return None
    colon = raw.find(":", key_at + len(marker))
    if colon < 0:
        return None
    start = colon + 1
    while start < len(raw) and raw[start].isspace():
        start += 1
    if start >= len(raw) or raw[start] != '"':
        return None
    escaped = False
    index = start + 1
    closed = False
    while index < len(raw):
        char = raw[index]
        if escaped:
            escaped = False
            if char == "u":
                if index + 4 >= len(raw):
                    break
                if not re.fullmatch(r"[0-9a-fA-F]{4}", raw[index + 1:index + 5]):
                    return None
                index += 4
        elif char == "\\":
            escaped = True
        elif char == '"':
            closed = True
            break
        index += 1
    fragment = raw[start:index + 1] if closed else raw[start:index]
    if not closed and fragment.endswith("\\"):
        fragment = fragment[:-1]
    try:
        value = json.loads(fragment if closed else f'{fragment}"')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    if isinstance(value, str) and value and 0xD800 <= ord(value[-1]) <= 0xDFFF:
        value = value[:-1]
    return value, closed


class _AssistantTextStream:
    """Extract only the assistant_text string from a constrained JSON stream."""

    def __init__(self, on_text_delta):
        self.raw = ""
        self.sent = ""
        self.on_text_delta = on_text_delta

    async def feed(self, delta: str) -> None:
        self.raw += delta
        decision = _json_string_field(self.raw, "decision")
        if not decision or not decision[1] or decision[0] not in {"question", "respond"}:
            return
        text = _json_string_field(self.raw, "assistant_text")
        if not text:
            return
        value = text[0]
        if not value.startswith(self.sent):
            return
        chunk = value[len(self.sent):]
        self.sent = value
        if chunk and self.on_text_delta:
            result = self.on_text_delta(chunk)
            if inspect.isawaitable(result):
                await result


class ClaudeMessagesClient:
    """Invoke a model through one explicitly configured provider."""

    def __init__(
        self,
        *,
        model: str | None = None,
        provider: str | None = None,
        sdk_client: Any | None = None,
    ) -> None:
        selected_provider = (
            (provider or os.getenv("AGENT_MODEL_PROVIDER") or DEFAULT_PROVIDER).strip().lower()
        )
        if selected_provider not in {"bedrock", "openai"}:
            raise ValueError("AGENT_MODEL_PROVIDER must be 'bedrock' or 'openai'.")

        self.provider = "amazon-bedrock" if selected_provider == "bedrock" else "openai"
        self._api_key = (
            (os.getenv("OPENAI_API_KEY") or "").strip() if selected_provider == "openai" else None
        )
        if selected_provider == "openai" and not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is required when AGENT_MODEL_PROVIDER=openai.")

        if model:
            self.model = model
        elif selected_provider == "openai":
            self.model = (os.getenv("OPENAI_MODEL_ID") or "").strip() or DEFAULT_OPENAI_MODEL
        else:
            self.model = (os.getenv("BEDROCK_MODEL_ID") or "").strip() or DEFAULT_MODEL
        self.region = (
            os.getenv("BEDROCK_REGION")
            or os.getenv("AWS_REGION")
            or os.getenv("AWS_DEFAULT_REGION")
        )
        self.sdk_client = sdk_client

    def _client(self) -> Any:
        if self.sdk_client is None:
            if self.provider == "openai":
                self.sdk_client = AsyncOpenAI(api_key=self._api_key)
                return self.sdk_client

            api_key = (os.getenv("AWS_BEARER_TOKEN_BEDROCK") or "").strip() or None
            if api_key is None:
                # The SDK re-reads this variable when api_key=None; remove an
                # empty Compose value so it can use the configured AWS profile.
                os.environ.pop("AWS_BEARER_TOKEN_BEDROCK", None)
            self.sdk_client = AsyncAnthropicBedrock(
                api_key=api_key,
                aws_profile=(os.getenv("AWS_PROFILE") or None) if api_key is None else None,
                aws_region=self.region,
            )
        return self.sdk_client

    async def complete(
        self,
        *,
        message: str,
        system: str | None = None,
        messages: list[dict[str, str]] | None = None,
        max_tokens: int = 1200,
    ) -> Any:
        input_messages = messages or [{"role": "user", "content": message}]
        if self.provider == "openai":
            request: dict[str, Any] = {
                "model": self.model,
                "max_output_tokens": max_tokens,
                "input": input_messages,
                # LangGraph/PostgreSQL own conversation state; don't retain a
                # second copy in the model provider.
                "store": False,
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "travella_conversation_decision",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "decision": {
                                    "type": "string",
                                    "enum": ["question", "research", "respond"],
                                },
                                "assistant_text": {"type": "string"},
                                "question": {"type": ["string", "null"]},
                            },
                            "required": ["decision", "assistant_text", "question"],
                            "additionalProperties": False,
                        },
                    }
                },
            }
            if system:
                request["instructions"] = system
            return await self._client().responses.create(**request)

        request: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": input_messages,
        }
        if system:
            request["system"] = system
        return await self._client().messages.create(**request)

    async def conversation(
        self, *, message: str, context: TurnContext, on_text_delta=None
    ) -> dict[str, Any]:
        if on_text_delta:
            return await self._stream_conversation(message=message, context=context, on_text_delta=on_text_delta)
        response = await self.complete(
            message=message,
            system=load_prompt("conversation-v1"),
            messages=context.messages(message),
        )
        if self.provider == "openai":
            text = str(self.value(response, "output_text", "")).strip()
        else:
            text = "\n".join(
                str(self.value(block, "text", ""))
                for block in self.blocks(response)
                if self.value(block, "text", "")
            ).strip()
        try:
            decision = json.loads(text)
        except (TypeError, ValueError):
            decision = {}
        if not isinstance(decision, dict):
            decision = {}
        selected = decision.get("decision")
        if selected not in {"question", "research", "respond"}:
            selected = "respond"
        question = decision.get("question")
        return {
            "decision": selected,
            "assistant_text": str(decision.get("assistant_text", text))[:2000],
            "question": str(question)[:500] if question else None,
        }

    async def _stream_conversation(self, *, message: str, context: TurnContext, on_text_delta) -> dict[str, Any]:
        messages = context.messages(message)
        system = load_prompt("conversation-v1")
        parser = _AssistantTextStream(on_text_delta)
        if self.provider == "openai":
            request: dict[str, Any] = {
                "model": self.model,
                "max_output_tokens": 1200,
                "input": messages,
                "store": False,
                "stream": True,
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "travella_conversation_decision",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "decision": {"type": "string", "enum": ["question", "research", "respond"]},
                                "assistant_text": {"type": "string"},
                                "question": {"type": ["string", "null"]},
                            },
                            "required": ["decision", "assistant_text", "question"],
                            "additionalProperties": False,
                        },
                    }
                },
                "instructions": system,
            }
            stream = await self._client().responses.create(**request)
            if hasattr(stream, "__aiter__"):
                async for event in stream:
                    if self.value(event, "type") == "response.output_text.delta":
                        await parser.feed(str(self.value(event, "delta", "")))
            else:
                output = str(self.value(stream, "output_text", ""))
                parser.raw = output
        else:
            client = self._client()
            if not hasattr(getattr(client, "messages", None), "stream"):
                result = await self.conversation(message=message, context=context)
                await self._emit_full_text(result, on_text_delta)
                return result
            request = {
                "model": self.model,
                "max_tokens": 1200,
                "messages": messages,
                "system": system,
            }
            async with client.messages.stream(**request) as stream:
                async for delta in stream.text_stream:
                    await parser.feed(str(delta))
                final_message = await stream.get_final_message()
            raw = "\\n".join(
                str(self.value(block, "text", ""))
                for block in self.blocks(final_message)
                if self.value(block, "text", "")
            ).strip()
            if raw:
                parser.raw = raw

        try:
            decision = json.loads(parser.raw)
        except (TypeError, ValueError):
            decision = None
        if not isinstance(decision, dict) or decision.get("decision") not in {"question", "research", "respond"} or not isinstance(decision.get("assistant_text"), str):
            return {"decision": "respond", "assistant_text": "I couldn’t complete that reply. Please try again.", "question": None}
        assistant_text = decision["assistant_text"][:2000]
        if decision["decision"] in {"question", "respond"} and assistant_text.startswith(parser.sent):
            await self._emit_full_text({"assistant_text": assistant_text[len(parser.sent):]}, on_text_delta)
        return {
            "decision": decision["decision"],
            "assistant_text": assistant_text,
            "question": str(decision["question"])[:500] if decision.get("question") else None,
        }

    @staticmethod
    async def _emit_full_text(result: dict[str, Any], on_text_delta) -> None:
        text = str(result.get("assistant_text") or result.get("question") or "")
        for start in range(0, len(text), 28):
            value = on_text_delta(text[start:start + 28])
            if inspect.isawaitable(value):
                await value

    @staticmethod
    def blocks(response: Any) -> list[Any]:
        blocks = getattr(response, "content", None)
        if blocks is None and isinstance(response, dict):
            blocks = response.get("content")
        return blocks if isinstance(blocks, list) else []

    @staticmethod
    def value(value: Any, name: str, default: Any = None) -> Any:
        return (
            value.get(name, default) if isinstance(value, dict) else getattr(value, name, default)
        )
