"""One graph invocation around the SDK-owned research loop."""

from __future__ import annotations

from typing import Any

from ...claude.research_result import ResearchResult
from ...request_context import (
    current_authorization_token,
    current_text_delta_callback,
    current_traveler_profile,
)
from ...state import AgentState
from ...turn import TurnContext
from .research import ResearchProjection, _bounded_candidates, _reusable_evidence


class SdkResearchNode(ResearchProjection):
    """Preserve candidate tools and state projection; delegate research to one worker."""

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
        }
        candidates: list[dict[str, Any]] = []
        discovery: dict[str, Any] = {}
        try:
            if intent == "destination_discovery":
                discovery = await self.tools.research(
                    message=message,
                    traveler_scope=state["traveler_scope"],
                    plan_id=state["plan_id"],
                    event_id=state["event_id"],
                    authorization_token=current_authorization_token(),
                    research_intent=intent,
                )
                if discovery.get("status") in {"question", "needs your input"}:
                    question = str(discovery.get("question") or "Tell me more about your trip.")[:500]
                    return {"status": "needs your input", "question": question,
                            "assistant_text": question, "research_action": "answer"}
                if discovery.get("status") not in {"ready", "shortlist_ready", "uncertain"}:
                    raise ValueError("candidate research unavailable")
                candidates = _bounded_candidates(discovery.get("candidates", []))
                if not candidates:
                    raise ValueError("candidate research incomplete")
            if self.worker is None:
                from ...claude.research_worker import ClaudeResearchWorker
                from ...config import ResearchWorkerConfig

                self.worker = ClaudeResearchWorker(ResearchWorkerConfig.from_env())
            raw = await self.worker.run(
                message=message,
                context=context,
                research_intent=intent,
                candidates=[{"candidate_id": item["candidate_id"], "name": item["name"]}
                            for item in candidates],
                reusable_evidence=[] if action == "refresh" else _reusable_evidence(state, message),
                on_text_delta=current_text_delta_callback(),
            )
            result = ResearchResult.model_validate(raw)
            return await self._terminal(
                state={**state, "message": message}, candidates=candidates,
                evidence=[item.model_dump() for item in result.evidence],
                result=discovery, answer=result.answer, evidence_ids=result.evidence_ids,
                uncertainty=result.uncertainty, pass_count=1, queries=[],
            )
        except Exception:
            # CancelledError is a BaseException and propagates to SDK/process cleanup.
            # SDK diagnostics can include prompts or credentials: never project them.
            return {"status": "unable to continue",
                    "assistant_text": "", "research_action": "answer",
                    "error": "Research is temporarily unavailable. Please try again."}
