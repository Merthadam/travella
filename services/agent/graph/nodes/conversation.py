"""Conversation stage for a single authenticated Plan turn."""

from __future__ import annotations

from typing import Any

from ...state import AgentState
from ...turn import TurnContext


class ConversationNode:
    """Build bounded model context and decide whether research should run."""

    def __init__(self, model: Any) -> None:
        self.model = model

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        message = str(state.get("message", "")).strip()
        if not message:
            return {
                "status": "needs your input",
                "question": "What kind of trip or destination would you like to explore?",
                "turn_decision": "respond",
            }

        complete = getattr(self.model, "complete_conversation", None)
        if complete is None:
            return {"status": "preparing", "turn_decision": "research"}

        context = TurnContext(
            traveler_scope=str(state["traveler_scope"]),
            plan_id=str(state["plan_id"]),
            conversation_id=state.get("conversation_id"),
            plan_revision=int(state.get("plan_revision", 1)),
            brief=state.get("brief", {}),
            tentative_inferences=state.get("tentative_inferences", {}),
            recent_messages=tuple(state.get("recent_messages", [])),
            research_state=state.get("research_state", {}),
            generation=int(state.get("generation", 0)),
        )
        result = await complete(
            message=message,
            context=context,
            authorization_token=state.get("authorization_token", ""),
        )
        if not isinstance(result, dict):
            return {
                "status": "unable to continue",
                "error": "Conversation response was invalid.",
                "turn_decision": "respond",
            }

        decision = result.get("decision")
        if decision not in {"question", "research", "respond"}:
            decision = "research"
        question = str(result["question"])[:500] if result.get("question") else None
        output: dict[str, Any] = {
            "turn_decision": decision,
            "assistant_text": str(result.get("assistant_text", ""))[:2000],
        }
        if decision == "question" or question:
            output.update(
                status="needs your input",
                question=question or "What matters most for this trip?",
                turn_decision="respond",
            )
        elif decision == "respond":
            output["status"] = "in_progress"
        return output
