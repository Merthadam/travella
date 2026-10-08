"""One bounded SDK loop for activity discovery and explicitly requested draft additions."""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import UTC, datetime
from types import SimpleNamespace

from claude_agent_sdk import HookMatcher, create_sdk_mcp_server, tool
from pydantic import Field

from services.crud.canvas import CanvasSnapshot
from ..editing_contracts import ActivityPlace, CanvasEditResult, MapArea
from ..turn import TurnContext, load_prompt
from .chat_stream import ChatAnswerStream
from .research_result import StrictResult
from .runtime import ClaudeSdkRuntime, ResearchWorkerError, _deny


class PlaceSelection(StrictResult):
    id: str = Field(min_length=1, max_length=80)
    reason: str = Field(max_length=240)


class EditorAnswer(StrictResult):
    answer: str = Field(min_length=1, max_length=2000)
    needs_input: bool
    suggestions: list[PlaceSelection] = Field(max_length=5)
    add_ids: list[str] = Field(max_length=5)
    addition_quote: str = Field(max_length=2000)


def _explicit_addition(message: str, quote: str) -> bool:
    """Require a verbatim current instruction, not permission inferred from history."""
    if not quote.strip() or quote not in message:
        return False
    # Conservative guard in addition to the semantic SDK instruction. Ambiguous
    # requests remain suggestions, with the Add to plan button always available.
    if re.search(r"\b(?:don['’]?t|do not|not yet|never|without)\b.{0,30}\b(?:add|include|put|pin|save)\b", message, re.I):
        return False
    if re.search(r"\b(?:how (?:do|can|would|to)|explain|tell me how|what happens|if (?:I|we|you))\b.{0,100}\b(?:add|include|put|pin)\b", message, re.I):
        return False
    return bool(re.search(r"\b(?:add|include|put|pin)\b", quote, re.I))


class _MapsObserver:
    """Run-local provider registry. Identity, credentials and tickets stay outside prompts."""

    names = {"resolve_destination_area", "search_places", "get_place_details"}

    def __init__(self, client, context, authorization_token, draft, suggestions, area):
        self.client = client
        self.context = context
        self.authorization_token = authorization_token
        self.destination = str(draft.components.get("map", {}).get("destination", ""))
        self.area = area
        self.area_source = "selected_map" if area is not None else "destination_bounds"
        self.resolution_attempted = False
        self.calls = 0
        self.unavailable = False
        self.places = {item.id: item for item in suggestions}
        self.evidence = {}
        self._sync_urls()

    def _sync_urls(self):
        self.evidence = {key: SimpleNamespace(url=item.maps_url) for key, item in self.places.items()}

    async def before(self, data, tool_use_id, context):
        name = data.get("tool_name", "")
        if name == "StructuredOutput":
            return {}
        if name == "Skill" and data.get("tool_input", {}).get("skill") == "canvas-activities":
            return {}
        if name in {f"mcp__maps__{value}" for value in self.names}:
            return {}
        return _deny()

    async def _call(self, name, arguments):
        return await self.client.call(
            name, {**arguments, "plan_id": self.context.plan_id},
            subject=self.context.traveler_scope, plan_id=self.context.plan_id,
            authorization_token=self.authorization_token,
        )

    async def resolve(self):
        if self.area is not None:
            return self.area
        if self.resolution_attempted or not self.destination.strip():
            raise ResearchWorkerError("destination_area_unavailable")
        self.resolution_attempted = True
        response = await self._call("resolve_destination_area", {"destination": self.destination})
        self.area = MapArea.model_validate(response.get("area"))
        if response.get("area_source") == "destination_vicinity":
            self.area_source = "destination_vicinity"
        return self.area

    async def invoke(self, name, arguments):
        try:
            if name == "resolve_destination_area":
                area = await self.resolve()
                payload = {"area": area.model_dump(), "destination": self.destination,
                           "area_source": self.area_source}
            else:
                if self.calls >= 3:
                    raise ResearchWorkerError("maps_call_limit")
                self.calls += 1
                area = await self.resolve()
                if name == "search_places":
                    query = str(arguments.get("query", "")).strip()
                    if not query or len(query) > 200:
                        raise ResearchWorkerError("maps_query_invalid")
                    response = await self._call(name, {"query": query, "area": area.model_dump(), "category": "activity"})
                    raw_places = response.get("places", [])
                else:
                    place_id = arguments.get("place_id")
                    if not any(item.place_id == place_id for item in self.places.values()):
                        raise ResearchWorkerError("maps_unknown_place")
                    response = await self._call(name, {"place_id": place_id})
                    raw_places = [response.get("place")]
                if response.get("status") not in {"ready", "empty"}:
                    raise ResearchWorkerError("maps_unavailable")
                projected = []
                for raw in raw_places[:5]:
                    if not isinstance(raw, dict):
                        continue
                    place = ActivityPlace.model_validate({key: value for key, value in raw.items()
                                                         if key in ActivityPlace.model_fields})
                    # Enforce the search rectangle again at the SDK boundary.
                    if not area.contains(place.position):
                        continue
                    self.places[place.id] = place
                    projected.append(place.model_dump())
                self._sync_urls()
                payload = {"places": projected, "area": area.model_dump(),
                           "area_source": self.area_source, "attribution": "Google Maps"}
            return {"content": [{"type": "text", "text": json.dumps(payload)}]}
        except asyncio.CancelledError:
            raise
        except Exception:
            self.unavailable = True
            return {"isError": True, "content": [{"type": "text", "text": "Maps lookup unavailable for this area. Do not invent places or ratings. Explain the limitation and offer a retry."}]}

    def server(self):
        @tool("resolve_destination_area", "Resolve the current Plan destination's search bounds. No destination override.", {})
        async def resolve(arguments):
            return await self.invoke("resolve_destination_area", arguments)

        @tool("search_places", "Find up to five activities strictly inside this Plan's current search area. Use a short activity/theme query.", {"query": str})
        async def search(arguments):
            return await self.invoke("search_places", arguments)

        @tool("get_place_details", "Read details for a place_id already returned in this Plan's suggestions.", {"place_id": str})
        async def details(arguments):
            return await self.invoke("get_place_details", arguments)

        return create_sdk_mcp_server(name="maps", version="1.0.0", tools=[resolve, search, details])


