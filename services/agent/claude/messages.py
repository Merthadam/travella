"""Model adapter using Bedrock by default or OpenAI directly."""

from __future__ import annotations

import json
import os
from typing import Any

from anthropic import AsyncAnthropicBedrock
from openai import AsyncOpenAI

from ..turn import TurnContext, load_prompt

DEFAULT_MODEL = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
DEFAULT_PROVIDER = "bedrock"


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

    async def conversation(self, *, message: str, context: TurnContext) -> dict[str, Any]:
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
