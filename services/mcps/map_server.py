"""Private map projection MCP server for temporary candidate locations."""

from __future__ import annotations

import hashlib
import math
import os
import re
from urllib.parse import urlencode, urlparse

import httpx
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from .config import McpSettings, required_secret
from .transport import authenticated_mcp_app, require_tool_context

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def _transport_security() -> TransportSecuritySettings:
    configured_hosts = os.getenv("MCP_ALLOWED_HOSTS", "")
    allowed_hosts = [host.strip() for host in configured_hosts.split(",") if host.strip()]
    if not allowed_hosts:
        allowed_hosts = ["map-mcp:8001", "localhost:8001", "127.0.0.1:8001"]
    return TransportSecuritySettings(allowed_hosts=allowed_hosts)


map_mcp = FastMCP(
    "travella-map-mcp",
    port=8001,
    json_response=True,
    stateless_http=True,
    transport_security=_transport_security(),
)


async def _resolve_candidate_locations(candidate_names: list[str], plan_id: str) -> dict:
    """Resolve temporary candidate names into map-ready projections.

    This tool never creates or updates a Plan record. Saved destinations remain
    an explicit CRUD action in the authenticated application.
    """
    require_tool_context(plan_id=plan_id)
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
async def resolve_candidate_locations(candidate_names: list[str], plan_id: str) -> dict:
    """Resolve temporary candidate names into map-ready projections."""
    return await _resolve_candidate_locations(candidate_names, plan_id)


@map_mcp.tool()
async def get_candidate_map_projection(candidate_names: list[str], plan_id: str) -> dict:
    """Return a bounded map projection without mutating durable Plan state."""
    return await _resolve_candidate_locations(candidate_names, plan_id)


PLACES_URL = "https://places.googleapis.com/v1/places"
PLACE_FIELDS = "id,displayName,formattedAddress,location,rating,userRatingCount,types,googleMapsUri"
CATEGORIES = {"stay", "airport", "food", "activity", "other"}


def _unavailable() -> dict:
    return {"status": "unavailable", "attribution": "Google Maps"}


def _area(value: object) -> dict | None:
    if not isinstance(value, dict) or set(value) != {"south", "west", "north", "east"}:
        return None
    try:
        result = {key: float(number) for key, number in value.items()}
        if any(isinstance(number, bool) for number in value.values()):
            return None
        if not all(math.isfinite(number) for number in result.values()):
            return None
        if not -90 <= result["south"] < result["north"] <= 90:
            return None
        if not all(-180 <= result[key] <= 180 for key in ("west", "east")):
            return None
        if result["west"] == result["east"]:
            return None
        return result
    except (TypeError, ValueError, OverflowError):
        return None


def _inside(position: dict, area: dict) -> bool:
    latitude, longitude = position["lat"], position["lng"]
    longitude_inside = (
        area["west"] <= longitude <= area["east"]
        if area["west"] < area["east"]
        else longitude >= area["west"] or longitude <= area["east"]
    )
    return area["south"] <= latitude <= area["north"] and longitude_inside


