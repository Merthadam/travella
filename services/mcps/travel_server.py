"""Private travel search and sandbox checkout, scoped to a verified traveler and Plan."""

import asyncio
import os
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import ValidationError
from .config import McpSettings
from .liteapi import LiteApi, ProviderUnavailable
from .transport import authenticated_mcp_app, require_tool_context

travel_mcp = FastMCP(
    "travella-travel-mcp",
    port=8002,
    json_response=True,
    stateless_http=True,
    transport_security=TransportSecuritySettings(
        allowed_hosts=os.getenv(
            "MCP_ALLOWED_HOSTS", "travel-mcp:8002,localhost:8002,127.0.0.1:8002"
        ).split(",")
    ),
)
_slots = asyncio.Semaphore(8)


@travel_mcp.tool()
async def travel_search(action: str, criteria: dict, plan_id: str) -> dict:
    """Search travel and explicitly requested sandbox hotel checkout. Never mutate Plans."""
    context = require_tool_context(plan_id=plan_id)
    provider = LiteApi(
        McpSettings.from_env().lite_api_key,
        scope=(context.subject, context.plan_id),
        flights_enabled=os.getenv("LITEAPI_FLIGHTS_ENABLED", "true").lower() == "true",
    )
    try:
        async with asyncio.timeout(115):
            async with _slots:
                return await provider.call(action, criteria)
    except (KeyError, ValidationError):
        return {"status": "invalid"}
    except ProviderUnavailable as exc:
        return {"status": "unavailable", "code": exc.code}
    except TimeoutError:
        return {"status": "unavailable", "code": "provider_timeout"}
    except Exception:
        return {"status": "unavailable", "code": "provider_response_invalid"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        authenticated_mcp_app(travel_mcp), host="0.0.0.0", port=int(os.getenv("PORT", "8002"))
    )
