"""Assemble the small Plan-scoped LangGraph workflow."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from ..request_context import (
    bind_authorization_token,
    bind_text_delta_callback,
    bind_traveler_profile,
    reset_authorization_token,
    reset_text_delta_callback,
    reset_traveler_profile,
)
from ..state import AgentState
from .nodes import ConversationNode
from .nodes.sdk_research import SdkResearchNode


def _after_conversation(state: AgentState) -> str:
    return "research" if state.get("turn_decision") == "research" else "end"



class AgentGraph:
    """Stable graph interface: inject adapters, invoke with one Plan turn."""

    def __init__(self, adapter: Any, *, checkpointer: Any | None = None,
                 research_worker: Any | None = None) -> None:
        flow = StateGraph(AgentState)
        flow.add_node("conversation", ConversationNode(adapter))
        flow.add_node("research", SdkResearchNode(adapter, research_worker))
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
        traveler_profile: dict[str, Any] | None = None,
        on_text_delta: Any | None = None,
    ) -> dict[str, Any]:
        context_token = bind_authorization_token(authorization_token)
        profile_token = bind_traveler_profile(traveler_profile)
        text_token = bind_text_delta_callback(on_text_delta)
        try:
            result = await self.compiled.ainvoke(state, config={"recursion_limit": 12})
        finally:
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
        if status == "shortlist_ready":
            projection["candidates"] = result.get("candidates", [])[:5]
            projection["research_intent"] = result.get("research_intent")
            if result.get("run_id"):
                projection["run_id"] = result["run_id"]
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
        for field in ("question", "assistant_text", "error"):
            if result.get(field):
                projection[field] = result[field]
        return {**result, "projection": projection}
