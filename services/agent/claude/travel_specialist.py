"""Disposable, topic-scoped Claude workers inside the Plan orchestration graph."""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Literal

from claude_agent_sdk import HookMatcher
from pydantic import Field

from services.crud.canvas import CanvasSnapshot
from services.travel_topics import Comparison, ResearchOption, TopicNote, TopicNotes, WorkspaceView

from ..request_context import collect_travel_results, collect_workspace_update
from ..travel_client import TravelClient
from ..turn import TurnContext
from .canvas_travel import TravelSelection
from .canvas_travel_tools import SpecialistTravelTools
from .chat_stream import ChatAnswerStream
from .research_result import StrictResult
from .runtime import ClaudeSdkRuntime, ResearchWorkerError, _deny


class ComparisonReference(StrictResult):
    search_id: str = Field(min_length=1, max_length=100)
    option_id: str = Field(min_length=1, max_length=100)
    room_id: str | None = Field(default=None, min_length=1, max_length=100,
        description="For stays, select the exact observed room/rate discussed in the answer. Never substitute the property's cheapest rate. For flights use null.")


class NoteQuote(StrictResult):
    text: str = Field(min_length=1, max_length=400)
    kind: Literal["user_preference", "rejection", "research_override"]
    source_message_id: str = Field(min_length=1, max_length=100)


class SpecialistAnswer(StrictResult):
    answer: str = Field(min_length=1, max_length=2000)
    needs_input: bool
    comparisons: list[ComparisonReference] = Field(default_factory=list, max_length=3)
    notes: list[NoteQuote] = Field(default_factory=list, max_length=6)
    workspace_view: WorkspaceView | None = Field(default=None,
        description="Optional complete final temporary view of observed results. Use only this topic's filters and observed exact references. Never changes saved choices.")


class WorkspaceTravelTools(SpecialistTravelTools):
    """Track the successful search returned to this worker, including zero matches."""
    final_search_id = None

    async def _invoke(self, name, arguments):
        response = await super()._invoke(name, arguments)
        if name in {"search_stays", "search_flights"} and not response.get("is_error"):
            payload = json.loads(response["content"][0]["text"])
            if payload.get("search_id") in self.snapshots:
                self.final_search_id = payload["search_id"]
        return response


def _selected_room(option, room_id):
    rooms = getattr(option, "rooms", [])
    if room_id is not None:
        room = next((item for item in rooms if item.id == room_id), None)
        if room is None:
            raise ValueError("travel_room_unknown")
        return room
    if len(rooms) > 1:
        raise ValueError("travel_room_selection_required")
    return rooms[0] if rooms else None


