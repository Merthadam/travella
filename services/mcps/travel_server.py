"""Private travel search and sandbox checkout, scoped to a verified traveler and Plan."""

import asyncio
import logging
import os
import sqlite3
from contextlib import asynccontextmanager, suppress
from typing import Literal

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations
from pydantic import ValidationError

from services.agent.travel_contracts import HotelSearch

from .config import McpSettings
from .liteapi import LiteApi, ProviderUnavailable
from .transport import authenticated_mcp_app, require_tool_context
from .sandbox_checkout import prune_stay_receipts


@asynccontextmanager
async def checkout_maintenance(server, *, interval=60):
    # Runs even without checkout traffic; startup removes receipts left by downtime.
    async def prune():
        try:
            await asyncio.to_thread(prune_stay_receipts)
        except (sqlite3.Error, OSError):
            # Never log exception details: database paths and receipt data are private.
            logging.getLogger(__name__).warning('stay_receipt_cleanup_failed')
    await prune()
    async def sweep():
        while True:
            await asyncio.sleep(interval)
            await prune()
    maintenance = asyncio.create_task(sweep())
    try:
        yield {}
    finally:
        maintenance.cancel()
        with suppress(asyncio.CancelledError):
            await maintenance

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


def create_travel_app(server=travel_mcp, *, maintenance_interval=60):
    app = authenticated_mcp_app(server)
    original_lifespan = app.app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(starlette_app):
        # FastMCP's own lifespan is per request in stateless mode. Maintenance
        # belongs to the HTTP application's lifetime, alongside its session manager.
        async with checkout_maintenance(server, interval=maintenance_interval):
            async with original_lifespan(starlette_app) as state:
                yield state

    app.app.router.lifespan_context = lifespan
    return app


@travel_mcp.tool()
async def travel_search(action: str, criteria: dict, plan_id: str) -> dict:
    """Travel searches, hotel details/reviews, flight verification and explicit sandbox checkout. Never mutate Plans."""
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


_READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=True)


@travel_mcp.tool(annotations=_READ_ONLY)
async def get_stay_filter_catalog(plan_id: str, kind: Literal["hotel_types", "facilities"], q: str = "") -> dict:
    """Resolve supported property/facility IDs; optional name query, at most100 entries."""
    return await travel_search("hotels/catalog", {"kind": kind, "q": q}, plan_id)


@travel_mcp.tool(annotations=_READ_ONLY)
async def get_stay_details(plan_id: str, hotel_id: str) -> dict:
    """Inspect property content. Static details do not establish room availability."""
    return await travel_search("hotels/detail", {"hotel_id": hotel_id}, plan_id)


@travel_mcp.tool(annotations=_READ_ONLY)
async def get_stay_reviews(
    plan_id: str, hotel_id: str, limit: int = 5, offset: int = 0, sentiment: bool = False
) -> dict:
    """Bounded guest reviews without reviewer identities; optional AI sentiment."""
    return await travel_search(
        "hotels/reviews",
        {
            "hotel_id": hotel_id,
            "limit": limit,
            "offset": offset,
            "sentiment": sentiment,
        },
        plan_id,
    )


@travel_mcp.tool(annotations=_READ_ONLY)
async def get_stay_rates(plan_id: str, criteria: HotelSearch) -> dict:
    """Inspect dated room rates for criteria.hotel_id; never prebook or reserve."""
    require_tool_context(plan_id=plan_id)
    if not criteria.hotel_id:
        return {"status": "invalid"}
    return await travel_search("hotels/search", criteria.model_dump(mode="json"), plan_id)


@travel_mcp.tool(annotations=_READ_ONLY)
async def verify_flight_offer(plan_id: str, option_id: str) -> dict:
    """Refresh an opaque search option's fare/terms. No reservation or payment."""
    return await travel_search("flights/verify", {"option_id": option_id}, plan_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        create_travel_app(), host="0.0.0.0", port=int(os.getenv("PORT", "8002"))
    )
