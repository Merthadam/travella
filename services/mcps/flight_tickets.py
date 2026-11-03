"""Read-only ticket records; never retain passenger data or query an unowned booking."""
import json
import os
import sqlite3
from contextlib import closing
from urllib.parse import quote

from cryptography.fernet import InvalidToken

from services.agent.travel_contracts import FlightTicketsResult

from .flight_checkout import first
from .liteapi import ProviderUnavailable, items, obj, text
from .sandbox_checkout import cipher


def owned_receipt(api, booking_id):
    decryptor = cipher(api)  # Requires a sandbox key and authenticated scope.
    path = os.getenv("FLIGHT_CHECKOUT_JOURNAL", "/tmp/travella-flight-checkouts.sqlite3")
    if not os.path.isfile(path):
        raise ProviderUnavailable("booking_not_found")
    # Reading an already booked document does not authorize another payment or
    # reservation, and is independent of the browser's expiring checkout handle.
    with closing(sqlite3.connect(f"file:{quote(path, safe='/')}?mode=ro", uri=True)) as db:
        for token, in db.execute("SELECT token FROM receipts WHERE token IS NOT NULL"):
            try:
                state = json.loads(decryptor.decrypt(token.encode()))
            except (InvalidToken, ValueError, TypeError):
                continue
            if (isinstance(state, dict) and state.get("scope") == list(api.scope)
                    and state.get("kind") == "flight-checkout" and state.get("booking_id") == booking_id):
                return state
    raise ProviderUnavailable("booking_not_found")


async def ticket_records(api, booking_id):
    state = owned_receipt(api, booking_id)
    raw = first(await api.request("GET", "/flights/bookings/" + quote(booking_id, safe="")))
    booking = obj(raw.get("booking"))
    data = obj(booking.get("ticketData"))
    environments = [v for v in (booking.get("providerEnvironment"), obj(data.get("pointOfSale")).get("environment")) if v is not None]
    if booking.get("bookingId") != booking_id or not environments or any(v != "sandbox" for v in environments):
        raise ProviderUnavailable("provider_response_invalid")
    status = {"CONFIRMED": "confirmed", "CANCELLED": "cancelled", "CANCELLED_WITH_CHARGES": "cancelled"}.get(booking.get("status"), "pending")
    criteria = state["criteria"]
    count = criteria["adults"] + len(criteria["children_ages"]) + len(criteria["infant_ages"])
    tickets, seen = [], set()
    party = items(booking.get("passengers"))
    if status == "confirmed":
        for item in items(data.get("tickets"))[:90]:
            item = obj(item)
            index = item.get("passengerIndex")
            number = text(item.get("ticketNumber"), 100)
            ticket_status = text(item.get("status"), 40)
            if type(index) is not int or not 0 <= index < count or not number or not ticket_status:
                continue
            # Only use the explicit provider passenger association. Never zip a
            # partial ticket list to the passenger list or invent an index/name.
            first_name, last_name = text(item.get("firstName"), 80), text(item.get("lastName"), 80)
            passenger = obj(party[index]) if index < len(party) else {}
            if not first_name or not last_name or first_name != text(passenger.get("firstName"), 80) or last_name != text(passenger.get("lastName"), 80):
                continue
            if number in seen:
                continue
            seen.add(number)
            name = " ".join(p for p in (first_name, text(item.get("middleName"), 80), last_name) if p)
            tickets.append({"passenger_index": index, "passenger_name": name[:240], "ticket_number": number, "status": ticket_status.lower()})
    return FlightTicketsResult(booking_id=booking_id, status=status, passenger_count=count,
                               issued_at=text(data.get("ticketedAt"), 40), tickets=tickets).model_dump(mode="json")
