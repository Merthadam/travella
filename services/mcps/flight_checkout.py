"""Sandbox flight checkout; private, scope-bound handles and at-most-once prebooks.

The journal holds only encrypted technical checkout receipts, never Plan data or
passenger details. An uncertain prebook is not repeated automatically.
"""
import hashlib
import json
import os
import sqlite3
from contextlib import closing
from datetime import date

from services.agent.travel_contracts import SandboxFlightResult
from .liteapi import ProviderUnavailable, items, obj, text, money, normalize_flights
from .sandbox_checkout import cipher, seal, unseal


def journal():
    db = sqlite3.connect(os.getenv("FLIGHT_CHECKOUT_JOURNAL", "/tmp/travella-flight-checkouts.sqlite3"), timeout=5)
    db.execute("CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, token TEXT)")
    return db


def identity(api, state):
    return hashlib.sha256(json.dumps([api.key, *api.scope, state["offer"]]).encode()).hexdigest()


def receipt(api, state, claim=False):
    with closing(journal()) as db, db:
        if claim:
            inserted = db.execute("INSERT OR IGNORE INTO receipts VALUES (?, NULL)", (identity(api, state),)).rowcount
            if inserted:
                return True, None
        row = db.execute("SELECT token FROM receipts WHERE id=?", (identity(api, state),)).fetchone()
        return False, row[0] if row else None


def remember(api, state, token):
    with closing(journal()) as db, db:
        db.execute("UPDATE receipts SET token=? WHERE id=?", (token, identity(api, state)))


def first(raw):
    rows = items(raw.get("data"))
    if len(rows) != 1 or not isinstance(rows[0], dict):
        raise ProviderUnavailable("provider_response_invalid")
    return rows[0]


def flight_for(journey, criteria, selected=None):
    # Verify/prebook use a single journey with pricing, not search's offers list.
    normalized, _ = normalize_flights({"data": [{"journeys": [{**journey, "cheapestOffer": journey}]}]}, criteria)
    if len(normalized) != 1 or normalized[0]["price"]["amount"] is None:
        raise ProviderUnavailable("provider_response_invalid")
    if selected:
        # A city-wide search may return different airports. Once an offer is
        # selected, verification must retain its actual airports in both legs.
        for direction in ("outbound", "inbound"):
            before = selected[direction]["segments"]
            after = normalized[0][direction]["segments"]
            if before[0]["origin"] != after[0]["origin"] or before[-1]["destination"] != after[-1]["destination"]:
                raise ProviderUnavailable("provider_response_invalid")
    return normalized[0]


def project(state, token, status, booking=None):
    booking = booking or {}
    return SandboxFlightResult.model_validate({
        "status": status, "token": token, "flight": state["flight"],
        "passenger_count": state["criteria"]["adults"] + len(state["criteria"]["children_ages"]) + len(state["criteria"]["infant_ages"]),
        "passenger_ages": [30] * state["criteria"]["adults"] + state["criteria"]["children_ages"] + state["criteria"]["infant_ages"],
        "country_code": state["criteria"]["country_code"],
        "booking_id": text(booking.get("bookingId"), 100),
        "confirmation_code": text(booking.get("bookingRef"), 100),
    }).model_dump(mode="json")


def passengers(criteria):
    departure = date.fromisoformat(criteria["departure_date"])
    ages = [(0, 30)] * criteria["adults"] + [(1, age) for age in criteria["children_ages"]] + [(2, age) for age in criteria["infant_ages"]]
    names = ["Alex", "Sam", "Jamie", "Robin", "Casey", "Taylor", "Morgan", "Jordan", "Drew"]
    return [{"firstName": names[i], "lastName": "Tester", "birthday": f"{departure.year-age:04d}-{departure.month:02d}-{min(departure.day, 28):02d}",
             "gender": "M", "nationality": criteria["country_code"], "documentType": "passport",
             "documentNumber": f"TEST0000{i}", "documentIssueCountry": criteria["country_code"],
             "documentExpiry": f"{departure.year+5}-12-31", "passengerType": kind}
            for i, (kind, age) in enumerate(ages)]


