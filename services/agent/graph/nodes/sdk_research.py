"""One graph invocation around the SDK-owned research loop."""

from __future__ import annotations

from typing import Any

from ...claude.research_result import ResearchResult
from ...request_context import (
    current_text_delta_callback,
    current_traveler_profile,
)
from ...state import AgentState
from ...turn import TurnContext
from .research import ResearchProjection, _reusable_evidence


class SdkResearchNode(ResearchProjection):
    """Delegate all web research to the SDK and project its shared-state suggestions."""

    def __init__(self, tools: Any, worker: Any) -> None:
        super().__init__(tools)
        self.worker = worker

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        intent = state.get("research_intent")
        if intent not in {"factual_research", "destination_discovery"}:
            return {
                "status": "needs your input",
                "question": "Would you like facts about a place, or destination suggestions?",
                "research_action": "answer",
            }
        message = str(state.get("resolved_research_message") or state.get("message", "")).strip()[:2000]
        action = (state.get("candidate_action") or {}).get("action")
        if action == "extend":
            message += "; suggest additional options"
        elif action == "refresh":
            message += "; find current recommendations"
        bounded = TurnContext(
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            brief=state.get("brief", {}),
            traveler_profile=current_traveler_profile(),
            recent_messages=tuple(state.get("recent_messages", [])),
        ).bounded()
        # Identity and bearer credentials stay in the tool boundary, outside the SDK.
        context = {
            "brief": bounded.brief,
            "traveler_profile": bounded.traveler_profile,
            "recent_messages": list(bounded.recent_messages),
            "trip_context": state.get("trip_context", {}),
            "state_changes": state.get("state_changes", []),
        }
        try:
            if self.worker is None:
                from ...claude.research_worker import ClaudeResearchWorker
                from ...config import ResearchWorkerConfig

                self.worker = ClaudeResearchWorker(ResearchWorkerConfig.from_env())
            raw = await self.worker.run(
                message=message,
                context=context,
                research_intent=intent,
                candidates=[],
                reusable_evidence=[] if action == "refresh" else _reusable_evidence(state, message),
                on_text_delta=current_text_delta_callback(),
            )
            result = ResearchResult.model_validate(raw)
            output = await self._terminal(
                state={**state, "message": message}, candidates=[],
                evidence=[item.model_dump() for item in result.evidence],
                result={}, answer=result.answer, evidence_ids=result.evidence_ids,
                uncertainty=result.uncertainty, pass_count=1, queries=[],
            )
            changes = list(state.get("state_changes", []))
            removed = {str(item.get("value", "")).casefold() for item in changes if item.get("operation") == "remove_candidate"}
            existing = {name.casefold() for name in context["trip_context"].get("candidates", [])}
            if intent == "destination_discovery":
                for name in result.candidate_names:
                    if name.casefold() not in removed | existing and len(existing) < 20:
                        changes.append({"operation": "add_candidate", "field": "candidates", "value": name, "source": "research", "source_quote": ""})
                        existing.add(name.casefold())
            output["state_changes"] = changes[:24]
            return output
        except Exception:
            # CancelledError is a BaseException and propagates to SDK/process cleanup.
            # SDK diagnostics can include prompts or credentials: never project them.
            return {"status": "unable to continue",
                    "assistant_text": "", "research_action": "answer",
                    "error": "Research is temporarily unavailable. Please try again."}
