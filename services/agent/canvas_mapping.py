"""Deterministic approved component mappings; no inference or booking claims."""
from services.trip_context import TripContext


def mapped_components(context: dict) -> dict:
    trip = TripContext.model_validate(context)
    result = {
        "essentials": {"status": "ready", "dates": {
            "start": trip.dateStart, "end": trip.dateEnd, "note": trip.dateNote,
            "flexible": trip.flexibleDates}, "travelers": trip.travelers,
            "budget": {"label": trip.budget, "noFixedBudget": trip.noFixedBudget}},
        "map": {"status": "ready" if trip.finalDestination else "empty",
                "destination": trip.finalDestination, "final": bool(trip.finalDestination), "pins": []},
    }
    for key, title in (("flights", "Flights"), ("accommodation", "Accommodation")):
        result[key] = {"status": "ready", "need": getattr(trip, key),
                       "bookingStatus": "not-booked", "title": title,
                       "subtitle": "Explore options for your trip",
                       "detail": "Search will be available here soon.", "availability": "unavailable"}
    return result
