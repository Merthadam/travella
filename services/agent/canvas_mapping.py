"""Deterministic approved component mappings; no inference or booking claims."""
from services.trip_context import TripContext


def mapped_components(context: dict) -> dict:
    trip = TripContext.model_validate(context)
    result = {
        "essentials": {"status": "ready", "dates": {
            "start": trip.dateStart, "end": trip.dateEnd, "note": trip.dateNote,
            "flexible": trip.flexibleDates}, "travelers": trip.travelers,
            "budget": {"label": trip.budget, "noFixedBudget": trip.noFixedBudget}},
        "map": {"status": "ready",
                "destination": trip.finalDestination, "final": bool(trip.finalDestination), "pins": []},
    }
    detail = ("Flexible dates" if trip.flexibleDates else
              " → ".join(value for value in (trip.dateStart, trip.dateEnd) if value) or "Dates not set")
    subtitle = f"{trip.travelers} travelers" if trip.travelers else "Travelers not set"
    for key, prefix in (("flights", "Flights to"), ("accommodation", "Stay in")):
        title = f"{prefix} {trip.finalDestination}" if trip.finalDestination else "Destination not set"
        result[key] = {"status": "ready", "need": getattr(trip, key),
                       "bookingStatus": "not-booked", "title": title,
                       "subtitle": subtitle, "detail": detail, "availability": "unavailable"}
    return result
