"""Sandbox-only checkout. Encrypted handles contain no guest data and are scope bound.

LiteAPI owns mock reservations; this module never writes durable Plan data.
Provider clientReference deduplicates concurrent and interrupted submissions.
"""
import base64
import hashlib
import json
from cryptography.fernet import Fernet, InvalidToken
from services.agent.travel_contracts import SandboxResult
from .liteapi import ProviderUnavailable, items, obj, text, money, normalize_hotels

BOOK = "https://book.liteapi.travel/v3.0"


def cipher(api):
    if not api.sandbox or not api.scope:
        raise ProviderUnavailable("sandbox_only")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(
        ("travella-sandbox-checkout-v1:" + api.key).encode()
    ).digest()))


def seal(api, kind, value):
    return cipher(api).encrypt(json.dumps({"scope": list(api.scope), "kind": kind, **value}).encode()).decode()


def unseal(api, token, kind, ttl=900):
    f = cipher(api)
    try:
        value = json.loads(f.decrypt(token.encode(), ttl=ttl))
        if value.get("scope") != list(api.scope) or value.get("kind") != kind:
            raise ValueError()
        return value
    except (InvalidToken, ValueError, TypeError):
        raise ProviderUnavailable("checkout_expired") from None


def attach_offers(api, raw, hotels, criteria):
    offers = {h.get("hotelId"): h for h in items(raw.get("data")) if isinstance(h, dict)}
    for hotel in hotels:
        source = items(offers.get(hotel["hotel_id"], {}).get("roomTypes"))
        for room in hotel["rooms"]:
            index = int(room["id"].rsplit("-", 1)[1])
            offer = obj(source[index])
            if isinstance(offer.get("offerId"), str) and len(offer["offerId"]) <= 20000:
                room["checkout_token"] = seal(api, "offer", {
                    "offer": offer["offerId"], "hotel_id": hotel["hotel_id"],
                    "hotel_name": hotel["name"], "check_in": criteria["check_in"],
                    "check_out": criteria["check_out"], "room_count": len(criteria["rooms"]),
                })


def projection(state, token, status, booking=None):
    booking = booking or {}
    return SandboxResult.model_validate({
        **{k: state[k] for k in ("hotel_name", "check_in", "check_out", "room_count", "total", "room", "terms")},
        "status": status, "token": token, "sandbox": True,
        "booking_id": text(booking.get("bookingId"), 100),
        "confirmation_code": text(booking.get("hotelConfirmationCode"), 100),
    }).model_dump(mode="json")


def booking_status(booking):
    return {"CONFIRMED": "confirmed", "CANCELLED": "cancelled", "CANCELED": "cancelled", "FAILED": "failed"}.get(booking.get("status"), "pending")


async def lookup(api, state):
    result = await api.request("GET", BOOK + "/bookings", params={"clientReference": state["reference"]})
    for booking in items(result.get("data")):
        if isinstance(booking, dict) and booking.get("clientReference") == state["reference"]:
            return booking
    return None


async def checkout(api, action, data):
    cipher(api)  # Fail closed before ANY provider call, irrespective of browser flags.
    token = data["token"]
    if action == "sandbox/prebook":
        state = unseal(api, token, "offer")
        raw = await api.request("POST", BOOK + "/rates/prebook", json={
            "offerId": state["offer"], "usePaymentSdk": False,
        })
        p = obj(raw.get("data"))
        total = money({"amount": p.get("price"), "currency": p.get("currency")})
        if not p.get("prebookId") or total["amount"] is None or not total["currency"]:
            raise ProviderUnavailable("provider_response_invalid")
        if p.get("hotelId") != state["hotel_id"] or p.get("checkin") != state["check_in"] or p.get("checkout") != state["check_out"]:
            raise ProviderUnavailable("provider_response_invalid")
        # A selected offer may group several occupied rooms. Keep all refreshed terms.
        rates = [r for group in items(p.get("roomTypes")) for r in items(obj(group).get("rates"))]
        normalized = normalize_hotels({"data": [{"hotelId": state["hotel_id"], "roomTypes": [{
            "offerRetailRate": total, "rates": rates,
        }]}]})
        if not normalized or {r.get("occupancyNumber") for r in rates} != set(range(1, state["room_count"] + 1)):
            raise ProviderUnavailable("provider_response_invalid")
        room = normalized[0]["rooms"][0]
        reference = "tvtest-" + hashlib.sha256(json.dumps([*api.scope, state["offer"]]).encode()).hexdigest()[:40]
        state = {k: state[k] for k in ("hotel_id", "hotel_name", "check_in", "check_out", "room_count")}
        state.update(prebook=p["prebookId"], reference=reference, total=total, room=room,
                     terms=text(p.get("termsAndConditions"), 6000))
        token = seal(api, "checkout", state)
        return projection(state, token, "review")

    state = unseal(api, token, "checkout", ttl=604800)
    existing = await lookup(api, state)
    if existing:
        return projection(state, token, booking_status(existing), existing)
    if action == "sandbox/status":
        return projection(state, token, "not_found")
    # Status remains readable for seven days; a fresh submission expires after 15 minutes.
    unseal(api, token, "checkout")
    if len(data["guests"]) != state["room_count"]:
        raise ProviderUnavailable("provider_response_invalid")
    guests = [{"occupancyNumber": i + 1, "firstName": g["first_name"], "lastName": g["last_name"],
               "email": "sandbox-guest@example.com"} for i, g in enumerate(data["guests"])]
    try:
        raw = await api.request("POST", BOOK + "/rates/book", json={
            "prebookId": state["prebook"], "clientReference": state["reference"],
            "sandbox": True, "holder": {k: guests[0][k] for k in ("firstName", "lastName", "email")},
            "guests": guests, "payment": {"method": "ACC_CREDIT_CARD"},
        })
        booking = obj(raw.get("data"))
        if not booking.get("bookingId"):
            raise ProviderUnavailable("provider_response_invalid")
        return projection(state, token, booking_status(booking), booking)
    except ProviderUnavailable:
        # Covers duplicate clientReference and lost responses. Never generate a new reference.
        existing = await lookup(api, state)
        if existing:
            return projection(state, token, booking_status(existing), existing)
        raise
