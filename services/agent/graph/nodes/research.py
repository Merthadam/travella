"""Bounded evidence retrieval and temporary map resolution stage."""

from __future__ import annotations

from typing import Any

from ...state import AgentState

_CANDIDATE_FIELDS = (
    "candidate_id", "name", "status", "confidence", "fit_summary", "caveats", "evidence"
)
_MAP_FIELDS = (
    "place_id", "label", "city", "country", "location", "temporary", "attribution"
)


def _bounded_candidates(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("invalid candidate projection")
    candidates = []
    for item in value[:5]:
        if not isinstance(item, dict) or not item.get("candidate_id") or not item.get("name"):
            raise ValueError("invalid candidate projection")
        candidates.append({key: item[key] for key in _CANDIDATE_FIELDS if key in item})
    return candidates


class ResearchNode:
    """Run one bounded research request and resolve temporary map locations."""

    def __init__(self, tools: Any) -> None:
        self.tools = tools

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        action = state.get("candidate_action") or {}
        message = str(state.get("message", "")).strip()
        if action.get("action") == "extend":
            message = f"{message}; suggest additional options"
        if action.get("action") == "refresh":
            message = f"{message}; find current recommendations"

        result = await self.tools.research(
            message=message,
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            event_id=state["event_id"],
            authorization_token=state.get("authorization_token"),
        )
        status = result.get("status") if isinstance(result, dict) else None
        if status in {"question", "needs your input"}:
            return {
                "status": "needs your input",
                "question": str(result.get("question", "Tell me a little more about your trip.")),
            }
        if status not in {"ready", "shortlist_ready"}:
            return {"status": "unable to continue", "error": "Research is temporarily unavailable."}

        try:
            candidates = _bounded_candidates(result.get("candidates", []))
        except ValueError:
            return {"status": "unable to continue", "error": "Research results were invalid."}
        if not candidates:
            return {"status": "unable to continue", "error": "No complete candidates were returned."}

        locations_result = await self.tools.resolve_map(
            names=[candidate["name"] for candidate in candidates],
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            authorization_token=state.get("authorization_token"),
        )
        locations = locations_result.get("locations", []) if isinstance(locations_result, dict) else []
        if isinstance(locations, list):
            by_name = {
                str(item.get("candidate_name")): item
                for item in locations
                if isinstance(item, dict) and item.get("candidate_name")
            }
            for candidate in candidates:
                location = by_name.get(str(candidate["name"]))
                if location:
                    candidate["map_location"] = {
                        key: location[key] for key in _MAP_FIELDS if key in location
                    }

        return {
            "status": "shortlist_ready",
            "candidates": candidates,
            "run_id": str(result.get("run_id", "")),
            "assistant_text": str(result.get("assistant_text", ""))[:2000],
        }
