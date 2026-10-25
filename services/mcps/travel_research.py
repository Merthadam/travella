"""Read-only travel evidence and expiring connector-owned flight references.

References are scoped to provider account, traveler and Plan. They are deliberately
ephemeral: after eviction/restart the caller must search again, never reconstruct
an offer from model/browser input. No reservation or payment operations live here.
"""

import hashlib
import json
import re
import time
from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from .liteapi import ProviderUnavailable, items, money, number, obj, text, timestamp

_offers = OrderedDict()
MAX_OFFERS = 512
OFFER_TTL = 600


def _owner(api):
    if not api.key or not api.scope or len(api.scope) != 2 or not all(api.scope):
        raise ProviderUnavailable("offer_expired")
    return hashlib.sha256(json.dumps([api.key, *api.scope]).encode()).hexdigest()


def remember_offer(api, offer, criteria, price):
    owner = _owner(api)
    now = time.monotonic()
    for ref in list(_offers):
        if _offers[ref]["expires"] <= now:
            del _offers[ref]
    while len(_offers) >= MAX_OFFERS:
        _offers.popitem(last=False)
    ttl = OFFER_TTL
    if offer.get("expiration"):
        try:
            expires = datetime.fromisoformat(offer["expiration"].replace("Z", "+00:00"))
            ttl = min(ttl, max(0, (expires - datetime.now(timezone.utc)).total_seconds()))
        except (TypeError, ValueError, AttributeError):
            ttl = 0
    ref = "flight-" + uuid4().hex
    _offers[ref] = {
        "owner": owner,
        "expires": now + ttl,
        "offer": offer["offerId"],
        "criteria": deepcopy(criteria),
        "price": deepcopy(price),
    }
    return ref


def evidence_text(value, limit):
    """Keep free-text evidence bounded and omit contacts/links from projections."""
    value = text(value, 8000)
    if value is None:
        return None
    value = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[contact omitted]", value)
    value = re.sub(r"https?://\S+", "[link omitted]", value)
    return value[:limit]


def normalize_reviews(raw, criteria):
    rows = raw.get("data")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ProviderUnavailable("provider_response_invalid")
    reviews = [
        {
            "score": number(row.get("averageScore"), 0, 10),
            "date": timestamp(row.get("date")),
            **{
                key: evidence_text(row.get(key), 240 if key == "headline" else 600)
                for key in ("headline", "pros", "cons")
            },
        }
        for row in rows[: criteria["limit"]]
    ]
    sentiment = None
    analysis = obj(raw.get("sentimentAnalysis")) if criteria["sentiment"] else {}
    if analysis:
        sentiment = {
            "ai_generated": True,
            "categories": [
                {
                    "name": evidence_text(row["name"], 80),
                    "score": number(row.get("rating"), 0, 10),
                    "description": evidence_text(row.get("description"), 400),
                }
                for row in items(analysis.get("categories"))
                if isinstance(row, dict) and text(row.get("name"))
            ][:10],
            **{
                key: [
                    evidence_text(value, 160)
                    for value in items(analysis.get(key))
                    if isinstance(value, str) and value.strip()
                ][:10]
                for key in ("pros", "cons")
            },
        }
    notices = [
        "Guest reports are opinions, not verified property facts. This is a limited review sample."
    ]
    if criteria["sentiment"]:
        notices.append(
            "AI sentiment summarizes up to the last 1,000 provider reviews."
            if sentiment
            else "Review sentiment was not supplied."
        )
    return {
        "status": "ready" if reviews or sentiment else "empty",
        "hotel_id": criteria["hotel_id"],
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "reviews": reviews,
        "sentiment": sentiment,
        "notices": notices,
    }


async def verify_offer(api, option_id):
    # No raw offer identifier, dates, party or identity may be supplied by callers.
    owner = _owner(api)
    state = _offers.get(option_id)
    if not state or state["owner"] != owner or state["expires"] <= time.monotonic():
        raise ProviderUnavailable("offer_expired")
    raw = await api.request("POST", "/flights/verify", json={"offerId": state["offer"]})
    from .flight_checkout import first, flight_for

    result = first(raw)
    journey = obj(result.get("journey"))
    flight = flight_for(journey, state["criteria"])
    if flight["price"]["currency"] != state["criteria"]["currency"]:
        raise ProviderUnavailable("provider_response_invalid")
    flight["id"] = option_id
    terms, fare = obj(journey.get("terms")), obj(journey.get("fare"))
    fee = obj(obj(obj(terms.get("changeFee")).get("pricing")).get("display"))
    previous = {key: state["price"].get(key) for key in ("amount", "currency")}
    current = {key: flight["price"].get(key) for key in ("amount", "currency")}
    notices = [
        "Price and availability checked now; nothing reserved or booked.",
        "Missing baggage, fees or fare conditions remain unknown.",
    ]
    notices.extend(
        evidence_text(value, 240)
        for value in items(obj(result.get("changes")).get("messages"))
        if isinstance(value, str)
    )
    return {
        "status": "ready",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "flight": flight,
        "previous_price": previous,
        "price_changed": previous["currency"] != current["currency"]
        or previous["amount"] is None
        or Decimal(previous["amount"]) != Decimal(current["amount"]),
        "fare_name": evidence_text(fare.get("family"), 240),
        "mixed_cabin": fare.get("mixedCabin") if type(fare.get("mixedCabin")) is bool else None,
        "changeable": terms.get("changeable") if type(terms.get("changeable")) is bool else None,
        "change_fee": money(fee) if fee else None,
        "notices": notices[:10],
    }
