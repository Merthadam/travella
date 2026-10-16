"""Read-only flight previews in Research, using the same private travel tool gate."""
import re

from services.crud.canvas import CanvasSnapshot

from .claude.canvas_travel import (
    CANCEL, CanvasTravelObserver, TravelSelection, focused_followup, search_history,
)
from .request_context import collect_travel_results, current_authorization_token
from .travel_client import TravelClient


def flight_preview_requested(message, context):
    """A search request or its focused answers, not every mention of flying."""
    if CANCEL.search(message) or re.search(r"\b(?:do not|don't|don’t|not yet)\b", message, re.I):
        return False
    history = search_history(message, context)
    if focused_followup(message) and any(re.search(r"\bflights?\b", text, re.I) for _, text in history):
        return True
    return bool(re.search(r"\bflights?\b", message, re.I)
                and re.search(r"\b(?:find|search|look for|show|preview|compare|check|available|options)\b", message, re.I))


def research_flight_draft(context):
    # Only exact traveler-owned research dates can substitute for current text.
    trip = context.trip_context
    provenance = trip.get("provenance", {})
    explicit = all(provenance.get(key, {}).get("source") in {"user_edit", "user_explicit"}
                   for key in ("dateStart", "dateEnd"))
    return CanvasSnapshot(components={"essentials": {
        "status": "ready", "dates": {
            "start": trip.get("dateStart", "") if explicit else "",
            "end": trip.get("dateEnd", "") if explicit else "",
            "note": "", "flexible": bool(trip.get("flexibleDates", False)),
        }, "travelers": trip.get("travelers"), "budget": {"label": "", "noFixedBudget": True},
    }})


async def preview_flights(message, context):
    observer = CanvasTravelObserver(TravelClient(), context, current_authorization_token() or "",
                                    research_flight_draft(context), message, flight_only=True)
    if observer.question:
        answer = observer.question
    else:
        # The host invokes the same bounded, read-only tool after all criteria pass.
        # No model is needed to invent arguments or choose a booking action.
        await observer.invoke("search_flights", {})
        batches = observer.selected([
            TravelSelection(search_id=s.search_id, mode="flights", option_ids=[x.id for x in s.results[:3]])
            for s in observer.snapshots.values()
        ])
        collect_travel_results(batches)
        answer = observer.answer(batches).replace("Here are flights options", "Here are flight options").replace("Plan chat", "Research chat")
    return {"status": "needs your input" if observer.questions else "in_progress",
            "assistant_text": answer, "question": answer if observer.questions else None,
            "state_changes": [], "research_flights": True, "turn_decision": "respond"}
