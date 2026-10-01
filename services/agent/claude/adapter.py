"""Agent-facing Claude adapter. SDK details stay inside ClaudeMessagesClient."""

from __future__ import annotations

import json
from typing import Any, Protocol

from ..turn import TurnContext
from .gateway import GatewayToolClient
from .messages import ClaudeMessagesClient
from .protocol import ALLOWED_TOOLS, MAP_TOOL, RESEARCH_TOOL, SOURCE_TOOL


class AgentAdapter(Protocol):
    async def complete_conversation(self, *, message: str, context: TurnContext, authorization_token: str) -> dict[str, Any]: ...
    async def research(self, *, message: str, traveler_scope: str, plan_id: str, event_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...
    async def resolve_map(self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...
    async def sources(self, *, evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str, authorization_token: str | None = None) -> dict[str, Any]: ...


class ClaudeGatewayAdapter:
    def __init__(self, gateway_url: str, *, model: str = "claude-sonnet-4-5", anthropic_client: Any | None = None, gateway_factory: Any = GatewayToolClient) -> None:
        self.gateway_url = gateway_url
        self.messages = ClaudeMessagesClient(gateway_url, model=model, sdk_client=anthropic_client)
        self.gateway_factory = gateway_factory

    def _gateway(self, token: str) -> GatewayToolClient:
        return self.gateway_factory(self.gateway_url, token)

    async def complete_conversation(self, *, message: str, context: TurnContext, authorization_token: str) -> dict[str, Any]:
        return await self.messages.conversation(message=message, context=context, authorization_token=authorization_token)

    async def _tool(self, *, tool: str, arguments: dict[str, Any], authorization_token: str) -> dict[str, Any]:
        if tool not in ALLOWED_TOOLS:
            raise ValueError("tool is not allowlisted")
        prompt = (
            "Use exactly one allowed Travella MCP tool for this Plan request. "
            "Do not invent provider data or explain the tool call. "
            f"Call {tool} with this JSON argument object: {json.dumps(arguments, separators=(',', ':'))}"
        )
        response = await self.messages.complete(message=prompt, authorization_token=authorization_token)
        return self.messages.extract_tool_result(response, tool)

    async def research(self, *, message: str, traveler_scope: str, plan_id: str, event_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._tool(tool=RESEARCH_TOOL, arguments={"theme": message, "traveler_scope": traveler_scope, "plan_id": plan_id, "request_id": event_id}, authorization_token=authorization_token or traveler_scope)

    async def resolve_map(self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._tool(tool=MAP_TOOL, arguments={"candidate_names": names, "traveler_scope": traveler_scope, "plan_id": plan_id}, authorization_token=authorization_token or traveler_scope)

    async def sources(self, *, evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._tool(tool=SOURCE_TOOL, arguments={"evidence_ids": evidence_ids, "traveler_scope": traveler_scope, "plan_id": plan_id, "run_id": run_id}, authorization_token=authorization_token or traveler_scope)


class LocalGatewayAdapter(ClaudeGatewayAdapter):
    async def validate_catalog(self, token: str) -> list[str]:
        tools = await self._gateway(token).tools_list()
        return [str(tool.get("name")) for tool in tools if tool.get("name") in ALLOWED_TOOLS]