class ClaudeSdkCanvasEditor:
    def __init__(self, config, *, worker=None, maps_client=None):
        self.config = config
        self.worker = worker if worker is not None else ClaudeSdkRuntime(config)
        self.maps_client = maps_client

    async def complete(self, *, message: str, context: TurnContext, canvas_edit: dict,
                       authorization_token: str = "", on_text_delta=None):
        from ..maps_client import MapsClient

        bounded = context.bounded()
        draft = CanvasSnapshot.model_validate(canvas_edit["draft"])
        suggestions = [ActivityPlace.model_validate(item) for item in canvas_edit.get("suggestions", [])]
        area = MapArea.model_validate(canvas_edit["area"]) if canvas_edit.get("area") else None
        observer = _MapsObserver(self.maps_client or MapsClient(), bounded, authorization_token,
                                 draft, suggestions, area)
        answer_stream = ChatAnswerStream(on_text_delta, observer)
        addition_allowed = _explicit_addition(message, message)
        payload = {
            "current_date_utc": datetime.now(UTC).date().isoformat(),
            "current_message": message[:2000],
            "conversation_history": list(bounded.recent_messages),
            "trip_context": bounded.trip_context,
            "traveler_preferences": bounded.traveler_profile,
            "current_unsaved_canvas": draft.components,
            "previous_suggestions_in_display_order": [item.model_dump() for item in suggestions],
            "explicit_map_area": area.model_dump() if area else None,
            "addition_allowed_this_turn": addition_allowed,
        }
        try:
            async with asyncio.timeout(min(120, self.config.timeout_seconds)):
                with self.worker.session() as (root, cli):
                    options = self.worker._options(root, cli, observer, answer=True,
                                                   budget=min(0.5, self.config.max_budget_usd))
                    options.system_prompt = load_prompt("canvas-editing-v1")
                    options.tools = ["Skill"]
                    options.allowed_tools = ["Skill", *[f"mcp__maps__{name}" for name in sorted(observer.names)]]
                    options.skills = ["canvas-activities"]
                    options.setting_sources = ["project"]
                    options.mcp_servers = {"maps": observer.server()}
                    options.hooks = {"PreToolUse": [HookMatcher(hooks=[observer.before])]}
                    options.max_turns = min(8, self.config.max_turns)
                    options.include_partial_messages = True
                    schema = EditorAnswer.model_json_schema()
                    if not addition_allowed:
                        schema["properties"]["add_ids"]["maxItems"] = 0
                        schema["properties"]["addition_quote"]["maxLength"] = 0
                    options.output_format = {"type": "json_schema", "schema": schema}
                    result = await self.worker._consume(json.dumps(payload), options, structured_stream=answer_stream)
                    reply = EditorAnswer.model_validate(result.structured_output)
                    projected = []
                    for selected in reply.suggestions:
                        if selected.id not in observer.places:
                            raise ResearchWorkerError("canvas_unknown_place")
                        projected.append(observer.places[selected.id].model_copy(update={"reason": selected.reason}))
                    if reply.add_ids and not _explicit_addition(message, reply.addition_quote):
                        raise ResearchWorkerError("canvas_addition_not_requested")
                    output = CanvasEditResult(suggestions=projected, add_ids=reply.add_ids, area=observer.area)
                    await answer_stream.finish(reply.answer)
                    logging.getLogger(__name__).info("canvas_editor_usage calls=1 cost_usd=%s maps_calls=%s", result.total_cost_usd, observer.calls)
                    return {"status": "needs your input" if reply.needs_input else "in_progress",
                            "assistant_text": reply.answer, "question": reply.answer if reply.needs_input else None,
                            "canvas_edit_result": output.model_dump(), "state_changes": []}
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logging.getLogger(__name__).warning("canvas_editor_failed code=%s", error.code if isinstance(error, ResearchWorkerError) else type(error).__name__)
            raise ResearchWorkerError("canvas_editing_unavailable") from None
