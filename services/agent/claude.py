"""Claude SDK adapter for the private AgentCore MCP Gateway."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Protocol

import httpx
from anthropic import AsyncAnthropic

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

    async def complete(self, *, message: str, authorization_token: str) -> Any:
        client = self.anthropic_client or AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        return await client.beta.messages.create(
            model=self.model,
            max_tokens=1200,
            messages=[{"role": "user", "content": message}],
            mcp_servers=[self.mcp_server_config(authorization_token)],
            tools=[{"type": "mcp_toolset", "mcp_server_name": "travella-gateway", "default_config": {"enabled": True}, "configs": {}}],
        )

    async def research(self, *, message: str, traveler_scope: str, plan_id: str, event_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._gateway(authorization_token or traveler_scope).call_tool(RESEARCH_TOOL, {"theme": message, "traveler_scope": traveler_scope, "plan_id": plan_id, "request_id": event_id})

    async def resolve_map(self, *, names: list[str], traveler_scope: str, plan_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._gateway(authorization_token or traveler_scope).call_tool(MAP_TOOL, {"candidate_names": names, "traveler_scope": traveler_scope, "plan_id": plan_id})

    async def sources(self, *, evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str, authorization_token: str | None = None) -> dict[str, Any]:
        return await self._gateway(authorization_token or traveler_scope).call_tool(SOURCE_TOOL, {"evidence_ids": evidence_ids, "traveler_scope": traveler_scope, "plan_id": plan_id, "run_id": run_id})


class LocalGatewayAdapter(ClaudeGatewayAdapter):
    """Named adapter for local tests; it still exercises MCP tools/list/tools/call."""

    async def validate_catalog(self, token: str) -> list[str]:
        tools = await self._gateway(token).tools_list()
        return [str(tool.get("name")) for tool in tools if tool.get("name") in ALLOWED_TOOLS]
