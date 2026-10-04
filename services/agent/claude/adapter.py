"""Agent-facing Claude adapter. SDK details stay inside ClaudeMessagesClient."""

from __future__ import annotations

from typing import Any, Protocol

from ..local_mcp import LocalMcpClient, LocalMcpError
from ..request_context import current_text_delta_callback
from ..turn import TurnContext
from .gateway import GatewayToolClient
from .messages import ClaudeMessagesClient
from .protocol import ALLOWED_TOOLS, MAP_TOOL, RESEARCH_TOOL, SOURCE_TOOL, GatewayProtocolError


class AgentAdapter(Protocol):
    async def complete_conversation(
        self, *, message: str, context: TurnContext, authorization_token: str
    ) -> dict[str, Any]: ...
    async def research(
        self,
        *,
        message: str,
        traveler_scope: str,
        plan_id: str,
        event_id: str,
        authorization_token: str,
        research_intent: str = "destination_discovery",
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
    async def synthesize_research(
        self, *, message: str, page_read: dict[str, Any], context: dict[str, Any]
    ) -> dict[str, Any]: ...


class ClaudeGatewayAdapter:
    transport = "agentcore"

    def __init__(
        self,
        gateway_url: str,
        *,
        model: str | None = None,
        sdk_client: Any | None = None,
        gateway_factory: Any = GatewayToolClient,
    ) -> None:
        self.gateway_url = gateway_url
        self.messages = ClaudeMessagesClient(model=model, sdk_client=sdk_client)
        self.gateway_factory = gateway_factory

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

    async def research(
        self,
        *,
        message: str,
        traveler_scope: str,
        plan_id: str,
        event_id: str,
        authorization_token: str,
        research_intent: str = "destination_discovery",
    ) -> dict[str, Any]:
        result = await self._tool(
            tool=RESEARCH_TOOL,
            arguments={
                "theme": message,
                "traveler_scope": traveler_scope,
                "plan_id": plan_id,
                "request_id": event_id,
                "research_intent": research_intent,
            },
            authorization_token=authorization_token,
        )
        if not isinstance(result, dict):
            return result
        run_id = str(result.get("run_id", ""))
        candidates = result.get("candidates", [])
        sources = result.get("sources", [])
        first_source = next(
            (
                source
                for source in sources[:1]
                if isinstance(source, dict) and source.get("evidence_id")
            ),
            None,
        ) if isinstance(sources, list) else None
        if first_source is None:
            first_source = next(
                (
                    source
                for candidate in candidates[:5]
                if isinstance(candidate, dict)
                for source in candidate.get("evidence", [])[:1]
                if isinstance(source, dict) and source.get("evidence_id")
            ),
            None,
            ) if isinstance(candidates, list) else None
        if run_id and first_source:
            try:
                read_result = await self.sources(
                    evidence_ids=[str(first_source["evidence_id"])],
                    traveler_scope=traveler_scope,
                    plan_id=plan_id,
                    run_id=run_id,
                    authorization_token=authorization_token,
                    read_content=True,
                )
                reads = read_result.get("evidence", []) if isinstance(read_result, dict) else []
                if isinstance(reads, list) and reads and isinstance(reads[0], dict):
                    result["page_read"] = reads[0]
            except Exception:
                # Search results alone are never upgraded to page evidence.
                result["page_read"] = {
                    "evidence_id": str(first_source["evidence_id"]),
                    "title": str(first_source.get("title", ""))[:180],
                    "url": str(first_source.get("url", ""))[:2048],
                    "read_status": "unavailable",
                }
        return result

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

    async def synthesize_research(
        self,
        *,
        message: str,
        page_read: dict[str, Any],
        context: dict[str, Any],
        research_intent: str,
        candidates: list[dict[str, str]],
    ) -> dict[str, Any]:
        return await self.messages.research_answer(
            message=message,
            page_read=page_read,
            context=context,
            research_intent=research_intent,
            candidates=candidates,
            on_text_delta=current_text_delta_callback(),
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
        sdk_client: Any | None = None,
        mcp_client: Any | None = None,
    ) -> None:
        super().__init__("", model=model, sdk_client=sdk_client)
        self.local_mcp = mcp_client or LocalMcpClient(
            tool_urls={
                RESEARCH_TOOL: research_url,
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
