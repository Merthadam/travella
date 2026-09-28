"""Inspectable LangGraph flow for one Plan-scoped research request."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .claude import AgentAdapter
from .state import AgentState


def _bounded_candidates(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("invalid candidate projection")
    output = []
    for item in value[:5]:
        if not isinstance(item, dict) or not item.get("candidate_id") or not item.get("name"):
            raise ValueError("invalid candidate projection")
        output.append({key: item[key] for key in ("candidate_id", "name", "status", "confidence", "fit_summary", "caveats", "evidence") if key in item})
    return output


class AgentGraph:
    def __init__(self, adapter: AgentAdapter) -> None:
        self.adapter = adapter
        flow = StateGraph(AgentState)
        flow.add_node("entry", self.entry)
        flow.add_node("focused_question", self.focused_question)
        flow.add_node("research", self.research)
        flow.add_node("map_resolution", self.map_resolution)
        flow.add_node("projection", self.projection)
        flow.add_edge(START, "entry")
        flow.add_conditional_edges("entry", self.route, {"focused_question": "focused_question", "research": "research"})
        flow.add_edge("focused_question", "projection")
        flow.add_edge("research", "map_resolution")
        flow.add_edge("map_resolution", "projection")
        flow.add_edge("projection", END)
        self.compiled = flow.compile()

    async def entry(self, state: AgentState) -> dict[str, Any]:
        return {"status": "preparing", "error": None}

    def route(self, state: AgentState) -> str:
        message = str(state.get("message", "")).strip()
        return "focused_question" if len(message) < 3 else "research"

    async def focused_question(self, state: AgentState) -> dict[str, Any]:
        return {"status": "needs your input", "question": "What kind of trip or destination would you like to explore?"}

    async def research(self, state: AgentState) -> dict[str, Any]:
        action = state.get("candidate_action") or {}
        message = str(state.get("message", "")).strip()
        if action.get("action") == "extend":
            message = f"{message}; suggest additional options"
        if action.get("action") == "refresh":
            message = f"{message}; find current recommendations"
        result = await self.adapter.research(message=message, traveler_scope=state["traveler_scope"], plan_id=state["plan_id"], event_id=state["event_id"], authorization_token=state.get("authorization_token"))
        status = result.get("status") if isinstance(result, dict) else None
        if status in {"question", "needs your input"}:
            return {"status": "needs your input", "question": str(result.get("question", "Tell me a little more about your trip."))}
        if status not in {"ready", "shortlist_ready"}:
            return {"status": "unable to continue", "error": "Research is temporarily unavailable."}
        candidates = _bounded_candidates(result.get("candidates", []))
        return {"status": "searching", "candidates": candidates, "run_id": result.get("run_id", "")}

    async def map_resolution(self, state: AgentState) -> dict[str, Any]:
        candidates = state.get("candidates", [])
        result = await self.adapter.resolve_map(names=[str(c["name"]) for c in candidates], traveler_scope=state["traveler_scope"], plan_id=state["plan_id"], authorization_token=state.get("authorization_token"))
        locations = result.get("locations", []) if isinstance(result, dict) else []
        if not isinstance(locations, list):
            return {"status": "unable to continue", "error": "Map results were invalid."}
        by_name = {str(item.get("candidate_name")): item for item in locations if isinstance(item, dict)}
        joined = []
        for candidate in candidates:
            item = by_name.get(str(candidate["name"]))
            if item:
                joined.append({**candidate, "map_location": {k: item[k] for k in ("place_id", "label", "city", "country", "location", "temporary", "attribution") if k in item}})
            else:
                joined.append(candidate)
        return {"status": "comparing", "candidates": joined}

    async def projection(self, state: AgentState) -> dict[str, Any]:
        status = state.get("status", "unable to continue")
        if status in {"comparing", "searching"}:
            status = "shortlist_ready"
        projection: dict[str, Any] = {"status": status, "plan_id": state["plan_id"], "event_id": state["event_id"], "generation": state.get("generation", 0)}
        if status == "shortlist_ready":
            projection["candidates"] = state.get("candidates", [])[:5]
        if state.get("question"):
            projection["question"] = state["question"]
        if state.get("error"):
            projection["error"] = state["error"]
        return {"projection": projection, "status": status}

    async def invoke(self, state: AgentState) -> dict[str, Any]:
        return await self.compiled.ainvoke(state)
