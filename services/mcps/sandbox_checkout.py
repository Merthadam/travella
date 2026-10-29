"""Sandbox-only checkout. Encrypted handles contain no guest data and are scope bound.

LiteAPI owns mock reservations; this module never writes durable Plan data.
Provider clientReference deduplicates concurrent and interrupted submissions.
"""
import base64
import hashlib
import json
import os
import sqlite3
import fcntl
import time
from pathlib import Path
from contextlib import closing
from urllib.parse import quote
from cryptography.fernet import Fernet, InvalidToken
from services.agent.travel_contracts import SandboxResult
from .liteapi import ProviderUnavailable, items, obj, text, money, normalize_hotels
from .stay_confirmation import room_details, reservation

BOOK = "https://book.liteapi.travel/v3.0"
RECEIPT_TTL = 604800


def cipher(api):
    if not api.sandbox or not api.scope:
        raise ProviderUnavailable("sandbox_only")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(
        ("travella-sandbox-checkout-v1:" + api.key).encode()
    ).digest()))


def seal(api, kind, value):
    return cipher(api).encrypt(json.dumps({**value, "scope": list(api.scope), "kind": kind}).encode()).decode()


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
                    "hotel_name": hotel["name"], "address": hotel.get("address"), "previous_total": room["total"], "check_in": criteria["check_in"],
                    "check_out": criteria["check_out"], "room_count": len(criteria["rooms"]),
                })


def projection(state, token, status, booking=None):
    booking = booking or {}
    verify_booking_identity(state, booking)
    return SandboxResult.model_validate({
        **{k: state[k] for k in ("hotel_name", "check_in", "check_out", "room_count", "total", "room", "terms")},
        "status": status, "token": token, "sandbox": True,
        "booking_id": text(booking.get("bookingId"), 100),
        "confirmation_code": text(booking.get("hotelConfirmationCode"), 100),
        "reservation": reservation(state, booking), "price_changed": state.get("price_changed", False),
    }).model_dump(mode="json")


def booking_status(booking):
    return {"CONFIRMED": "confirmed", "CANCELLED": "cancelled", "CANCELED": "cancelled", "FAILED": "failed"}.get(booking.get("status"), "pending")


def verify_booking_identity(state, booking):
    for expected, actual in (
        (state.get('hotel_id'), obj(booking.get('hotel')).get('hotelId')),
        (state.get('check_in'), booking.get('checkin')),
        (state.get('check_out'), booking.get('checkout')),
        (state.get('prebook'), booking.get('prebookId')),
    ):
        if expected is not None and actual is not None and expected != actual:
            raise ProviderUnavailable('provider_response_invalid')


async def lookup(api, state):
    result = await api.request("GET", BOOK + "/bookings", params={"clientReference": state["reference"]})
    for booking in items(result.get("data")):
        if isinstance(booking, dict) and booking.get("clientReference") == state["reference"]:
            detail = await api.request("GET", BOOK + "/bookings/" + quote(booking["bookingId"], safe=""))
            value = obj(detail.get("data"))
            if value.get("bookingId") != booking["bookingId"]:
                raise ProviderUnavailable("provider_response_invalid")
            verify_booking_identity(state, value)
            return value
    return None


