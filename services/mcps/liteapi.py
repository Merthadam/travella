"""LiteAPI adapter. Credentials and raw supplier handles stay in the private connector."""

from __future__ import annotations

import html
import ipaddress
import json
import math
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

import httpx
from services.agent.travel_contracts import INPUTS, OUTPUTS
from services.shared.traveler_profile import reference_catalog

BASE = "https://api.liteapi.travel/v3.0"


class ProviderUnavailable(Exception):
    def __init__(self, code="provider_unavailable"):
        self.code = code
        super().__init__(code)


def text(value, limit=240):
    return (
        re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value))).strip()[:limit]
        if isinstance(value, str)
        else None
    )


def number(value, low=0, high=100000):
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or not low <= value <= high
    ):
        return None
    return value


def amount(value):
    try:
        if isinstance(value, bool) or value is None:
            return None
        n = Decimal(str(value))
        return format(n, "f") if n.is_finite() and 0 <= n <= 100000000 else None
    except (InvalidOperation, ValueError):
        return None


def money(raw):
    raw = raw if isinstance(raw, dict) else {}
    currency = raw.get("currency")
    return {
        "amount": amount(raw.get("amount")),
        "currency": currency
        if isinstance(currency, str) and re.fullmatch("[A-Z]{3}", currency)
        else None,
    }


def photo(url):
    if not isinstance(url, str) or len(url) > 2000:
        return None
    try:
        p = urlparse(url)
        if (
            p.scheme != "https"
            or not p.hostname
            or p.username
            or p.password
            or p.query
            or p.fragment
            or p.port not in (None, 443)
        ):
            return None
        if p.hostname in {"localhost"} or "." not in p.hostname:
            return None
        try:
            if not ipaddress.ip_address(p.hostname).is_global:
                return None
        except ValueError:
            pass
        return url
    except ValueError:
        return None


def items(value):
    return value if isinstance(value, list) else []


def obj(value):
    return value if isinstance(value, dict) else {}


def terms(rate):
    policy = obj(rate.get("cancellationPolicies"))
    tag = policy.get("refundableTag")
    refundable = True if tag == "RFN" else False if tag == "NRFN" else None
    rules = items(policy.get("cancelPolicyInfos"))
    parts = []
    deadline = None
    for rule in rules[:8]:
        rule = obj(rule)
        start = text(rule.get("cancelTime"), 80)
        zone = text(rule.get("timezone"), 40)
        if start and zone:
            start = f"{start} {zone}"
        penalty = amount(rule.get("amount"))
        currency = text(rule.get("currency"), 3)
        if start:
            deadline = deadline or start
            parts.append(
                f"From {start}: {penalty or 'unspecified'} {currency or ''} cancellation penalty."
            )
    return (
        refundable,
        " ".join(parts)
        or (
            "Non-refundable."
            if refundable is False
            else "Refundable rate; deadline and penalties not supplied."
            if refundable
            else None
        ),
        deadline,
    )


def excluded(rate):
    return [
        {"name": text(t.get("description")) or "Property charge", **money(t)}
        for t in items(obj(rate.get("retailRate")).get("taxesAndFees"))[:50]
        if isinstance(t, dict) and t.get("included") is False
    ]


def hotel_content(raw):
    loc = obj(raw.get("location"))
    return {
        "hotel_id": raw.get("id"),
        "name": text(raw.get("name")) or "Hotel",
        "description": text(raw.get("hotelDescription"), 8000),
        "address": text(raw.get("address")),
        "latitude": number(raw.get("latitude", loc.get("latitude")), -90, 90),
        "longitude": number(raw.get("longitude", loc.get("longitude")), -180, 180),
        "stars": number(raw.get("stars", raw.get("starRating")), 0, 5),
        "review_score": number(raw.get("rating"), 0, 10),
        "review_count": int(number(raw.get("reviewCount", raw.get("review_count"))) or 0) or None,
        "facilities": [
            text(x, 100) for x in items(raw.get("hotelFacilities")) if isinstance(x, str)
        ][:40],
        "images": [
            {"url": photo(x.get("urlHd")) or photo(x.get("url")), "caption": text(x.get("caption"))}
            for x in items(raw.get("hotelImages"))
            if isinstance(x, dict) and (photo(x.get("urlHd")) or photo(x.get("url")))
        ][:16],
    }