def booking_party(criteria, data):
    """Validate against the sealed search before reserving; do not retain PII."""
    defaults = passengers(criteria)
    contact = {"firstName": "Alex", "lastName": "Tester", "email": "sandbox-guest@example.com", "phoneCountryCode": "1", "phoneNumber": "2025550123"}
    if data.get("passengers") is None:
        return defaults, contact  # Existing clients/technical receipt recovery.
    supplied = data["passengers"]
    if len(supplied) != len(defaults):
        raise ProviderUnavailable("invalid_passengers")
    departure = date.fromisoformat(criteria["departure_date"])
    returning = date.fromisoformat(criteria["return_date"])
    result = []
    for actual, expected in zip(supplied, defaults):
        birth = date.fromisoformat(actual["date_of_birth"])
        age = departure.year - birth.year - ((departure.month, departure.day) < (birth.month, birth.day))
        kind = expected["passengerType"]
        if birth > date.today() or age < 0 or age > 120 or (kind == 0 and age < 12) or (kind == 1 and not 2 <= age <= 11) or (kind == 2 and age > 1) or date.fromisoformat(actual["document_expiry"]) <= returning:
            raise ProviderUnavailable("invalid_passengers")
        # Child/infant ages must also match the priced search, not just its category.
        if kind != 0:
            expected_age = departure.year - date.fromisoformat(expected["birthday"]).year
            if age != expected_age:
                raise ProviderUnavailable("invalid_passengers")
        result.append({**expected, "firstName": actual["first_name"], "lastName": actual["last_name"],
                       "birthday": actual["date_of_birth"], "gender": actual["gender"], "nationality": actual["nationality"],
                       "documentNumber": actual["document_number"], "documentIssueCountry": actual["document_issue_country"],
                       "documentExpiry": actual["document_expiry"]})
    value = data["contact"]
    contact = {"firstName": value["first_name"], "lastName": value["last_name"], "email": value["email"],
               "phoneCountryCode": value["phone_country_code"], "phoneNumber": value["phone_number"]}
    return result, contact


async def checkout(api, action, data):
    cipher(api)  # Sandbox key and authenticated subject/Plan are required before I/O.
    token = data["token"]
    if action == "verify":
        state = unseal(api, token, "flight-offer")
        raw = first(await api.request("POST", "/flights/verify", json={"offerId": state["offer"]}))
        state["flight"] = flight_for(obj(raw.get("journey")), state["criteria"], state["flight"])
        token = seal(api, "flight-review", state)
        return project(state, token, "review")

    # Both a review and a prebook receipt can recover an interrupted response.
    try:
        state = unseal(api, token, "flight-checkout", ttl=604800)
    except ProviderUnavailable:
        state = unseal(api, token, "flight-review", ttl=604800)
        if action == "prebook":
            unseal(api, token, "flight-review")
            party, contact = booking_party(state["criteria"], data)
            claimed, saved = receipt(api, state, claim=True)
            if claimed:
                raw = first(await api.request("POST", "/flights/prebooks", json={
                    "offerId": state["offer"], "usePaymentSdk": False,
                    "contact": contact,
                    "passengers": party,
                }))
                if not text(raw.get("prebookId"), 100):
                    raise ProviderUnavailable("provider_response_invalid")
                # Preserve a recoverable receipt even if refreshed terms are invalid.
                state.update(prebook=raw["prebookId"], eligible=False)
                token = seal(api, "flight-checkout", state)
                remember(api, state, token)
                state["flight"] = flight_for(obj(obj(raw.get("booking")).get("journey")), state["criteria"], state["flight"])
                total = money({"amount": raw.get("price"), "currency": raw.get("currency")})
                if total["amount"] is None or not total["currency"]:
                    raise ProviderUnavailable("provider_response_invalid")
                state["flight"]["price"].update(total)
                state["eligible"] = "ACC_CREDIT_CARD" in items(raw.get("paymentTypes"))
                token = seal(api, "flight-checkout", state)
                remember(api, state, token)
                return project(state, token, "ready_to_book" if state["eligible"] else "unknown")
        else:
            _, saved = receipt(api, state)
        if not saved:
            return project(state, token, "unknown")
        token = saved
        state = unseal(api, token, "flight-checkout", ttl=604800)

    if action == "book":
        unseal(api, token, "flight-checkout")
        if not state.get("eligible"):
            return project(state, token, "unknown")
        # Provider documents idempotency by prebookId, including lost responses.
        raw = first(await api.request("POST", "/flights/bookings/", json={
            "prebookId": state["prebook"], "payment": {"method": "ACC_CREDIT_CARD"},
        }))
        booking = obj(raw.get("booking"))
        bid = text(booking.get("bookingId"), 100)
        if not bid:
            raise ProviderUnavailable("provider_response_invalid")
        state["booking_id"] = bid
        token = seal(api, "flight-checkout", state)
        remember(api, state, token)

    # The journal may contain a newer booking receipt than the browser.
    _, saved = receipt(api, state)
    if saved:
        token = saved
        state = unseal(api, token, "flight-checkout", ttl=604800)
    if not state.get("booking_id"):
        return project(state, token, "ready_to_book" if state.get("eligible") else "unknown")
    from urllib.parse import quote
    raw = first(await api.request("GET", "/flights/bookings/" + quote(state["booking_id"], safe="")))
    booking = obj(raw.get("booking"))
    # Current LiteAPI readback puts its environment under the ticket point of
    # sale. Retain the earlier field, rejecting absent or conflicting markers.
    environments = [value for value in (
        booking.get("providerEnvironment"),
        obj(obj(booking.get("ticketData")).get("pointOfSale")).get("environment"),
    ) if value is not None]
    if booking.get("bookingId") != state["booking_id"] or not environments or any(value != "sandbox" for value in environments):
        raise ProviderUnavailable("provider_response_invalid")
    status = {"CONFIRMED": "confirmed", "CANCELLED": "cancelled", "CANCELLED_WITH_CHARGES": "cancelled"}.get(booking.get("status"), "pending")
    return project(state, token, status, booking)
