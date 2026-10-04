"""Assemble the small Plan-scoped LangGraph workflow."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from ..request_context import (
    bind_authorization_token,
    bind_text_delta_callback,
    reset_authorization_token,
    reset_text_delta_callback,
)
from ..state import AgentState
from .nodes import ConversationNode, ResearchNode


def _after_conversation(state: AgentState) -> str:
    return "research" if state.get("turn_decision") == "research" else "end"


class AgentGraph:
    """Stable graph interface: inject adapters, invoke with one Plan turn."""

    def __init__(self, adapter: Any, *, checkpointer: Any | None = None) -> None:
        flow = StateGraph(AgentState)
        flow.add_node("conversation", ConversationNode(adapter))
        flow.add_node("research", ResearchNode(adapter))
        flow.add_edge(START, "conversation")
        flow.add_conditional_edges(
            "conversation", _after_conversation, {"research": "research", "end": END}
        )
        flow.add_edge("research", END)
        self.compiled = flow.compile(checkpointer=checkpointer)

    async def invoke(
        self,
        state: AgentState,
        *,
        authorization_token: str | None = None,
        on_text_delta: Any | None = None,
    ) -> dict[str, Any]:
        context_token = bind_authorization_token(authorization_token)
        text_token = bind_text_delta_callback(on_text_delta)
        try:
            result = await self.compiled.ainvoke(state)
        finally:
            reset_text_delta_callback(text_token)
            reset_authorization_token(context_token)
        status = result.get("status", "unable to continue")
        projection: dict[str, Any] = {
            "status": status,
            "plan_id": result["plan_id"],
            "event_id": result["event_id"],
            "generation": result.get("generation", 0),
        }
        if status == "shortlist_ready":
            projection["candidates"] = result.get("candidates", [])[:5]
            projection["research_intent"] = result.get("research_intent")
            if result.get("run_id"):
                projection["run_id"] = result["run_id"]
            sources = result.get("research_sources", [])
            projection["sources"] = sources[:3] if isinstance(sources, list) else []
        for field in ("question", "assistant_text", "error"):
            if result.get(field):
                projection[field] = result[field]
        return {**result, "projection": projection}
