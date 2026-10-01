"""Claude SDK adapter for the private AgentCore MCP Gateway."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Protocol

import httpx
from anthropic import AsyncAnthropic

from .turn import TurnContext, load_prompt

RESEARCH_TOOL = "research_destination_candidates"
MAP_TOOL = "resolve_candidate_locations"
SOURCE_TOOL = "get_candidate_sources"
ALLOWED_TOOLS = (RESEARCH_TOOL, MAP_TOOL, SOURCE_TOOL)


class AgentAdapter(Protocol):
    async def research(self, *, message: str, traveler_scope: str, plan_id: str, event_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...

    async def resolve_map(self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...

    async def sources(self, *, evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...


class GatewayProtocolError(RuntimeError):
    pass


class GatewayToolClient:
    """Small Streamable HTTP JSON-RPC client used by the local adapter and tests."""

    def __init__(self, url: str, authorization_token: str, *, client: httpx.AsyncClient | None = None) -> None:
        self.url = url
        self.authorization_token = authorization_token
        self.client = client
        self._request_id = 0

    async def call(self, method: str, params: dict[str, Any] | None = None) -> Any:
        self._request_id += 1
        payload = {"jsonrpc": "2.0", "id": self._request_id, "method": method, "params": params or {}}
        headers = {"Authorization": f"Bearer {self.authorization_token}", "Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
        own = self.client is None
        client = self.client or httpx.AsyncClient(timeout=30, follow_redirects=True)
        try:
            response = await client.post(self.url, json=payload, headers=headers)
            response.raise_for_status()
            data: Any = response.json()
            if isinstance(data, dict) and data.get("error"):
                raise GatewayProtocolError("Gateway MCP request failed")
            return data.get("result", data) if isinstance(data, dict) else data
        except (httpx.HTTPError, ValueError) as exc:
            raise GatewayProtocolError("Gateway MCP request failed") from exc
        finally:
            if own:
                await client.aclose()

    async def tools_list(self) -> list[dict[str, Any]]:
        result = await self.call("tools/list")
        tools = result.get("tools", []) if isinstance(result, dict) else []
        return [tool for tool in tools if isinstance(tool, dict)]

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name not in ALLOWED_TOOLS:
            raise GatewayProtocolError("tool is not allowlisted")
        result = await self.call("tools/call", {"name": name, "arguments": arguments})
        if isinstance(result, dict) and isinstance(result.get("structuredContent"), dict):
            return result["structuredContent"]
        if isinstance(result, dict) and isinstance(result.get("structured_content"), dict):
            return result["structured_content"]
        content = result.get("content", []) if isinstance(result, dict) else []
        for block in content if isinstance(content, list) else []:
            if isinstance(block, dict) and block.get("type") == "text":
                try:
                    parsed = json.loads(block.get("text", ""))
                except (TypeError, ValueError):
                    continue
                if isinstance(parsed, dict):
                    return parsed
        return result if isinstance(result, dict) else {}


@dataclass
class ClaudeGatewayAdapter:
    gateway_url: str
    model: str = "claude-sonnet-4-5"
    anthropic_client: AsyncAnthropic | None = None
    gateway_factory: Any = GatewayToolClient

    def _gateway(self, token: str) -> GatewayToolClient:
        return self.gateway_factory(self.gateway_url, token)

    def mcp_server_config(self, token: str) -> dict[str, Any]:
        return {"type": "url", "name": "travella-gateway", "url": self.gateway_url, "authorization_token": token, "tool_configuration": {"enabled": True, "allowed_tools": list(ALLOWED_TOOLS)}}

    async def complete(self, *, message: str, authorization_token: str, system: str | None = None, messages: list[dict[str, str]] | None = None) -> Any:
        client = self.anthropic_client or AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        return await client.beta.messages.create(
            model=self.model,
            max_tokens=1200,
            system=system or load_prompt("research-v1"),
            messages=messages or [{"role": "user", "content": message}],
            mcp_servers=[self.mcp_server_config(authorization_token)],
            tools=[{"type": "mcp_toolset", "mcp_server_name": "travella-gateway", "default_config": {"enabled": True}, "configs": {}}],
        )

    async def complete_conversation(self, *, message: str, context: TurnContext, authorization_token: str) -> dict[str, Any]:
        response = await self.complete(
            message=message,
            authorization_token=authorization_token,
            system=load_prompt("conversation-v1"),
            messages=context.messages(message),
        )
        texts = [self._value(block, "text", "") for block in self._blocks(response) if self._value(block, "type") == "text"]
        text = "\n".join(str(value) for value in texts if value).strip()
        decision = "research" if any(token in text.lower() for token in ("research", "shortlist", "destination")) else "respond"
        question = None
        if "?" in text:
            question = text.rsplit("?", 1)[0].split("\n")[-1].strip() + "?"
        return {"decision": decision, "assistant_text": text[:2000], "question": question}

    @staticmethod
    def _blocks(response: Any) -> list[Any]:
        blocks = getattr(response, "content", None)
        if blocks is None and isinstance(response, dict):
            blocks = response.get("content")
        return blocks if isinstance(blocks, list) else []

    @staticmethod
    def _value(value: Any, name: str, default: Any = None) -> Any:
        if isinstance(value, dict):
            return value.get(name, default)
        return getattr(value, name, default)

    @classmethod
    def _decode_payload(cls, value: Any) -> dict[str, Any] | None:
        if isinstance(value, dict):
            if isinstance(value.get("structuredContent"), dict):
                return value["structuredContent"]
            if isinstance(value.get("structured_content"), dict):
                return value["structured_content"]
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
    def _extract_tool_result(cls, response: Any, expected_tool: str) -> dict[str, Any]:
        """Extract one successful, allowlisted Claude MCP result block.

        The SDK returns typed content blocks, while test transports commonly use
        dictionaries.  Both are accepted, but a plain assistant text response
        is never treated as a provider result.
        """
        found = False
        for block in cls._blocks(response):
            block_type = cls._value(block, "type")
            tool_name = cls._value(block, "name") or cls._value(block, "tool_name")
            if block_type not in {"mcp_tool_result", "tool_result"}:
                continue
            if tool_name and tool_name != expected_tool:
                continue
            found = True
            if cls._value(block, "is_error", False) or cls._value(block, "error"):
                raise GatewayProtocolError("Claude MCP tool returned an error")
            payload = cls._decode_payload(cls._value(block, "result"))
            if payload is None:
                content = cls._value(block, "content", [])
                for item in content if isinstance(content, list) else []:
                    payload = cls._decode_payload(item)
                    if payload is not None:
                        break
            if not isinstance(payload, dict):
                raise GatewayProtocolError("Claude MCP tool result was malformed")
            return payload
        if found:
            raise GatewayProtocolError("Claude MCP tool result was malformed")
        raise GatewayProtocolError("Claude did not invoke the required MCP tool")

    async def complete_tool(
        self,
        *,
        tool: str,
        arguments: dict[str, Any],
        authorization_token: str,
    ) -> dict[str, Any]:
        if tool not in ALLOWED_TOOLS:
            raise GatewayProtocolError("tool is not allowlisted")
        prompt = (
            "Use exactly one allowed Travella MCP tool for this Plan request. "
            "Do not invent provider data or explain the tool call. "
            f"Call {tool} with this JSON argument object: {json.dumps(arguments, separators=(',', ':'))}"
        )
        response = await self.complete(message=prompt, authorization_token=authorization_token)
        return self._extract_tool_result(response, tool)

    async def research(self, *, message: str, traveler_scope: str, plan_id: str, event_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self.complete_tool(
            tool=RESEARCH_TOOL,
            arguments={"theme": message, "traveler_scope": traveler_scope, "plan_id": plan_id, "request_id": event_id},
            authorization_token=authorization_token or traveler_scope,
        )

    async def resolve_map(self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self.complete_tool(
            tool=MAP_TOOL,
            arguments={"candidate_names": names, "traveler_scope": traveler_scope, "plan_id": plan_id},
            authorization_token=authorization_token or traveler_scope,
        )

    async def sources(self, *, evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self.complete_tool(
            tool=SOURCE_TOOL,
            arguments={"evidence_ids": evidence_ids, "traveler_scope": traveler_scope, "plan_id": plan_id, "run_id": run_id},
            authorization_token=authorization_token or traveler_scope,
        )


class LocalGatewayAdapter(ClaudeGatewayAdapter):
    """Named adapter for local tests; it still exercises MCP tools/list/tools/call."""

    async def validate_catalog(self, token: str) -> list[str]:
        tools = await self._gateway(token).tools_list()
        return [str(tool.get("name")) for tool in tools if tool.get("name") in ALLOWED_TOOLS]
