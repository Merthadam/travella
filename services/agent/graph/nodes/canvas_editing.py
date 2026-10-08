"""Activity editing stage inside the existing Plan-scoped LangGraph."""
from ...claude.canvas_editor import ClaudeSdkCanvasEditor
from ...request_context import current_authorization_token, current_text_delta_callback, current_traveler_profile
from ...turn import TurnContext


class CanvasEditingNode:
    def __init__(self, adapter):
        self.adapter = adapter

    async def __call__(self, state):
        config = getattr(self.adapter, "config", None)
        if config is None:
            return {"status": "unable to continue", "error": "Canvas editing is unavailable.",
                    "turn_decision": "respond"}
        context = TurnContext(
            traveler_scope=str(state["traveler_scope"]), plan_id=str(state["plan_id"]),
            conversation_id=state.get("conversation_id"), plan_revision=int(state.get("plan_revision", 1)),
            brief=state.get("brief", {}), trip_context=state.get("trip_context", {}),
            traveler_profile=current_traveler_profile(), recent_messages=tuple(state.get("recent_messages", [])),
            generation=int(state.get("generation", 0)),
        )
        editor = ClaudeSdkCanvasEditor(config, worker=getattr(self.adapter, "worker", None))
        result = await editor.complete(message=str(state.get("message", "")), context=context,
                                       canvas_edit=state["canvas_edit"],
                                       authorization_token=current_authorization_token() or "",
                                       on_text_delta=current_text_delta_callback())
        return {**result, "turn_decision": "respond"}
