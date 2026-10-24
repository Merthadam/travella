"""Small display facts derived from existing Plan-owned data; never write on read."""
from datetime import date


def summarize_plan(plan):
    snapshot = plan.canvas.payload if plan.canvas else None
    components = (snapshot or {}).get("components", {})
    context = plan.research_context.payload if plan.research_context else {}
    map_data = components.get("map", {})
    # A saved canvas describes the saved trip, even when research has moved on.
    destination = (map_data.get("destination") if map_data.get("final") else None) if snapshot else context.get("finalDestination")
    destination = destination or (plan.destination_summary if not snapshot else None)
    dates = components.get("essentials", {}).get("dates", {}) if snapshot else {
        "start": context.get("dateStart", ""), "end": context.get("dateEnd", ""),
        "flexible": context.get("flexibleDates", False),
    }
    start, end = dates.get("start", ""), dates.get("end", "")
    title = plan.title
    if plan.title_source.value == "automatic":
        if destination:
            title = f"{destination} escape"
            if start and end:
                try:
                    days = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
                    if days > 0:
                        title = f"{days} {'day' if days == 1 else 'days'} in {destination}"
                except ValueError:
                    pass
        elif not snapshot and context.get("candidates"):
            candidates = context["candidates"]
            title = f"Exploring {candidates[0]}" if len(candidates) == 1 else "Finding the right destination"
        title = title[:120]
    return dict(title=title, destination_summary=destination,
                planning_stage="canvas" if snapshot else "research",
                date_start=start, date_end=end, flexible_dates=bool(dates.get("flexible")),
                saved_places_count=len(map_data.get("pins", [])))