def _place(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    place_id = raw.get("id")
    name = raw.get("displayName", {})
    location = raw.get("location", {})
    if (not isinstance(place_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", place_id)
            or not isinstance(name, dict) or not isinstance(name.get("text"), str)
            or not name["text"].strip() or not isinstance(location, dict)):
        return None
    try:
        lat, lng = float(location["latitude"]), float(location["longitude"])
        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            return None
    except (KeyError, TypeError, ValueError, OverflowError):
        return None
    rating, count = raw.get("rating"), raw.get("userRatingCount")
    if isinstance(rating, bool) or not isinstance(rating, (float, int)) or not 0 <= rating <= 5:
        rating = None
    if isinstance(count, bool) or not isinstance(count, int) or count < 0:
        count = None
    maps_url = raw.get("googleMapsUri")
    if (not isinstance(maps_url, str) or len(maps_url) > 2000
            or urlparse(maps_url).scheme != "https"
            or urlparse(maps_url).hostname not in {"maps.google.com", "www.google.com"}
            or (urlparse(maps_url).hostname != "maps.google.com" and not urlparse(maps_url).path.startswith("/maps"))):
        maps_url = "https://www.google.com/maps/search/?" + urlencode(
            {"api": "1", "query": name["text"][:120], "query_place_id": place_id}
        )
    types = raw.get("types", [])
    return {
        "id": "google_" + hashlib.sha256(place_id.encode()).hexdigest()[:32],
        "place_id": place_id,
        "name": name["text"].strip()[:120],
        "address": str(raw.get("formattedAddress") or "")[:240],
        "position": {"lat": lat, "lng": lng},
        "rating": rating,
        "rating_count": count,
        "types": [item[:80] for item in types if isinstance(item, str)][:10]
        if isinstance(types, list) else [],
        "maps_url": maps_url,
        "reason": "",
    }


async def _google_request(method: str, url: str, **kwargs: object) -> dict | None:
    """Never propagate provider response bodies or credential-bearing request errors."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15, connect=5), follow_redirects=False) as client:
            async with client.stream(method, url, **kwargs) as response:
                if response.status_code != 200:
                    return None
                content = bytearray()
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > 1_000_000:
                        return None
                import json
                payload = json.loads(content)
                return payload if isinstance(payload, dict) else None
    except (httpx.HTTPError, ValueError, TypeError):
        return None


@map_mcp.tool()
async def resolve_destination_area(destination: str, plan_id: str) -> dict:
    """Resolve the chosen destination to a Google viewport for restricted place searches."""
    require_tool_context(plan_id=plan_id)
    destination = " ".join(destination.split())
    if not destination or len(destination) > 240:
        return {"status": "invalid"}
    key = McpSettings.from_env().google_maps_server_api_key
    if not key:
        return _unavailable()
    data = await _google_request("GET", GEOCODE_URL, params={"address": destination, "key": key})
    if not data or data.get("status") not in {"OK", "ZERO_RESULTS"}:
        return _unavailable()
    candidates = data.get("results", [])
    if not isinstance(candidates, list) or not candidates:
        return {"status": "empty", "attribution": "Google Maps"}
    # Ambiguous geocoding must be clarified instead of silently choosing another city.
    if len(candidates) > 1:
        return {"status": "ambiguous", "attribution": "Google Maps"}
    result = candidates[0]
    if not isinstance(result, dict):
        return _unavailable()
    geometry = result.get("geometry", {})
    viewport = geometry.get("bounds") or geometry.get("viewport") if isinstance(geometry, dict) else None
    if not isinstance(viewport, dict):
        return _unavailable()
    southwest, northeast = viewport.get("southwest", {}), viewport.get("northeast", {})
    if not isinstance(southwest, dict) or not isinstance(northeast, dict):
        return _unavailable()
    area = _area({"south": southwest.get("lat"), "west": southwest.get("lng"),
                  "north": northeast.get("lat"), "east": northeast.get("lng")})
    if area is None:
        return _unavailable()
    return {"status": "ready", "area": area,
            "label": str(result.get("formatted_address") or destination)[:240],
            "attribution": "Google Maps"}


@map_mcp.tool()
async def search_places(query: str, area: dict, category: str, plan_id: str) -> dict:
    """Find at most five places strictly inside the selected destination/map rectangle.

    Search results are temporary suggestions; this tool never modifies a Plan.
    """
    require_tool_context(plan_id=plan_id)
    bounds = _area(area)
    query = " ".join(query.split())
    if not bounds or not query or len(query) > 240 or category not in CATEGORIES:
        return {"status": "invalid"}
    key = McpSettings.from_env().google_maps_server_api_key
    if not key:
        return _unavailable()
    body = {"textQuery": query, "pageSize": 5,
            "locationRestriction": {"rectangle": {
                "low": {"latitude": bounds["south"], "longitude": bounds["west"]},
                "high": {"latitude": bounds["north"], "longitude": bounds["east"]},
            }}}
    # Activity covers parks, museums, sights and more, so no single type is imposed.
    included_type = {"stay": "lodging", "airport": "airport", "food": "restaurant"}.get(category)
    if included_type:
        body["includedType"] = included_type
        body["strictTypeFiltering"] = True
    data = await _google_request("POST", PLACES_URL + ":searchText", json=body,
                                headers={"X-Goog-Api-Key": key,
                                         "X-Goog-FieldMask": ",".join("places." + field for field in PLACE_FIELDS.split(","))})
    if data is None:
        return _unavailable()
    results = data.get("places", [])
    if not isinstance(results, list):
        return _unavailable()
    places = []
    seen = set()
    for raw in results[:5]:
        place = _place(raw)
        if place and _inside(place["position"], bounds) and place["id"] not in seen:
            places.append(place)
            seen.add(place["id"])
    return {"status": "ready" if places else "empty", "places": places,
            "area": bounds, "attribution": "Google Maps"}


@map_mcp.tool()
async def get_place_details(place_id: str, plan_id: str) -> dict:
    """Read a bounded factual place card. No reviews, personal data or Plan mutations."""
    require_tool_context(plan_id=plan_id)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", place_id):
        return {"status": "invalid"}
    key = McpSettings.from_env().google_maps_server_api_key
    if not key:
        return _unavailable()
    data = await _google_request("GET", PLACES_URL + "/" + place_id,
                                headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": PLACE_FIELDS})
    place = _place(data)
    if not place or place["place_id"] != place_id:
        return _unavailable()
    return {"status": "ready", "place": place, "attribution": "Google Maps"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(authenticated_mcp_app(map_mcp), host="0.0.0.0", port=int(os.getenv("PORT", "8001")))
