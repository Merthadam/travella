"""Small HTTP MCP client used for catalog checks and local Gateway adapters."""

from __future__ import annotations

import json
from typing import Any

import httpx

from .protocol import ALLOWED_TOOLS, GatewayProtocolError


class GatewayToolClient:
    """Streamable HTTP JSON-RPC client for a configured Gateway URL."""

    def __init__(self, url: str, authorization_token: str, *, client: httpx.AsyncClient | None = None) -> None:
        self.url = url
        self.authorization_token = authorization_token
        self.client = client
        self._request_id = 0

    async def call(self, method: str, params: dict[str, Any] | None = None) -> Any:
        self._request_id += 1
        payload = {"jsonrpc": "2.0", "id": self._request_id, "method": method, "params": params or {}}
        headers = {
            "Authorization": f"Bearer {self.authorization_token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
        }
        owns_client = self.client is None
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
            if owns_client:
                await client.aclose()

    async def tools_list(self) -> list[dict[str, Any]]:
        result = await self.call("tools/list")
        tools = result.get("tools", []) if isinstance(result, dict) else []
        return [tool for tool in tools if isinstance(tool, dict)]

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name not in ALLOWED_TOOLS:
            raise GatewayProtocolError("tool is not allowlisted")
        result = await self.call("tools/call", {"name": name, "arguments": arguments})
        if isinstance(result, dict):
            for field in ("structuredContent", "structured_content"):
                if isinstance(result.get(field), dict):
                    return result[field]
            for block in result.get("content", []):
                if isinstance(block, dict) and block.get("type") == "text":
                    try:
                        decoded = json.loads(block.get("text", ""))
                    except (TypeError, ValueError):
                        continue
                    if isinstance(decoded, dict):
                        return decoded
            return result
        return {}
