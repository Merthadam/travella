"""Environment-backed configuration for private MCP capability servers."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class McpSettings:
    tavily_api_key: str | None
    google_maps_server_api_key: str | None
    memory_provider: str
    agentcore_memory_id: str | None
    memory_namespace_template: str
    mcp_assertion_signing_secret: str | None = None
    gateway_service_token: str | None = None

    @classmethod
    def from_env(cls) -> "McpSettings":
        return cls(
            tavily_api_key=os.getenv("TAVILY_API_KEY") or None,
            google_maps_server_api_key=os.getenv("GOOGLE_MAPS_SERVER_API_KEY") or None,
            memory_provider=os.getenv("AGENT_MEMORY_PROVIDER", "none"),
            agentcore_memory_id=os.getenv("AGENTCORE_MEMORY_ID") or None,
            memory_namespace_template=os.getenv(
                "AGENTCORE_MEMORY_NAMESPACE_TEMPLATE", "traveler/{actorId}"
            ),
            mcp_assertion_signing_secret=os.getenv("MCP_ASSERTION_SIGNING_SECRET") or None,
            gateway_service_token=os.getenv("MCP_GATEWAY_SERVICE_TOKEN") or None,
        )


def required_secret(value: str | None, name: str) -> str:
    if not value:
        raise RuntimeError(f"{name} is not configured for this MCP server.")
    return value
