"""Private tool adapter with an injected Claude Agent SDK conversation client."""

from __future__ import annotations

from typing import Any, Protocol

from ..config import ResearchWorkerConfig
from ..local_mcp import LocalMcpClient, LocalMcpError
from ..request_context import current_text_delta_callback
from ..turn import TurnContext
from .gateway import GatewayToolClient
from .protocol import ALLOWED_TOOLS, MAP_TOOL, SOURCE_TOOL, GatewayProtocolError
from .sdk_conversation import ClaudeSdkConversationClient


class AgentAdapter(Protocol):
    async def complete_conversation(
        self, *, message: str, context: TurnContext, authorization_token: str
    ) -> dict[str, Any]: ...
    async def resolve_map(
        self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str
    ) -> dict[str, Any]: ...
    async def sources(
        self,
        *,
        evidence_ids: list[str],
        traveler_scope: str,
        plan_id: str,
        run_id: str,
        authorization_token: str,
        read_content: bool = False,
    ) -> dict[str, Any]: ...


class ClaudeGatewayAdapter:
    transport = "agentcore"

    def __init__(
        self,
        gateway_url: str,
        *,
        model: str | None = None,
        messages_client: Any | None = None,
        gateway_factory: Any = GatewayToolClient,
    ) -> None:
        self.gateway_url = gateway_url
        self._messages = messages_client
        self._model = model
        self.gateway_factory = gateway_factory

    @property
    def messages(self):
        if self._messages is None:
            from dataclasses import replace

            config = ResearchWorkerConfig.from_env()
            if self._model:
                config = replace(config, model=self._model)
            self._messages = ClaudeSdkConversationClient(config)
        return self._messages

    def _gateway(self, token: str) -> GatewayToolClient:
        return self.gateway_factory(self.gateway_url, token)

    async def complete_conversation(
        self, *, message: str, context: TurnContext, authorization_token: str
    ) -> dict[str, Any]:
        return await self.messages.conversation(
            message=message,
            context=context,
            on_text_delta=current_text_delta_callback(),
        )

    async def _tool(
        self, *, tool: str, arguments: dict[str, Any], authorization_token: str
    ) -> dict[str, Any]:
        if tool not in ALLOWED_TOOLS:
            raise ValueError("tool is not allowlisted")
        if not authorization_token:
            raise GatewayProtocolError("verified Cognito token is required")
        if not self.gateway_url:
            raise GatewayProtocolError("AgentCore Gateway is not configured")
        return await self._gateway(authorization_token).call_tool(tool, arguments)

    async def resolve_map(
        self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str
    ) -> dict[str, Any]:
        return await self._tool(
            tool=MAP_TOOL,
            arguments={
                "candidate_names": names,
                "traveler_scope": traveler_scope,
                "plan_id": plan_id,
            },
            authorization_token=authorization_token,
        )

    async def sources(
        self,
        *,
        evidence_ids: list[str],
        traveler_scope: str,
        plan_id: str,
        run_id: str,
        authorization_token: str,
        read_content: bool = False,
    ) -> dict[str, Any]:
        return await self._tool(
            tool=SOURCE_TOOL,
            arguments={
                "evidence_ids": evidence_ids,
                "traveler_scope": traveler_scope,
                "plan_id": plan_id,
                "run_id": run_id,
                "read_content": read_content,
            },
            authorization_token=authorization_token,
        )



class LocalGatewayAdapter(ClaudeGatewayAdapter):
    async def validate_catalog(self, token: str) -> list[str]:
        tools = await self._gateway(token).tools_list()
        return [str(tool.get("name")) for tool in tools if tool.get("name") in ALLOWED_TOOLS]


class LocalMcpAdapter(ClaudeGatewayAdapter):
    """Development-only adapter that calls the local FastMCP targets directly."""

    transport = "local"

    def __init__(
        self,
        *,
        research_url: str,
        map_url: str,
        model: str | None = None,
        mcp_client: Any | None = None,
        messages_client: Any | None = None,
    ) -> None:
        super().__init__("", model=model, messages_client=messages_client)
        self.local_mcp = mcp_client or LocalMcpClient(
            tool_urls={
                SOURCE_TOOL: research_url,
                MAP_TOOL: map_url,
            },
        )

    async def _tool(
        self,
        *,
        tool: str,
        arguments: dict[str, Any],
        authorization_token: str,
    ) -> dict[str, Any]:
        if tool not in ALLOWED_TOOLS:
            raise GatewayProtocolError("MCP tool is not allowlisted")
        if not authorization_token:
            raise GatewayProtocolError("verified Cognito token is required")
        try:
            return await self.local_mcp.call_tool(tool, arguments)
        except LocalMcpError as exc:
            raise GatewayProtocolError(str(exc)) from exc
