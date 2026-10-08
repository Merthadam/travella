"""Assemble the small Plan-scoped LangGraph workflow."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from ..request_context import (
    bind_authorization_token,
    bind_canvas_callback,
    bind_text_delta_callback,
    bind_traveler_profile,
    reset_authorization_token,
    reset_canvas_callback,
    reset_text_delta_callback,
    reset_traveler_profile,
)
from ..state import AgentState
from .nodes import ConversationNode
from .nodes.canvas_generation import CanvasGenerationNode
from .nodes.canvas_editing import CanvasEditingNode


class AgentGraph:
    """Stable graph interface: inject adapters, invoke with one Plan turn."""

    def __init__(self, adapter: Any, *, checkpointer: Any | None = None,
                 canvas_worker: Any | None = None) -> None:
        flow = StateGraph(AgentState)
        flow.add_node("chat", ConversationNode(adapter))
        flow.add_node("canvas_generation", CanvasGenerationNode(canvas_worker))
        flow.add_node("canvas_editing", CanvasEditingNode(adapter))
        flow.add_conditional_edges(
            START,
            lambda state: "canvas_editing" if state.get("canvas_edit") else "canvas_generation" if state.get("canvas_action") else "chat",
            {"canvas_generation": "canvas_generation", "canvas_editing": "canvas_editing", "chat": "chat"},
        )
        flow.add_edge("chat", END)
        flow.add_edge("canvas_generation", END)
        flow.add_edge("canvas_editing", END)
        self.compiled = flow.compile(checkpointer=checkpointer)

    async def invoke(
        self,
        state: AgentState,
        *,
        authorization_token: str | None = None,
        traveler_profile: dict[str, Any] | None = None,
        on_text_delta: Any | None = None,
        on_canvas_draft: Any | None = None,
    ) -> dict[str, Any]:
        context_token = bind_authorization_token(authorization_token)
        profile_token = bind_traveler_profile(traveler_profile)
        text_token = bind_text_delta_callback(on_text_delta)
        canvas_token = bind_canvas_callback(on_canvas_draft)
        try:
            result = await self.compiled.ainvoke(state, config={"recursion_limit": 12})
        finally:
            reset_canvas_callback(canvas_token)
            reset_text_delta_callback(text_token)
            reset_traveler_profile(profile_token)
            reset_authorization_token(context_token)
        status = result.get("status", "unable to continue")
        projection: dict[str, Any] = {
            "status": status,
            "plan_id": result["plan_id"],
            "event_id": result["event_id"],
            "generation": result.get("generation", 0),
        }
        if state.get("canvas_action"):
            # A canvas request has no conversational or research output to project.
            if result.get("canvas_draft"):
                projection["canvas_draft"] = result.get("canvas_draft")
            if result.get("error"):
                projection["error"] = result["error"]
            return {**result, "projection": projection}
        if result.get("research_evidence"):
            # Preserve the citation identity for the API to validate against this
            # turn's successfully read evidence before reducing it to browser refs.
            sources = result.get("research_sources", [])
            evidence = {
                str(item.get("evidence_id")): item
                for item in result.get("research_evidence", [])
                if isinstance(item, dict)
                and item.get("read_status") == "read"
                and item.get("evidence_id")
            }
            cited_ids = set(result.get("research_evidence_ids", []))
            projection["sources"] = [
                {
                    "evidence_id": str(source.get("evidence_id")),
                    "title": source.get("title", ""),
                    "url": source.get("url", ""),
                }
                for source in sources[:3]
                if isinstance(source, dict)
                and str(source.get("evidence_id", "")) in cited_ids
                and str(source.get("evidence_id", "")) in evidence
            ] if isinstance(sources, list) else []
        for field in ("question", "assistant_text", "error", "canvas_edit_result"):
            if result.get(field):
                projection[field] = result[field]
        return {**result, "projection": projection}
