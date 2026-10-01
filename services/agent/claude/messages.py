"""Anthropic Messages SDK client and response decoding."""

from __future__ import annotations

import json
import os
from typing import Any

from anthropic import AsyncAnthropic

from ..turn import TurnContext, load_prompt
from .protocol import ALLOWED_TOOLS, GatewayProtocolError


class ClaudeMessagesClient:
    """Own SDK construction, system prompts, MCP connector config, and block decoding."""

    def __init__(self, gateway_url: str, *, model: str = "claude-sonnet-4-5", sdk_client: Any | None = None) -> None:
        self.gateway_url = gateway_url
        self.model = model
        self.sdk_client = sdk_client

    def _client(self) -> Any:
        if self.sdk_client is not None:
            return self.sdk_client
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required for the Anthropic API provider")
        return AsyncAnthropic(api_key=api_key)

    def _mcp_server(self, authorization_token: str) -> dict[str, Any]:
        return {
            "type": "url",
            "name": "travella-gateway",
            "url": self.gateway_url,
            "authorization_token": authorization_token,
            "tool_configuration": {"enabled": True, "allowed_tools": list(ALLOWED_TOOLS)},
        }

    async def complete(
        self,
        *,
        message: str,
        authorization_token: str,
        system: str | None = None,
        messages: list[dict[str, str]] | None = None,
    ) -> Any:
        return await self._client().beta.messages.create(
            model=self.model,
            max_tokens=1200,
            system=system or load_prompt("research-v1"),
            messages=messages or [{"role": "user", "content": message}],
            mcp_servers=[self._mcp_server(authorization_token)],
            tools=[{
                "type": "mcp_toolset",
                "mcp_server_name": "travella-gateway",
                "default_config": {"enabled": True},
                "configs": {},
            }],
        )

    async def conversation(self, *, message: str, context: TurnContext, authorization_token: str) -> dict[str, Any]:
        response = await self.complete(
            message=message,
            authorization_token=authorization_token,
            system=load_prompt("conversation-v1"),
            messages=context.messages(message),
        )
        text = "\n".join(
            str(self.value(block, "text", ""))
            for block in self.blocks(response)
            if self.value(block, "type") == "text" and self.value(block, "text", "")
        ).strip()
        decision = "research" if any(word in text.lower() for word in ("research", "shortlist", "destination")) else "respond"
        question = text.rsplit("?", 1)[0].split("\n")[-1].strip() + "?" if "?" in text else None
        return {"decision": decision, "assistant_text": text[:2000], "question": question}

    @staticmethod
    def blocks(response: Any) -> list[Any]:
        blocks = getattr(response, "content", None)
        if blocks is None and isinstance(response, dict):
            blocks = response.get("content")
        return blocks if isinstance(blocks, list) else []

    @staticmethod
    def value(value: Any, name: str, default: Any = None) -> Any:
        return value.get(name, default) if isinstance(value, dict) else getattr(value, name, default)

    @classmethod
    def decode_payload(cls, value: Any) -> dict[str, Any] | None:
        if isinstance(value, dict):
            for field in ("structuredContent", "structured_content"):
                if isinstance(value.get(field), dict):
                    return value[field]
            text = value.get("text")
            if isinstance(text, str):
                try:
                    decoded = json.loads(text)
                except (TypeError, ValueError):
                    return None
                return decoded if isinstance(decoded, dict) else None
            return value
        if isinstance(value, str):
            try:
                decoded = json.loads(value)
            except (TypeError, ValueError):
                return None
            return decoded if isinstance(decoded, dict) else None
        return None

    @classmethod
    def extract_tool_result(cls, response: Any, expected_tool: str) -> dict[str, Any]:
        for block in cls.blocks(response):
            if cls.value(block, "type") not in {"mcp_tool_result", "tool_result"}:
                continue
            tool_name = cls.value(block, "name") or cls.value(block, "tool_name")
            if tool_name and tool_name != expected_tool:
                continue
            if cls.value(block, "is_error", False) or cls.value(block, "error"):
                raise GatewayProtocolError("Claude MCP tool returned an error")
            payload = cls.decode_payload(cls.value(block, "result"))
            if payload is None:
                for item in cls.value(block, "content", []):
                    payload = cls.decode_payload(item)
                    if payload is not None:
                        break
            if isinstance(payload, dict):
                return payload
            raise GatewayProtocolError("Claude MCP tool result was malformed")
        raise GatewayProtocolError("Claude did not invoke the required MCP tool")