def normalize_hotels(payload):
    metadata = {x.get("id"): x for x in items(payload.get("hotels")) if isinstance(x, dict)}
    result = []
    for raw in items(payload.get("data"))[:30]:
        if not isinstance(raw, dict) or not re.fullmatch(
            r"[A-Za-z0-9_-]{1,100}", str(raw.get("hotelId", ""))
        ):
            continue
        hid = raw["hotelId"]
        h = metadata.get(hid, {})
        content = hotel_content({**h, "id": hid})
        rooms = []
        for index, offer in enumerate(items(raw.get("roomTypes"))[:30]):
            if not isinstance(offer, dict):
                continue
            rates = [r for r in items(offer.get("rates")) if isinstance(r, dict)]
            if not rates:
                continue
            total = money(offer.get("offerRetailRate"))
            if total["amount"] is None and len(rates) == 1:
                totals = items(obj(rates[0].get("retailRate")).get("total"))
                total = money(totals[0] if totals else {})
            conditions = [terms(r) for r in rates]
            refund = (
                False
                if any(c[0] is False for c in conditions)
                else True
                if all(c[0] is True for c in conditions)
                else None
            )
            taxes = [t for r in rates for t in excluded(r)][:50]
            rooms.append(
                {
                    "id": f"{hid}-room-{index}",
                    "name": " + ".join(text(r.get("name")) or "Room" for r in rates)[:500],
                    "board_name": " / ".join(
                        dict.fromkeys(
                            text(r.get("boardName")) for r in rates if text(r.get("boardName"))
                        )
                    )
                    or None,
                    "refundable": refund,
                    "cancellation_summary": " ".join(
                        dict.fromkeys(c[1] for c in conditions if c[1])
                    )
                    or None,
                    "cancellation_deadline": conditions[0][2] if len(rates) == 1 else None,
                    "total": total,
                    "excluded_taxes": taxes,
                    "occupancy_summary": " + ".join(
                        f"{r.get('adultCount')} adults, {r.get('childCount', 0)} children"
                        for r in rates
                        if isinstance(r.get("adultCount"), int)
                    )
                    or None,
                }
            )
        rooms.sort(
            key=lambda r: (
                Decimal(r["total"]["amount"])
                if r["total"]["amount"] is not None
                else Decimal("Infinity")
            )
        )
        if not rooms:
            continue
        first = rooms[0]
        result.append(
            {k: v for k, v in content.items() if k not in {"description", "images"}}
            | {
                "id": hid,
                "image_url": photo(h.get("main_photo")) or photo(h.get("thumbnail")),
                "price": {
                    **first["total"],
                    "basis": "stay",
                    "estimated": False,
                    "excluded_taxes": first["excluded_taxes"],
                },
                "rooms": rooms,
            }
        )
    return result


def timestamp(value):
    if not isinstance(value, str) or len(value) > 64:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value
    except ValueError:
        return None


def normalize_flights(payload, criteria):
    journeys = [
        j
        for g in items(payload.get("data"))
        if isinstance(g, dict)
        for j in items(g.get("journeys"))
    ]
    result = []
    for raw in journeys[:100]:
        if not isinstance(raw, dict):
            continue
        offer = obj(raw.get("cheapestOffer"))
        if not offer:
            offers = [o for o in items(raw.get("offers")) if isinstance(o, dict)]
            offer = offers[0] if offers else {}
        pricing = obj(obj(offer.get("pricing")).get("display"))
        total = money({"amount": pricing.get("total"), "currency": pricing.get("currency")})
        legs = {}
        airlines = []
        for direction in ["OUTBOUND", "INBOUND"]:
            segments = []
            stop_total = 0
            stops_known = True
            invalid = False
            for s in items(raw.get("segments")):
                if not isinstance(s, dict) or s.get("direction") != direction:
                    continue
                dep, arr = timestamp(s.get("departureTime")), timestamp(s.get("arrivalTime"))
                if not dep or not arr:
                    invalid = True
                    continue
                carrier = obj(s.get("carrier"))
                airline = text(carrier.get("marketingName")) or text(carrier.get("marketingCode"))
                if airline and airline not in airlines:
                    airlines.append(airline)
                stop_count = number(s.get("stopCount"), 0, 10)
                stops_known = stops_known and stop_count is not None
                stop_total += int(stop_count or 0)
                segments.append(
                    {
                        "origin": text(s.get("originCode"), 3) or "",
                        "destination": text(s.get("destinationCode"), 3) or "",
                        "departure_at": dep,
                        "arrival_at": arr,
                        "airline": airline,
                        "operating_airline": text(carrier.get("operatingName")),
                        "flight_number": text(carrier.get("marketingCode"), 3)
                        + " "
                        + str(obj(s.get("flight")).get("marketingNumber", ""))
                        if carrier.get("marketingCode")
                        else None,
                        "duration_minutes": number(obj(s.get("duration")).get("minutes")),
                        "technical_stops": [
                            text(x.get("airportCode"), 3) or "Technical stop"
                            for x in items(s.get("technicalStops"))
                            if isinstance(x, dict)
                        ][:10],
                    }
                )
            duration = next(
                (
                    number(obj(x.get("duration")).get("minutes"))
                    for x in items(raw.get("legDurations"))
                    if isinstance(x, dict) and x.get("direction") == direction
                ),
                None,
            )
            if (
                invalid
                or len(segments) > 12
                or any(a["destination"] != b["origin"] for a, b in zip(segments, segments[1:]))
            ):
                segments = []
            legs[direction] = {
                "segments": segments,
                "duration_minutes": duration,
                "stops": max(0, len(segments) - 1) + stop_total if stops_known else None,
            }
        out, back = legs["OUTBOUND"], legs["INBOUND"]
        if not out["segments"] or not back["segments"]:
            continue
        if (
            out["segments"][0]["departure_at"][:10] != criteria["departure_date"]
            or back["segments"][0]["departure_at"][:10] != criteria["return_date"]
            or out["segments"][0]["origin"] != criteria["origin"]
            or out["segments"][-1]["destination"] != criteria["destination"]
            or back["segments"][0]["origin"] != criteria["destination"]
            or back["segments"][-1]["destination"] != criteria["origin"]
        ):
            continue
        bag = obj(offer.get("baggage"))
        fare = obj(offer.get("terms"))
        descriptions = [
            text(b.get("description"))
            for b in items(bag.get("included"))
            if isinstance(b, dict) and text(b.get("description"))
        ]
        summary = "; ".join(dict.fromkeys(descriptions))[:1000] or None
        if not summary and isinstance(bag.get("hasCarryOnBag"), bool):
            summary = "Cabin bag included" if bag["hasCarryOnBag"] else "Cabin bag not included"
        result.append(
            {
                "id": f"flight-{len(result)}",
                "price": {**total, "basis": "party_return", "estimated": False},
                "airlines": airlines[:12],
                "outbound": out,
                "inbound": back,
                "baggage_summary": summary,
                "cabin_bag_included": bag.get("hasCarryOnBag")
                if isinstance(bag.get("hasCarryOnBag"), bool)
                else None,
                "refundable": fare.get("refundable")
                if isinstance(fare.get("refundable"), bool)
                else None,
                "cancellation_summary": " ".join(
                    text(x.get("message"), 500)
                    for x in items(fare.get("summary"))
                    if isinstance(x, dict) and text(x.get("message"))
                )[:1500]
                or None,
            }
        )
    return result, len(journeys) > 100


