"""Initial canvas generation stage: a proposed Themes & preferences component."""

from typing import Any

from ...canvas_contracts import CanvasDraft, ThemesComponent
from ...request_context import current_traveler_profile
from ...state import AgentState
from ...turn import TurnContext


class CanvasGenerationNode:
    def __init__(self, worker: Any = None) -> None:
        self.worker = worker

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        try:
            if state.get("canvas_action") != "generate_themes":
                raise ValueError("Unsupported canvas action")
            if self.worker is None:
                from ...claude.themes_worker import ClaudeThemesWorker
                from ...config import ResearchWorkerConfig

                self.worker = ClaudeThemesWorker(ResearchWorkerConfig.from_env())
            context = TurnContext(
                traveler_scope=state["traveler_scope"], plan_id=state["plan_id"],
                brief=state.get("brief", {}), trip_context=state.get("trip_context", {}),
                recent_messages=tuple(state.get("recent_messages", [])),
                traveler_profile=current_traveler_profile(),
            )
            raw = await self.worker.run(context=context, message=state.get("message", ""))
            draft = CanvasDraft(data=ThemesComponent.model_validate(raw))
            return {"status": "canvas_draft_ready", "canvas_draft": draft.model_dump(),
                    "assistant_text": "", "question": None, "error": None,
                    "state_changes": []}
        except Exception:
            # Cancellation propagates as BaseException into SDK process cleanup.
            return {"status": "unable to continue", "canvas_draft": None,
                    "assistant_text": "", "question": None, "state_changes": [],
                    "error": "Your trip preferences could not be summarized. Please try again."}
