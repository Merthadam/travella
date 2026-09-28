"""Private map projection MCP server for temporary candidate locations."""

from __future__ import annotations

import httpx
from mcp.server.fastmcp import FastMCP

from .config import McpSettings, required_secret
from .transport import AuthenticationError, require_tool_context

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
map_mcp = FastMCP("travella-map-mcp")


async def _resolve_candidate_locations(
    candidate_names: list[str], traveler_scope: str, plan_id: str
) -> dict:
    """Resolve temporary candidate names into map-ready projections.

    This tool never creates or updates a Plan record. Saved destinations remain
    an explicit CRUD action in the authenticated application.
    """
    context = require_tool_context(plan_id=plan_id)
    if traveler_scope != context.subject:
        raise AuthenticationError("traveler_scope is controlled by the Gateway")
    names = [" ".join(str(name).split()).strip() for name in candidate_names]
    names = list(dict.fromkeys(name for name in names if name))[:5]
    settings = McpSettings.from_env()
    api_key = required_secret(settings.google_maps_server_api_key, "GOOGLE_MAPS_SERVER_API_KEY")
    projections = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for name in names:
            response = await client.get(GEOCODE_URL, params={"address": name, "key": api_key})
            try:
                response.raise_for_status()
                data = response.json()
            except (httpx.HTTPError, ValueError):
                continue
            if data.get("status") not in (None, "OK"):
                continue
            result = next(iter(data.get("results", [])), None)
            if not isinstance(result, dict):
                continue
            location = result.get("geometry", {}).get("location", {})
            if not isinstance(location, dict) or not {"lat", "lng"}.issubset(location):
                continue
            try:
                lat, lng = float(location["lat"]), float(location["lng"])
            except (TypeError, ValueError):
                continue
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                continue
            components = result.get("address_components", [])
            city = country = None
            for component in components if isinstance(components, list) else []:
                types = component.get("types", []) if isinstance(component, dict) else []
                value = component.get("long_name") if isinstance(component, dict) else None
                if "country" in types:
                    country = value
                elif "locality" in types or "postal_town" in types:
                    city = value
            projections.append(
                {
                    "candidate_name": name,
                    "place_id": result.get("place_id"),
                    "label": result.get("formatted_address") or name,
                    "city": city,
                    "country": country,
                    "location": {"lat": lat, "lng": lng},
                    "temporary": True,
                    "attribution": "Google Maps",
                }
            )
    return {"status": "ready", "plan_id": plan_id, "locations": projections}


@map_mcp.tool()
async def resolve_candidate_locations(
    candidate_names: list[str], traveler_scope: str, plan_id: str
) -> dict:
    """Resolve temporary candidate names into map-ready projections."""
    return await _resolve_candidate_locations(candidate_names, traveler_scope, plan_id)


@map_mcp.tool()
async def get_candidate_map_projection(candidate_names: list[str], traveler_scope: str) -> dict:
    """Return a bounded map projection without mutating durable Plan state."""
    context = require_tool_context()
    if context.plan_id == "temporary":
        raise AuthenticationError("temporary map projection requires a Plan scope")
    result = await _resolve_candidate_locations(candidate_names, traveler_scope, plan_id=context.plan_id)
    result["plan_id"] = "temporary"
    return result


if __name__ == "__main__":
    map_mcp.run(transport="streamable-http")