class LiteApi:
    def __init__(self, key, *, transport=None, flights_enabled=True, scope=None):
        self.scope = scope
        self.key = key
        self.transport = transport
        self.flights_enabled = flights_enabled

    @property
    def sandbox(self):
        return bool(self.key and self.key.startswith("sand_"))

    async def request(self, method, path, **kwargs):
        if not self.key:
            raise ProviderUnavailable()
        try:
            async with httpx.AsyncClient(
                base_url=BASE,
                headers={"X-API-Key": self.key, "Accept": "application/json"},
                timeout=httpx.Timeout(110, connect=5),
                follow_redirects=False,
                transport=self.transport,
            ) as client:
                async with client.stream(method, path, **kwargs) as response:
                    if response.status_code == 204:
                        return {"data": []}
                    if response.status_code != 200:
                        raise ProviderUnavailable()
                    data = bytearray()
                    async for chunk in response.aiter_bytes():
                        data.extend(chunk)
                        if len(data) > 12_000_000:
                            raise ProviderUnavailable("provider_response_invalid")
                    value = json.loads(data)
                    # Rates use HTTP 200 with error 2001 for valid searches with no offers.
                    if path == "/hotels/rates" and obj(obj(value).get("error")).get("code") == 2001:
                        return {"data": []}
                    if not isinstance(value, dict) or value.get("error"):
                        raise ProviderUnavailable("provider_response_invalid")
                    return value
        except httpx.TimeoutException:
            raise ProviderUnavailable("provider_timeout") from None
        except (httpx.HTTPError, ValueError, TypeError):
            raise ProviderUnavailable() from None

    async def call(self, action, criteria):
        data = INPUTS[action].model_validate(criteria).model_dump(mode="json")
        envelope = {"provider": "LiteAPI", "sandbox": self.sandbox}
        if action.startswith("sandbox/"):
            from .sandbox_checkout import checkout
            return await checkout(self, action, data)
        if action == "capabilities":
            return {
                **envelope,
                "hotels": bool(self.key),
                "flights": bool(self.key and self.flights_enabled),
            }
        if action in {"airports", "flights/search"} and not self.flights_enabled:
            raise ProviderUnavailable()
        if action == "places":
            country = next(
                c["name"]
                for c in reference_catalog("countries")
                if c["code"] == data["country_code"]
            )
            raw = await self.request(
                "GET",
                "/data/places",
                params={
                    "textQuery": f"{data['q']}, {country}",
                    "language": "en",
                },
            )
            if not isinstance(raw.get("data"), list):
                raise ProviderUnavailable("provider_response_invalid")
            places = [
                {
                    "place_id": p["placeId"],
                    "name": text(p["displayName"], 120),
                    "address": text(p.get("formattedAddress")),
                }
                for p in raw["data"]
                if isinstance(p, dict)
                and re.fullmatch(r"[A-Za-z0-9_-]{1,255}", str(p.get("placeId", "")))
                and text(p.get("displayName"), 120)
                and set(items(p.get("types"))) & {"locality", "ski_resort", "administrative_area_level_3", "sublocality", "natural_feature"}
            ][:8]
            result = {**envelope, "status": "ready" if places else "empty", "places": places}
        elif action == "airports":
            raw = await self.request("GET", "/data/flights/airports/", params={"q": data["q"]})
            airports = [
                a
                for g in items(raw.get("data"))
                if isinstance(g, dict)
                for a in items(g.get("airports"))
                if isinstance(a, dict)
            ]
            airports = [
                {
                    "iata": a["iata"],
                    "name": text(a.get("name")) or a["iata"],
                    "city": text(a.get("city")),
                    "country_code": text(a.get("country"), 2),
                }
                for a in airports
                if re.fullmatch("[A-Z]{3}", str(a.get("iata", "")))
            ][:12]
            result = {**envelope, "status": "ready" if airports else "empty", "airports": airports}
        elif action == "hotels/detail":
            raw = await self.request("GET", "/data/hotel", params={"hotelId": data["hotel_id"]})
            h = obj(raw.get("data"))
            if h.get("id") != data["hotel_id"]:
                raise ProviderUnavailable("provider_response_invalid")
            result = {**envelope, "status": "ready", "hotel": hotel_content(h)}
        else:
            if action == "hotels/search":
                body = {
                    "checkin": data["check_in"],
                    "checkout": data["check_out"],
                    "currency": data["currency"],
                    "guestNationality": data["guest_nationality"],
                    "occupancies": [
                        {"adults": r["adults"], "children": r["children_ages"]}
                        for r in data["rooms"]
                    ],
                    "includeHotelData": True,
                    "maxRatesPerHotel": 20 if data["hotel_id"] else 4,
                    "limit": 30,
                    "timeout": 12,
                }
                body.update(
                    {"hotelIds": [data["hotel_id"]]}
                    if data["hotel_id"]
                    else {"placeId": data["destination"]["place_id"]}
                    if data["destination"]["place_id"]
                    else {
                        "cityName": data["destination"]["city"],
                        "countryCode": data["destination"]["country_code"],
                    }
                )
                raw = await self.request("POST", "/hotels/rates", json=body)
                if not isinstance(raw.get("data"), list):
                    raise ProviderUnavailable("provider_response_invalid")
                results = normalize_hotels(raw)
                if self.sandbox and self.scope:
                    from .sandbox_checkout import attach_offers
                    attach_offers(self, raw, results, data)
                if raw["data"] and not results:
                    raise ProviderUnavailable("provider_response_invalid")
                truncated = not bool(data["hotel_id"])
                notice = "Showing availability from up to 30 properties; room choices are limited to the returned offers."
            else:
                body = {
                    "legs": [
                        {
                            "origin": data["origin"],
                            "destination": data["destination"],
                            "date": data["departure_date"],
                            "direction": "OUTBOUND",
                        },
                        {
                            "origin": data["destination"],
                            "destination": data["origin"],
                            "date": data["return_date"],
                            "direction": "INBOUND",
                        },
                    ],
                    "adults": data["adults"],
                    "children": len(data["children_ages"]),
                    "infants": len(data["infant_ages"]),
                    "childrenAges": data["children_ages"],
                    "infantAges": data["infant_ages"],
                    "cabinClass": data["cabin_class"],
                    "currency": data["currency"],
                    "country": data["country_code"],
                }
                raw = await self.request("POST", "/flights/rates", json=body)
                if not isinstance(raw.get("data"), list):
                    raise ProviderUnavailable("provider_response_invalid")
                results, truncated = normalize_flights(raw, data)
                if any(items(obj(group).get("journeys")) for group in raw["data"]) and not results:
                    raise ProviderUnavailable("provider_response_invalid")
                if raw["data"] and any(
                    not isinstance(group, dict) or not isinstance(group.get("journeys"), list)
                    for group in raw["data"]
                ):
                    raise ProviderUnavailable("provider_response_invalid")
                notice = "Times are local to each airport. Prices cover all travelers on the return journey."
            result = {
                **envelope,
                "status": "ready" if results else "empty",
                "searched_at": datetime.now(timezone.utc).isoformat(),
                "results": results,
                "returned_count": len(results),
                "truncated": truncated,
                "notices": [notice],
            }
        return OUTPUTS[action].model_validate(result).model_dump(mode="json")
