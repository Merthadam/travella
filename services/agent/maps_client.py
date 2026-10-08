"""Narrow, authenticated MCP boundary for canvas place suggestions.

The application supplies a verified traveler and owned Plan. Local development
uses the same signed scope and service OAuth contract as the private Gateway
target; deployment sends the caller's access token through AgentCore Gateway.
No provider credentials or scope assertions reach the model or browser.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any
from urllib.parse import urlparse

import httpx
import jwt
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from services.mcps.transport import issue_scope_assertion

_TOOLS = frozenset({"resolve_destination_area", "search_places", "get_place_details"})
_ARGUMENTS = {
    "resolve_destination_area": {"destination"},
    "search_places": {"query", "area", "category"},
    "get_place_details": {"place_id"},
}


class MapsClient:
    """Only canvas Maps operations, bounded and authorized for one owned Plan."""

    @staticmethod
    def _service_token() -> str:
        issuer = os.getenv("MCP_GATEWAY_OAUTH_ISSUER", "").strip()
        audience = os.getenv("MCP_GATEWAY_OAUTH_AUDIENCE", "").strip()
        client_id = os.getenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "").strip()
        scope = os.getenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp").strip()
        key = os.getenv("MCP_GATEWAY_OAUTH_JWT_KEY", "")
        if not all((issuer, audience, client_id, scope, key)):
            raise ValueError("Maps transport unavailable")
        now = int(time.time())
        return jwt.encode({"iss": issuer, "aud": audience, "client_id": client_id,
                           "scope": scope, "sub": client_id, "iat": now, "exp": now + 60},
                          key, algorithm="HS256")

    @staticmethod
    def _decode(result: Any) -> dict:
        if getattr(result, "isError", False):
            raise ValueError("Maps tool unavailable")
        structured = getattr(result, "structuredContent", None)
        if not isinstance(structured, dict):
            for block in getattr(result, "content", []) or []:
                value = getattr(block, "text", None)
                if isinstance(value, str) and len(value) <= 40_000:
                    try:
                        candidate = json.loads(value)
                        if isinstance(candidate, dict):
                            structured = candidate
                            break
                    except (ValueError, TypeError):
                        pass
        if not isinstance(structured, dict) or len(json.dumps(structured)) > 40_000:
            raise ValueError("Maps result invalid")
        # Return only the Maps capability contract, never transport/provider internals.
        return {key: value for key, value in structured.items()
                if key in {"status", "area", "area_source", "label", "places", "place", "attribution"}}

    async def call(
        self,
        name: str,
        arguments: dict,
        *,
        subject: str,
        plan_id: str,
        authorization_token: str | None = None,
    ) -> dict:
        if (name not in _TOOLS or not isinstance(arguments, dict) or not subject or not plan_id
                or arguments.get("plan_id", plan_id) != plan_id
                or set(arguments) - _ARGUMENTS[name] - {"plan_id"}):
            return {"status": "invalid"}
        tool_arguments = {**arguments, "plan_id": plan_id}
        try:
            if len(json.dumps(tool_arguments)) > 4_000:
                return {"status": "invalid"}
            local = os.getenv("AGENT_MCP_TRANSPORT", "gateway") == "local"
            if local:
                url = os.getenv("LOCAL_MAP_MCP_URL", "").strip()
                token = self._service_token()
                tool_arguments["__travella_scope_assertion"] = issue_scope_assertion(
                    subject, plan_id, ttl_seconds=60
                )
            else:
                url = os.getenv("AGENTCORE_GATEWAY_URL", "").strip()
                token = (authorization_token or "").strip()
                if token.startswith("Bearer "):
                    token = token[7:]
            parsed = urlparse(url)
            if (not token or not parsed.hostname or parsed.username or parsed.password
                    or parsed.query or parsed.fragment
                    or parsed.scheme not in ({"http", "https"} if local else {"https"})):
                return {"status": "unavailable"}
            if not parsed.path.rstrip("/").endswith("/mcp"):
                url = url.rstrip("/") + "/mcp"
            async with asyncio.timeout(35):
                async with httpx.AsyncClient(headers={"Authorization": f"Bearer {token}"},
                                             timeout=httpx.Timeout(25, connect=5),
                                             follow_redirects=False) as http_client:
                    async with streamable_http_client(url, http_client=http_client) as (
                        read_stream, write_stream, _get_session_id
                    ):
                        async with ClientSession(read_stream, write_stream) as session:
                            await session.initialize()
                            tool_name = name
                            if not local:
                                # Gateway prefixes target names. Resolve only the Maps target,
                                # never another capability exposing a similarly named tool.
                                catalog = await session.list_tools()
                                names = {tool.name for tool in catalog.tools[:200]}
                                prefixed = "travella-map-mcp___" + name
                                if prefixed in names:
                                    tool_name = prefixed
                                elif name not in names:
                                    return {"status": "unavailable"}
                            result = await session.call_tool(tool_name, tool_arguments)
                            return self._decode(result)
        except Exception:
            # Includes grouped MCP transport failures; cancellation still propagates.
            # Do not chain/log errors: request objects can contain tokens or API keys.
            return {"status": "unavailable"}