def _comparison(snapshot, option, observed_at=None, *, room_id=None):
    """All durable facts are host-authored from validated supplier observations."""
    criteria = snapshot.criteria.model_dump(mode="json")
    facts, unknowns = [], []
    price = option.price
    room = _selected_room(option, room_id)
    if room is not None:
        price = price.model_copy(update={**room.total.model_dump(), "excluded_taxes": room.excluded_taxes})
    price_label = f"{price.amount} {price.currency}" if price.amount and price.currency else "Price unknown"
    if price.estimated:
        price_label += " (estimated)"
    if snapshot.mode == "stays":
        title = option.name[:160]
        projected = {"destination": criteria["destination"]["city"], "check_in": criteria["check_in"],
                     "check_out": criteria["check_out"], "currency": criteria["currency"],
                     "travelers": sum(r["adults"] + len(r["children_ages"]) for r in criteria["rooms"])}
        price_label += " · stay total"
        if option.address:
            facts.append(option.address[:240])
        if option.review_score is not None:
            facts.append(f"Guest score: {option.review_score}/10" + (f" from {option.review_count} reviews" if option.review_count is not None else ""))
        if room is not None:
            facts.append(f"Room: {room.name}"[:240])
            if room.board_name:
                facts.append(f"Meals: {room.board_name}"[:240])
            if room.refundable is not None:
                facts.append("Shown room is refundable" if room.refundable else "Shown room is non-refundable")
            else:
                unknowns.append("Refundability not provided")
            if room.cancellation_summary:
                facts.append(room.cancellation_summary[:240])
        else:
            unknowns.append("Room and cancellation terms not provided")
        unknowns.append("A property facility does not confirm a private room amenity")
    else:
        title = f"{criteria['origin']} → {criteria['destination']} · {', '.join(option.airlines)}"[:160]
        projected = {key: criteria[key] for key in ("origin", "destination", "departure_date", "return_date", "adults", "currency")}
        projected.update(children=len(criteria["children_ages"]), travelers=criteria["adults"] + len(criteria["children_ages"]) + len(criteria["infant_ages"]), cabin=criteria["cabin_class"])
        price_label += " · return party total"
        for label, leg in (("Outbound", option.outbound), ("Return", option.inbound)):
            facts.append(f"{label}: {leg.segments[0].departure_at} → {leg.segments[-1].arrival_at}"[:240])
            if leg.stops is not None:
                facts.append(f"{label} stops: {leg.stops}")
        if option.baggage_summary:
            facts.append(option.baggage_summary[:240])
        else:
            unknowns.append("Baggage allowance not provided")
        if option.cancellation_summary:
            facts.append(option.cancellation_summary[:240])
        else:
            unknowns.append("Cancellation and change terms not provided")
    if price.excluded_taxes:
        facts.append("Additional taxes or fees are excluded from the shown total")
    if snapshot.sandbox:
        facts.append("Sandbox result; not a live booking")
    return ResearchOption(id=option.id, title=title, summary="Research option; nothing booked.",
                          price_label=price_label[:120], facts=facts[:8], unknowns=unknowns[:6],
                          observed_at=observed_at or snapshot.searched_at, provider=snapshot.provider, criteria=projected,
                          reference={"search_id": snapshot.search_id, "option_id": option.id, "room_id": room.id if room else None})


def _notes(previous, proposed, messages):
    """Retain provenance and only accept exact traveler quotes as new memory."""
    prior = TopicNotes.model_validate(previous or {})
    sources = {str(item.get("id", item.get("message_id", ""))): item for item in messages}
    added = []
    for note in proposed:
        source = sources.get(note.source_message_id)
        if not source or source.get("role") != "user" or note.text not in source.get("content", ""):
            raise ValueError("unattributed_specialist_note")
        added.append(TopicNote(text=note.text, kind=note.kind, source_message_ids=[note.source_message_id]))
    combined = prior.items + added
    unique = {(note.kind, note.text, tuple(note.source_message_ids)): note for note in combined}
    items = list(unique.values())[-12:]
    # Notes are advisory excerpts, never a claim to have summarized every message.
    cutoff = max([prior.covered_through_sequence, *[int(item.get("sequence", 0)) for item in messages]])
    result = TopicNotes(items=[], covered_through_sequence=cutoff, incomplete=True)
    for item in reversed(items):
        candidate = result.model_copy(update={"items": [item, *result.items]})
        if len(candidate.model_dump_json().encode()) <= 4096:
            result = candidate
    return result