async def _checkout(api, action, data):
    cipher(api)  # Fail closed before ANY provider call, irrespective of browser flags.
    token = data["token"]
    if action == "sandbox/prebook":
        state = unseal(api, token, "offer")
        previous = stored_checkout(api)
        if previous:
            old = unseal(api, previous, "checkout", ttl=604800)
            booking = await lookup(api, old)
            return projection(old, previous, booking_status(booking) if booking else "not_found", booking)
        reference = "tvstay-" + hashlib.sha256(json.dumps(list(api.scope)).encode()).hexdigest()[:40]
        # A technical receipt expires before the durable document. Never mix a
        # newly selected offer with a previous supplier reservation after pruning.
        if await lookup(api, {"reference": reference}):
            raise ProviderUnavailable("stay_already_booked")
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
        changed = state.get("previous_total") != total
        address = state.get("address")
        state = {k: state[k] for k in ("hotel_id", "hotel_name", "check_in", "check_out", "room_count")}
        state.update(address=address, rooms=room_details(rates), price_changed=changed)
        state.update(prebook=p["prebookId"], reference=reference, total=total, room=room,
                     terms=text(p.get("termsAndConditions"), 6000))
        token = seal(api, "checkout", state)
        return projection(state, token, "review")

    state = unseal(api, token, "checkout", ttl=604800)
    previous = stored_checkout(api)
    if previous and previous != token:
        state = unseal(api, previous, "checkout", ttl=604800)
        existing = await lookup(api, state)
        if action == "sandbox/book":
            raise ProviderUnavailable("stay_already_booked")
        return projection(state, previous, booking_status(existing) if existing else "not_found", existing)
    existing = await lookup(api, state)
    if existing:
        return projection(state, token, booking_status(existing), existing)
    if action == "sandbox/status" or previous:
        return projection(state, token, "not_found")
    # Status remains readable for seven days; a fresh submission expires after 15 minutes.
    unseal(api, token, "checkout")
    if len(data["guests"]) != state["room_count"]:
        raise ProviderUnavailable("provider_response_invalid")
    guests = [{"occupancyNumber": i + 1, "firstName": g["first_name"], "lastName": g["last_name"],
               "email": "sandbox-guest@example.com"} for i, g in enumerate(data["guests"])]
    stored_checkout(api, token)
    try:
        raw = await api.request("POST", BOOK + "/rates/book", json={
            "prebookId": state["prebook"], "clientReference": state["reference"],
            "sandbox": True, "holder": {k: guests[0][k] for k in ("firstName", "lastName", "email")},
            "guests": guests, "payment": {"method": "ACC_CREDIT_CARD"},
        })
        booking = obj(raw.get("data"))
        if not booking.get("bookingId"):
            raise ProviderUnavailable("provider_response_invalid")
        # Retrieve the provider's complete confirmation rather than retaining the book payload.
        detail = await lookup(api, state)
        if detail:
            booking = detail
        return projection(state, token, booking_status(booking), booking)
    except ProviderUnavailable:
        # Covers duplicate clientReference and lost responses. Never generate a new reference.
        existing = await lookup(api, state)
        if existing:
            return projection(state, token, booking_status(existing), existing)
        raise


def stay_identity(api):
    return hashlib.sha256(json.dumps([api.key, *api.scope]).encode()).hexdigest()


def receipt_database():
    return os.getenv("STAY_CHECKOUT_JOURNAL", "/tmp/travella-stay-checkouts.sqlite3")


def receipt_table(db):
    db.execute("CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, token TEXT NOT NULL, created_at INTEGER NOT NULL)")
    if 'created_at' not in {row[1] for row in db.execute('PRAGMA table_info(receipts)')}:
        db.execute('ALTER TABLE receipts ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0')
        for identity, token in db.execute('SELECT id, token FROM receipts').fetchall():
            try:
                issued = int.from_bytes(base64.urlsafe_b64decode(token)[1:9], 'big')
            except (ValueError, TypeError):
                issued = 0
            db.execute('UPDATE receipts SET created_at=? WHERE id=?', (issued, identity))
    # Secure deletion also clears freed SQLite pages containing encrypted receipts.
    db.execute('PRAGMA secure_delete=ON')
    db.execute('DELETE FROM receipts WHERE created_at <= ?', (int(time.time()) - RECEIPT_TTL,))


def prune_stay_receipts():
    path = receipt_database()
    if Path(path).exists():
        with closing(sqlite3.connect(path, timeout=5)) as db, db:
            receipt_table(db)


def stored_checkout(api, token=None):
    # Encrypted technical receipt only. The CRUD canvas owns the durable document.
    path = receipt_database()
    with closing(sqlite3.connect(path, timeout=5)) as db, db:
        receipt_table(db)
        if token:
            issued = cipher(api).extract_timestamp(token.encode())
            db.execute("INSERT OR IGNORE INTO receipts VALUES (?, ?, ?)", (stay_identity(api), token, issued))
        row = db.execute("SELECT token FROM receipts WHERE id=?", (stay_identity(api),)).fetchone()
        return row[0] if row else None


async def checkout(api, action, data):
    cipher(api)
    # Serialize check/claim/book across workers, not just within one browser.
    with open('/tmp/travella-stay-' + stay_identity(api) + '.lock', 'w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ProviderUnavailable('checkout_busy') from None
        try:
            return await _checkout(api, action, data)
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)
