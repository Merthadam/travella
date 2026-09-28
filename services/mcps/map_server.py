"""Private map projection MCP server for temporary candidate locations."""

from __future__ import annotations

import httpx
from mcp.server.fastmcp import FastMCP

from .config import McpSettings, required_secret

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
map_mcp = FastMCP("travella-map-mcp")


async def _resolve_candidate_locations(
    candidate_names: list[str], traveler_scope: str, plan_id: str
) -> dict:
    """Resolve temporary candidate names into map-ready projections.

    This tool never creates or updates a Plan record. Saved destinations remain
    an explicit CRUD action in the authenticated application.
    """
    del traveler_scope
    names = [" ".join(name.split()).strip() for name in candidate_names]
    names = [name for name in names if name][:5]
    settings = McpSettings.from_env()
    api_key = required_secret(settings.google_maps_server_api_key, "GOOGLE_MAPS_SERVER_API_KEY")
    projections = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for name in names:
            response = await client.get(GEOCODE_URL, params={"address": name, "key": api_key})
            response.raise_for_status()
            data = response.json()
            result = next(iter(data.get("results", [])), None)
            if not isinstance(result, dict):
                continue
            location = result.get("geometry", {}).get("location", {})
            if not isinstance(location, dict) or not {"lat", "lng"}.issubset(location):
                continue
            projections.append(
                {
                    "candidate_name": name,
                    "place_id": result.get("place_id"),
                    "label": result.get("formatted_address") or name,
                    "location": {"lat": location["lat"], "lng": location["lng"]},
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
    return await _resolve_candidate_locations(candidate_names, traveler_scope, plan_id="temporary")


if __name__ == "__main__":
    map_mcp.run(transport="streamable-http")
