"""Sandbox flight checkout; private, scope-bound handles and at-most-once prebooks.

The journal holds only encrypted technical checkout receipts, never Plan data or
passenger details. An uncertain prebook is not repeated automatically.
"""
import fcntl
import hashlib
import json
import os
import sqlite3
from contextlib import closing
from urllib.parse import quote
from datetime import date

from services.agent.travel_contracts import SandboxFlightResult
from .liteapi import ProviderUnavailable, items, obj, text, money, normalize_flights
from .sandbox_checkout import cipher, seal, unseal
from . import flight_ancillaries


def journal():
    db = sqlite3.connect(os.getenv("FLIGHT_CHECKOUT_JOURNAL", "/tmp/travella-flight-checkouts.sqlite3"), timeout=5)
    db.execute("CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, token TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS catalogs (id TEXT PRIMARY KEY, data TEXT)")
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


def inventory(api, state, value=None):
    with closing(journal()) as db, db:
        key = identity(api, state)
        if value is not None:
            value = flight_ancillaries.prefer_selected(value, state.get("selected_services", []))
            encrypted = cipher(api).encrypt(json.dumps(value).encode()).decode()
            db.execute("INSERT OR REPLACE INTO catalogs VALUES (?, ?)", (key, encrypted))
            return value
        row = db.execute("SELECT data FROM catalogs WHERE id=?", (key,)).fetchone()
        value = json.loads(cipher(api).decrypt(row[0].encode())) if row else {}
        return flight_ancillaries.prefer_selected(value, state.get("selected_services", []))


def refresh(api, state, raw):
    total = money({"amount": raw.get("price"), "currency": raw.get("currency")})
    if total["amount"] is None or not total["currency"] or raw.get("prebookId") != state["prebook"]:
        raise ProviderUnavailable("provider_response_invalid")
    state["flight"]["price"].update(total)
    state["payment_secret"] = text(raw.get("secretKey"), 300)
    state["transaction"] = text(raw.get("transactionId"), 200)
    state["eligible"] = bool(state["payment_secret"] and state["transaction"]) if state.get("sdk") else "ACC_CREDIT_CARD" in items(raw.get("paymentTypes"))
    previous = inventory(api, state)
    available = flight_ancillaries.catalog(raw, state["criteria"])
    # Attached seats disappear from the available catalog. Keep their scoped
    # identifiers so a subsequent bag update can send the full replacement set.
    attached = {hashlib.sha256(value["serviceId"].encode()).hexdigest()[:32]: value for value in items(obj(raw.get("booking")).get("selectedServices")) if isinstance(value, dict) and isinstance(value.get("serviceId"), str)}
    for selected in state.get("selected_services", []):
        sid = selected["id"]
        if sid in available:
            continue
        if sid in previous:
            available[sid] = previous[sid]
        elif sid in attached and attached[sid].get("passengerIndex") == selected["passenger_index"]:
            # Recovery of receipts written before attached inventory was retained.
            available[sid] = {**{k: selected[k] for k in ("id", "kind", "label", "segment_index", "price")}, "provider_id": attached[sid]["serviceId"], "passenger_indexes": [selected["passenger_index"]], "max_quantity": selected["quantity"], "seat_row": None, "seat_column": None}
    inventory(api, state, available)