class ClaudeSdkTravelSpecialist:
    def __init__(self, config, *, worker=None, travel_client=None):
        self.config = config
        self.worker = worker if worker is not None else ClaudeSdkRuntime(config)
        self.travel_client = travel_client

    async def complete(self, *, message: str, context: TurnContext, topic: str, brief: dict,
                       notes=None, saved_canvas: dict | None = None,
                       saved_research: dict | None = None, authorization_token: str = "", on_text_delta=None,
                       selected_context=None, workspace_context=None):
        if topic not in {"stays", "flights"}:
            raise ValueError("invalid_specialist_topic")
        if len(json.dumps(brief, ensure_ascii=False).encode()) > 8192:
            raise ValueError("specialist_brief_limit")
        # Strip explicit foreign-topic messages before the ordinary text bounds.
        from dataclasses import replace
        scoped = tuple(item for item in context.recent_messages if item.get("topic", topic) == topic)
        bounded = replace(context, recent_messages=tuple(item for item in scoped if item.get("status") != "pending")).bounded()
        prior_notes = TopicNotes.model_validate(notes or {})
        historical = saved_research or {}
        if len(json.dumps(historical, ensure_ascii=False).encode()) > 12288:
            historical = {"omitted": True, "reason": "Previous research exceeded the context budget. Ask which option to revisit."}
        draft = CanvasSnapshot.model_validate(saved_canvas) if saved_canvas else SimpleNamespace(components={})
        if saved_canvas:
            # ResearchContext is authoritative after a trip-detail edit; the
            # persisted Canvas may still carry its previous date/party baseline.
            from copy import deepcopy
            draft = draft.model_copy(deep=True)
            essentials = draft.components.setdefault("essentials", {})
            if isinstance(brief.get("dates"), dict):
                essentials["dates"] = {**essentials.get("dates", {}), **deepcopy(brief["dates"])}
            if type(brief.get("travelers")) is int:
                essentials["travelers"] = brief["travelers"]
            if isinstance(brief.get("destination"), str):
                draft.components.setdefault("map", {})["destination"] = brief["destination"]
        travel = WorkspaceTravelTools(self.travel_client or TravelClient(), bounded,
            authorization_token, draft, message, time.monotonic() + min(120, self.config.timeout_seconds), topic=topic)
        if not saved_canvas:
            travel.names = set()
        attached = []
        current_snapshot = None
        if workspace_context and workspace_context.get("search_id"):
            from ..travel_registry import travel_registry
            current_snapshot = travel_registry.get(context.traveler_scope, context.plan_id, workspace_context["search_id"], topic)
            travel.snapshots[current_snapshot.search_id] = current_snapshot
            for option in current_snapshot.results:
                if topic == "stays":
                    travel.observed_hotel_ids.add(option.hotel_id)
                else:
                    travel.observed_flight_ids.add(option.id)
        if selected_context:
            from .canvas_travel import draft_facts
            for snap in selected_context["snapshots"]:
                snap = snap.model_copy(deep=True)
                snap.draft_facts = draft_facts(draft)
                snap.generation = context.generation
                travel.snapshots[snap.search_id] = snap
                for option in snap.results:
                    if topic == "stays":
                        travel.observed_hotel_ids.add(option.hotel_id)
                    else:
                        travel.observed_flight_ids.add(option.id)
            for ref in selected_context["discussion"].options:
                snap = travel.snapshots[ref.search_id]
                option = next(o for o in snap.results if o.id == ref.option_id)
                # The selected item can be beyond the ordinary ten-option preview.
                snap.results.remove(option); snap.results.insert(0, option)
                attached.append({"reference": ref.model_dump(), "criteria": snap.criteria.model_dump(mode="json"),
                                 "observed_at": snap.searched_at, "option": option.model_dump(mode="json")})
        observer = SimpleNamespace(evidence={})
        answer_stream = ChatAnswerStream(on_text_delta, observer)
        skill = "stay-specialist" if topic == "stays" else "flight-specialist"

        async def tool_guard(data, tool_use_id, hook_context):
            name = data.get("tool_name", "")
            if name == "StructuredOutput" or name in {f"mcp__travel__{name}" for name in travel.names}:
                return {}
            if name == "Skill" and data.get("tool_input", {}).get("skill") == skill:
                return {}
            return _deny()

        payload = {"current_date_utc": datetime.now(UTC).date().isoformat(), "topic": topic,
                   "current_message": message[:2000], "trip_brief": brief,
                   "conversation_history": list(bounded.recent_messages), "attributed_notes": prior_notes.model_dump(),
                   "inventory_tools_available": bool(saved_canvas), "previous_research": historical}
        if workspace_context:
            payload["workspace"] = workspace_context
            payload["workspace_instruction"] = "This is temporary applied research, not saved trip facts. Pending draft edits prohibit workspace changes. After a successful search the host replaces the main list once. workspace_view may filter/sort/dismiss/compare only observed members; never weaken a hard requirement."
            if current_snapshot:
                payload["workspace_options"] = travel._preview_options(current_snapshot)
        if attached:
            payload["selected_options"] = attached
            payload["selection_intent"] = selected_context["discussion"].intent
        current = next((item for item in reversed(scoped) if item.get("status") == "pending" and item.get("role") == "user" and item.get("content") == message), None)
        if current:
            payload["current_message_id"] = str(current.get("message_id", current.get("id", "")))
        try:
            async with asyncio.timeout(min(120, self.config.timeout_seconds)):
                with self.worker.session() as (root, cli):
                    options = self.worker._options(root, cli, observer, answer=True, budget=min(0.5, self.config.max_budget_usd))
                    options.system_prompt = (Path(__file__).parents[1] / "prompts/travel-specialist-v1.md").read_text()
                    options.tools = ["Skill"]
                    options.allowed_tools = ["Skill", *[f"mcp__travel__{name}" for name in sorted(travel.names)]]
                    options.skills = [skill]
                    options.setting_sources = ["project"]
                    options.mcp_servers = {"travel": travel.server()}
                    options.hooks = {"PreToolUse": [HookMatcher(hooks=[tool_guard])]}
                    options.max_turns = min(12, self.config.max_turns)
                    options.include_partial_messages = True
                    schema = SpecialistAnswer.model_json_schema()
                    if topic == "stays":
                        # Normalized stay offers contain room rates. Require the
                        # model to name one, so its prose and card share a rate.
                        reference = schema["$defs"]["ComparisonReference"]
                        reference["properties"]["room_id"] = {"type": "string", "minLength": 1, "maxLength": 100,
                            "description": "Exact observed room/rate ID discussed in the answer."}
                        reference["required"].append("room_id")
                    options.output_format = {"type": "json_schema", "schema": schema}
                    result = await self.worker._consume(json.dumps(payload), options, structured_stream=answer_stream)
                    reply = SpecialistAnswer.model_validate(result.structured_output)
                    grouped = defaultdict(list)
                    for reference in reply.comparisons:
                        grouped[reference.search_id].append(reference.option_id)
                    selections = [TravelSelection(search_id=key, mode=topic, option_ids=ids) for key, ids in grouped.items()]
                    bundles = travel.selected(selections)
                    comparison = Comparison(options=[_comparison(travel.snapshots[ref.search_id], next(item for item in travel.snapshots[ref.search_id].results if item.id == ref.option_id), travel.observation_times.get(ref.option_id), room_id=ref.room_id) for ref in reply.comparisons])
                    # Keep the original full search for an explicit manual handoff.
                    from ..travel_registry import travel_registry
                    for snap in travel.snapshots.values():
                        travel_registry.put(context.traveler_scope, context.plan_id, snap)
                    if workspace_context and not workspace_context.get("draft_dirty"):
                        final_id = travel.final_search_id or (current_snapshot.search_id if current_snapshot and reply.workspace_view else None)
                        if final_id:
                            final = travel.snapshots[final_id]
                            view = reply.workspace_view or WorkspaceView()
                            view.validate_topic(topic)
                            view.validate_members(final)
                            collect_workspace_update({"search_id": final_id, "view": view.model_dump()})
                    # The ephemeral option previews must display that same rate,
                    # too. Keep the observer's complete evidence registry intact.
                    for ref in reply.comparisons:
                        if topic != "stays":
                            continue
                        snap = travel.snapshots[ref.search_id]
                        option = next(item for item in snap.results if item.id == ref.option_id)
                        room = _selected_room(option, ref.room_id)
                        if room is not None:
                            bundle = next(item for item in bundles if item["search_id"] == ref.search_id)
                            projected = next(item for item in bundle["results"] if item["id"] == ref.option_id)
                            projected["rooms"] = [room.model_dump(mode="json")]
                            projected["price"] = {**projected["price"], **room.total.model_dump(),
                                                  "excluded_taxes": [tax.model_dump() for tax in room.excluded_taxes]}
                    output_notes = _notes(prior_notes.model_dump(), reply.notes, scoped)
                    await answer_stream.finish(reply.answer)
                    collect_travel_results(bundles)
                    logging.getLogger(__name__).info("travel_specialist topic=%s calls=%s rates=%s", topic, travel.calls, travel.rate_calls)
                    return {"status": "needs your input" if reply.needs_input else "in_progress",
                            "assistant_text": reply.answer, "question": reply.answer if reply.needs_input else None,
                            "state_changes": [], "travel_specialist_result": {"topic": topic,
                            "comparison": comparison.model_dump(), "notes": output_notes.model_dump()}}
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logging.getLogger(__name__).warning("travel_specialist_failed topic=%s code=%s", topic, error.code if isinstance(error, ResearchWorkerError) else type(error).__name__)
            raise ResearchWorkerError("travel_specialist_unavailable") from None
