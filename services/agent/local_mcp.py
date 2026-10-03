"""Development-only MCP transport for local FastMCP target containers."""

from __future__ import annotations

import json
import os
import time
from collections.abc import Callable
from typing import Any

import httpx
import jwt
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from services.mcps.transport import issue_scope_assertion


class LocalMcpError(RuntimeError):
    """A sanitized local MCP transport failure."""


class LocalMcpClient:
    """Call local MCP targets using the same service-auth envelope as Gateway."""

    def __init__(
        self,
        *,
        tool_urls: dict[str, str],
        http_client_factory: Callable[[str, dict[str, str]], httpx.AsyncClient] | None = None,
    ) -> None:
        self.urls = tool_urls
        self.http_client_factory = http_client_factory or self._http_client

    @staticmethod
    def _http_client(_url: str, headers: dict[str, str]) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(30, read=60),
        )

    @staticmethod
    def _service_token() -> str:
        issuer = os.getenv("MCP_GATEWAY_OAUTH_ISSUER", "").strip()
        audience = os.getenv("MCP_GATEWAY_OAUTH_AUDIENCE", "").strip()
        client_id = os.getenv("MCP_GATEWAY_OAUTH_CLIENT_ID", "").strip()
        scope = os.getenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp").strip()
        key = os.getenv("MCP_GATEWAY_OAUTH_JWT_KEY", "")
        if not all((issuer, audience, client_id, scope, key)):
            raise LocalMcpError("Local MCP authentication is not configured")
        now = int(time.time())
        return jwt.encode(
            {
                "iss": issuer,
                "aud": audience,
                "client_id": client_id,
                "scope": scope,
                "sub": client_id,
                "iat": now,
                "exp": now + 60,
            },
            key,
            algorithm="HS256",
        )

    async def call_tool(
        self,
        name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        if name not in self.urls:
            raise LocalMcpError("MCP tool is not allowlisted")
        url = self.urls.get(name, "").strip()
        if not url:
            raise LocalMcpError("Local MCP endpoint is not configured")

        plan_id = str(arguments.get("plan_id") or "").strip()
        subject = str(arguments.get("traveler_scope") or "").strip()
        if not plan_id or not subject:
            raise LocalMcpError("Verified traveler and Plan context are required")

        try:
            service_token = self._service_token()
            scope_assertion = issue_scope_assertion(subject, plan_id, ttl_seconds=60)
            tool_arguments = dict(arguments)
            tool_arguments["__travella_scope_assertion"] = scope_assertion

            async with self.http_client_factory(
                url, {"Authorization": f"Bearer {service_token}"}
            ) as http_client:
                async with streamable_http_client(url, http_client=http_client) as (
                    read_stream,
                    write_stream,
                    _get_session_id,
                ):
                    async with ClientSession(read_stream, write_stream) as session:
                        await session.initialize()
                        result = await session.call_tool(name, tool_arguments)
            if getattr(result, "isError", False):
                raise LocalMcpError("Local MCP tool call failed")
            structured = getattr(result, "structuredContent", None)
            if isinstance(structured, dict):
                return structured
            for block in getattr(result, "content", []) or []:
                text = getattr(block, "text", None)
                if isinstance(text, str):
                    try:
                        decoded = json.loads(text)
                    except (TypeError, ValueError):
                        continue
                    if isinstance(decoded, dict):
                        return decoded
            raise LocalMcpError("Local MCP tool returned an invalid result")
        except LocalMcpError:
            raise
        except Exception as exc:
            raise LocalMcpError("Local MCP request failed") from exc