def project(api, state, token, status, booking=None):
    booking = booking or {}
    return SandboxFlightResult.model_validate({
        "status": status, "token": token, "flight": state["flight"],
        "services": list(inventory(api, state).values()) if status == "ready_to_book" else [],
        "selected_services": state.get("selected_services", []),
        "payment_secret": state.get("payment_secret") if status == "ready_to_book" else None,
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
    # A non-blocking cross-process lock prevents service repricing racing booking.
    cipher(api)
    if action == "verify":
        return await checkout_locked(api, action, data)
    try:
        state = unseal(api, data["token"], "flight-checkout", ttl=604800)
    except ProviderUnavailable:
        state = unseal(api, data["token"], "flight-review", ttl=604800)
    path = os.getenv("FLIGHT_CHECKOUT_JOURNAL", "/tmp/travella-flight-checkouts.sqlite3") + "." + identity(api, state) + ".lock"
    with open(path, "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ProviderUnavailable("checkout_busy") from None
        return await checkout_locked(api, action, data)


async def checkout_locked(api, action, data):
    cipher(api)  # Sandbox key and authenticated subject/Plan are required before I/O.
    token = data["token"]
    if action == "verify":
        state = unseal(api, token, "flight-offer")
        raw = first(await api.request("POST", "/flights/verify", json={"offerId": state["offer"]}))
        state["flight"] = flight_for(obj(raw.get("journey")), state["criteria"], state["flight"])
        token = seal(api, "flight-review", state)
        return project(api, state, token, "review")

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
                    "offerId": state["offer"], "usePaymentSdk": True,
                    "contact": contact,
                    "passengers": party,
                }))
                if not text(raw.get("prebookId"), 100):
                    raise ProviderUnavailable("provider_response_invalid")
                # Preserve a recoverable receipt even if refreshed terms are invalid.
                state.update(prebook=raw["prebookId"], eligible=False, sdk=True, revision=0)
                token = seal(api, "flight-checkout", state)
                remember(api, state, token)
                state["flight"] = flight_for(obj(obj(raw.get("booking")).get("journey")), state["criteria"], state["flight"])
                refresh(api, state, raw)
                token = seal(api, "flight-checkout", state)
                remember(api, state, token)
                return project(api, state, token, "ready_to_book" if state["eligible"] else "unknown")
        else:
            _, saved = receipt(api, state)
        if not saved:
            return project(api, state, token, "unknown")
        token = saved
        state = unseal(api, token, "flight-checkout", ttl=604800)

    # Never authorize a stale total or payment intent from an older tab.
    submitted_revision = state.get("revision", 0)
    _, saved = receipt(api, state)
    if saved:
        token = saved
        state = unseal(api, token, "flight-checkout", ttl=604800)
    if action in ("services", "book") and not state.get("booking_id"):
        unseal(api, data["token"], "flight-checkout")
        if submitted_revision != state.get("revision", 0):
            raise ProviderUnavailable("checkout_changed")
    if action == "services" and not state.get("booking_id"):
        selected, payload = flight_ancillaries.select(inventory(api, state), data["selected_services"])
        # If the response is lost, booking stays disabled until provider readback.
        state.update(eligible=False, services_uncertain=True, revision=state.get("revision", 0) + 1)
        token = seal(api, "flight-checkout", state)
        remember(api, state, token)
        raw = first(await api.request("POST", "/flights/prebooks/" + quote(state["prebook"], safe="") + "/services", json={"selectedServices": payload}))
        state["selected_services"] = selected
        refresh(api, state, raw)
        state["services_uncertain"] = False
        token = seal(api, "flight-checkout", state)
        remember(api, state, token)
        return project(api, state, token, "ready_to_book" if state["eligible"] else "unknown")
    missing_inventory = any(s["id"] not in inventory(api, state) for s in state.get("selected_services", []))
    if action == "status" and (state.get("services_uncertain") or missing_inventory) and not state.get("booking_id"):
        raw = first(await api.request("GET", "/flights/prebooks/" + quote(state["prebook"], safe="")))
        selected = flight_ancillaries.recover(inventory(api, state), raw) if state.get("services_uncertain") else state.get("selected_services", [])
        state["selected_services"] = selected
        refresh(api, state, raw)
        state["services_uncertain"] = False
        token = seal(api, "flight-checkout", state)
        remember(api, state, token)

    if action == "book" and not state.get("booking_id"):
        unseal(api, token, "flight-checkout")
        if not state.get("eligible"):
            return project(api, state, token, "unknown")
        # Provider documents idempotency by prebookId, including lost responses.
        raw = first(await api.request("POST", "/flights/bookings/", json={
            "prebookId": state["prebook"], "payment": ({"method": "TRANSACTION_ID", "transactionId": state["transaction"]} if state.get("sdk") else {"method": "ACC_CREDIT_CARD"}),
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
        return project(api, state, token, "ready_to_book" if state.get("eligible") else "unknown")
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
    return project(api, state, token, status, booking)
