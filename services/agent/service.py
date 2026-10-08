"""Application use case for one Plan event, independent of FastAPI routing."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import HTTPException

from services.shared.traveler_profile import PROFILE_FIELDS, profile_context
from services.trip_context import ContextSnapshot, TurnResult, a2ui_messages

from .http_contracts import AgentRequest, AgentResponse
from .editing_contracts import CanvasEditResult
from .place_tickets import sign_place, verified_place
from .state import PlanRunStore, ProcessReceiptCache


class AgentTurnService:
    """Authorize, gather CRUD context, run the graph, and publish one event."""

    def __init__(
        self,
        *,
        plan_reader: Callable[..., Any],
        context_reader: Any | None,
        graph: Any,
        runs: PlanRunStore,
        receipts: ProcessReceiptCache,
        memory: Any | None = None,
    ) -> None:
        self.plan_reader = plan_reader
        self.context_reader = context_reader
        self.graph = graph
        self.runs = runs
        self.receipts = receipts
        self.memory = memory
        self._evidence_cache: dict[tuple[str, str], tuple[float, list[dict]]] = {}
        self._active_streams: dict[tuple[str, str, str], dict[str, Any]] = {}

    async def _read_plan(self, subject: str, plan_id: UUID, token: str) -> dict[str, Any]:
        try:
            result = self.plan_reader(subject, plan_id, token)
            if isinstance(result, Awaitable):
                result = await result
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(503, "Plan service unavailable.") from exc
        if not result or result.get("lifecycle") != "active":
            raise HTTPException(404, "Plan unavailable.")
        owner = result.get("traveler_subject")
        if owner and owner != subject:
            raise HTTPException(404, "Plan unavailable.")
        return result

    async def handle(
        self,
        request: AgentRequest,
        subject: str,
        authorization: str | None,
        *,
        on_text_delta: Callable[[str], Any] | None = None,
        on_canvas_draft: Callable[[dict], Any] | None = None,
    ) -> AgentResponse:
        token = (authorization or "")[7:].strip()
        plan = await self._read_plan(subject, request.plan_id, token)
        plan_id = str(request.plan_id)
        edit_input = None
        if request.canvas_edit:
            try:
                edit_input = request.canvas_edit.model_dump(mode="json")
                edit_input["suggestions"] = [verified_place(subject, plan_id, place)
                                             for place in request.canvas_edit.suggestions]
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from None
        if request.forwardedProps:
            if request.message or not self.context_reader:
                raise HTTPException(422, "Send Trip Brief edits separately from chat messages.")
            action = request.forwardedProps.a2ui.action
            snapshot = await self.context_reader.edit_context(
                request.plan_id, token, event_id=request.event_id,
                revision=action.context.revision,
                changes=[change.model_dump() for change in action.context.changes],
            )
            return AgentResponse(status="in_progress", plan_id=request.plan_id,
                                 event_id=request.event_id, trip_context=snapshot)
        context = (
            await self.context_reader.context(request.plan_id, token) if self.context_reader else {}
        )
        traveler_profile: dict[str, Any] = {}
        if self.context_reader and hasattr(self.context_reader, "profile"):
            try:
                current = await self.context_reader.profile(token)
            except Exception:
                # Profile context is advisory; an unavailable profile service must
                # not break an otherwise valid Plan turn.
                current = None
            if isinstance(current, dict):
                traveler_profile = profile_context(current)
                if self.memory is not None and self.memory.enabled:
                    try:
                        remembered = await self.memory.retrieve_relevant_memory(
                            subject, "traveler profile"
                        )
                    except Exception:
                        remembered = None
                    # A mirrored copy can only substitute an identical canonical
                    # snapshot, including explicit empty/null preferences.
                    if (
                        remembered
                        and remembered.get("updated_at") == current.get("updated_at")
                        and all(remembered.get(key) == current.get(key) for key in PROFILE_FIELDS)
                    ):
                        traveler_profile = profile_context(current)
        try:
            reservation = await self.runs.reserve(subject, plan_id, request.event_id, exclusive=True)
        except ValueError:
            raise HTTPException(409, "Another reply is running for this Plan.") from None
        if not reservation.owner:
            if reservation.future.done():
                return AgentResponse.model_validate(reservation.future.result())
            return AgentResponse(
                status="in_progress",
                plan_id=request.plan_id,
                event_id=request.event_id,
                generation=reservation.generation,
            )

        generation = reservation.generation

        async def finish(projection: dict[str, Any]) -> AgentResponse:
            if not await self.runs.generation_current(subject, plan_id, generation):
                projection = self._interrupted(plan_id, request.event_id, generation)
            self.receipts.put(subject, plan_id, request.event_id, projection)
            await self.runs.resolve_pending(subject, plan_id, request.event_id, projection)
            return AgentResponse.model_validate(projection)

        async def emit_if_current(delta: str) -> None:
            if on_text_delta and await self.runs.generation_current(subject, plan_id, generation):
                value = on_text_delta(delta)
                if isinstance(value, Awaitable):
                    await value

        context_snapshot = None
        context_attempted = False
        context_committed = False
        try:
            if self.context_reader and hasattr(self.context_reader, "context_run"):
                context_attempted = True
                context_snapshot = await self.context_reader.context_run(
                    request.plan_id, token, event_id=request.event_id, action="begin",
                )
            if request.canvas_action:
                if not self.context_reader or not hasattr(self.context_reader, "generation_context"):
                    raise HTTPException(503, "Canvas context is unavailable.")
                if request.context_revision is not None and context_snapshot and request.context_revision != context_snapshot["revision"]:
                    raise HTTPException(409, "Trip details changed. Reload the canvas before generating.")
                context = await self.context_reader.generation_context(request.plan_id, token)
            query = request.message.strip()

            graph_state = {
                "traveler_scope": subject,
                "plan_id": plan_id,
                "plan_revision": int(context.get("revision", plan.get("revision", 1))),
                "conversation_id": context.get("conversation_id"),
                "brief": context.get("brief", {}),
                "trip_context": context_snapshot["context"] if context_snapshot else {},
                "state_changes": [],
                "recent_messages": context.get("messages", []),
                "event_id": request.event_id,
                "generation": generation,
                "message": query,
                "canvas_action": request.canvas_action,
                "canvas_edit": edit_input,
                "canvas_draft": {"components": {"themes": request.canvas_themes.model_dump()}} if request.canvas_themes else None,
                "reusable_evidence": self._evidence_cache.get((subject, plan_id), (0, []))[1] if self._evidence_cache.get((subject, plan_id), (0, []))[0] > time.monotonic() else [],
                "generation_messages": context.get("messages", []) if request.canvas_action else [],
                "generation_cutoff": context.get("cutoff_sequence", 0),
                "context_revision": context_snapshot["revision"] if context_snapshot else 1,
            }
            def prepare_canvas(value):
                from services.crud.canvas import issue_canvas_evidence

                from .canvas_contracts import CanvasDraft
                draft = CanvasDraft.model_validate(value).model_dump(mode="json", exclude_none=True)
                draft.update(generation_id=request.event_id,
                             context_revision=graph_state["context_revision"],
                             plan_revision=graph_state["plan_revision"])
                draft["evidence"] = issue_canvas_evidence(subject, plan_id, draft.get("components", {}))
                return draft

            async def emit_canvas_if_current(value):
                if on_canvas_draft and await self.runs.generation_current(subject, plan_id, generation):
                    await on_canvas_draft({"canvas_draft": prepare_canvas(value),
                                           "trip_context": context_snapshot})

            invoke_options = {"authorization_token": token, "traveler_profile": traveler_profile}
            if on_text_delta:
                invoke_options["on_text_delta"] = emit_if_current
            if request.canvas_action:
                invoke_options["on_canvas_draft"] = emit_canvas_if_current
            result = await self.graph.invoke(graph_state, **invoke_options)
            if not await self.runs.generation_current(subject, plan_id, generation):
                return await finish(self._interrupted(plan_id, request.event_id, generation))
            projection = result.get("projection") if isinstance(result, dict) else None
            if not isinstance(projection, dict):
                raise HTTPException(502, "Agent response was invalid.")
            observed = result.get("_read_evidence") or result.get("_canvas_evidence")
            if isinstance(observed, list) and observed:
                if len(self._evidence_cache) >= 100:
                    self._evidence_cache.pop(next(iter(self._evidence_cache)))
                self._evidence_cache[(subject, plan_id)] = (time.monotonic() + 1800, observed[:12])
            if request.canvas_action:
                for group, details in result.get("_canvas_usage", {}).items():
                    logging.getLogger(__name__).info("canvas_usage group=%s calls=%s cost_usd=%s searches=%s reads=%s usage_complete=%s stage=%s",
                        group, details.get("calls"), details.get("cost_usd"), details.get("searches"), details.get("reads"), details.get("usage_complete", False), details.get("stage"))
                if projection.get("canvas_draft"):
                    projection["canvas_draft"] = prepare_canvas(projection["canvas_draft"])
                    # Keep the transition in the same Conversation. No model call
                    # or durable canvas mutation is needed for this handoff.
                    if request.canvas_action == "generate_plan" and self.context_reader:
                        groups = projection["canvas_draft"].get("group_status", {})
                        complete = all(groups.get(key) == "ready" for key in ("themes", "research"))
                        handoff = ("Your draft is ready to explore. " if complete else
                                   "Your draft is open. Some sections still need a retry. ")
                        handoff += ("We can keep planning here: ask me to find activities around your destination. "
                                    "Preview places on the map, then choose Add to plan. Your edits stay in this draft until you choose Save plan.")
                        await self.context_reader.append(request.plan_id, token,
                            event_id=f"{request.event_id}:handoff", role="assistant",
                            content=handoff, generation=generation)
                if context_snapshot:
                    projection["trip_context"] = {**context_snapshot, "locked": False}
                return await finish(projection)
            if request.canvas_edit and projection.get("canvas_edit_result"):
                edit_result = CanvasEditResult.model_validate(projection["canvas_edit_result"]).model_dump(mode="json")
                known_ids = {item["id"] for item in edit_result["suggestions"]}
                if any(place_id not in known_ids for place_id in edit_result["add_ids"]):
                    raise HTTPException(502, "The suggested places could not be validated. Your draft is unchanged.")
                edit_result["suggestions"] = [sign_place(subject, plan_id, place) for place in edit_result["suggestions"]]
                projection["canvas_edit_result"] = edit_result
                # Editing this canvas does not also modify research requirements.
                result["state_changes"] = []
            successful = projection.get("status") in {"in_progress", "needs your input"} and bool(projection.get("assistant_text") or projection.get("question"))
            if self.context_reader and query and not (context_snapshot and successful):
                await self.context_reader.append(
                    request.plan_id,
                    token,
                    event_id=f"{request.event_id}:user",
                    role="user",
                    content=query,
                    generation=generation,
                )
            source_refs = self._validated_research_sources(
                projection.get("sources"),
                evidence=result.get("research_evidence"),
                evidence_ids=result.get("research_evidence_ids"),
            )
            projection["sources"] = source_refs
            assistant_content = str(projection.get("assistant_text") or projection.get("question") or "")
            assistant_content = self._message_with_sources(assistant_content, source_refs)
            if self.context_reader and assistant_content and not (context_snapshot and successful):
                await self.context_reader.append(
                    request.plan_id,
                    token,
                    event_id=f"{request.event_id}:assistant",
                    role="assistant",
                    content=assistant_content,
                    generation=generation,
                )
            if successful:
                turn_result = TurnResult(
                    answer=str(projection.get("assistant_text") or projection.get("question")),
                    state_changes=result.get("state_changes", []),
                )
                if context_snapshot:
                    active = self._active_streams.get((subject, plan_id, request.event_id))
                    if active:
                        active["committing"] = True
                    # Once validated completion begins, cancellation cannot leave an
                    # acknowledged database commit looking like a stopped proposal.
                    commit = asyncio.create_task(self.context_reader.context_run(
                        request.plan_id, token, event_id=request.event_id, action="complete",
                        revision=context_snapshot["revision"], message=query,
                        assistant_text=assistant_content, generation=generation,
                        changes=[change.model_dump() for change in turn_result.state_changes],
                    ))
                    try:
                        saved_context = await asyncio.shield(commit)
                    except asyncio.CancelledError:
                        saved_context = await commit
                    context_committed = True
                    projection["trip_context"] = saved_context
                projection["result"] = turn_result.model_dump()
            return await finish(projection)
        except asyncio.CancelledError:
            await self.runs.resolve_pending(subject, plan_id, request.event_id,
                                                 self._interrupted(plan_id, request.event_id, generation))
            raise
        except HTTPException as exc:
            await self.runs.resolve_pending(
                subject,
                plan_id,
                request.event_id,
                {
                    "status": "unable to continue",
                    "plan_id": plan_id,
                    "event_id": request.event_id,
                    "generation": generation,
                    "error": str(exc.detail),
                },
            )
            raise
        except Exception:
            safe = {
                "status": "unable to continue",
                "plan_id": plan_id,
                "event_id": request.event_id,
                "generation": generation,
                "error": "Agent provider unavailable.",
            }
            await self.runs.resolve_pending(subject, plan_id, request.event_id, safe)
            return AgentResponse.model_validate(safe)
        finally:
            if context_attempted and not context_committed:
                async def release_context():
                    try:
                        await self.context_reader.context_run(request.plan_id, token,
                                                             event_id=request.event_id, action="cancel")
                    except Exception:
                        pass  # The bounded lease also expires after process/network failure.
                release = asyncio.create_task(release_context())
                try:
                    await asyncio.shield(release)
                except asyncio.CancelledError:
                    await release

    async def stream(
        self,
        request: AgentRequest,
        subject: str,
        authorization: str | None,
        *,
        is_disconnected: Callable[[], Awaitable[bool]],
    ):
        """Yield an allow-listed assistant-text stream and persist partial outcomes."""
        key = (subject, str(request.plan_id), request.event_id)
        if key in self._active_streams:
            yield self._sse({"type": "TERMINAL", "status": "error", "message": "This reply is already running."})
            return
        queue: asyncio.Queue[tuple[str, Any] | None] = asyncio.Queue()
        emitted: list[str] = []
        public_snapshot: dict[str, Any] = {}
        state: dict[str, Any] = {"reason": None, "task": None}
        message_id = f"{request.event_id}:assistant"
        self._active_streams[key] = state

        async def on_text_delta(value: str) -> None:
            if not value or state["reason"]:
                return
            emitted.append(value)
            await queue.put(("content", value))

        async def on_canvas_draft(value: dict) -> None:
            if not state["reason"]:
                await queue.put(("snapshot", value))

        async def run_turn() -> None:
            try:
                response = await self.handle(
                    request,
                    subject,
                    authorization,
                    on_text_delta=on_text_delta,
                    on_canvas_draft=on_canvas_draft,
                )
                final = response.model_dump(mode="json")
                if not emitted:
                    text = response.assistant_text or response.question or ""
                    for start in range(0, len(text), 28):
                        await on_text_delta(text[start:start + 28])
                status = "error" if response.status == "unable to continue" else "complete" if response.status in {"in_progress", "canvas_draft_ready"} else response.status
                if status == "error" and emitted:
                    await self._persist_partial(
                        request, subject, authorization, "".join(emitted), "interrupted",
                        generation=response.generation,
                    )
                await queue.put(("terminal", {"status": status, "sources": final.get("sources", []),
                                               "message": response.error if status == "error" else None,
                                               "trip_context": final.get("trip_context"),
                                               "canvas_draft": final.get("canvas_draft"),
                                               "canvas_edit_result": final.get("canvas_edit_result"),
                                               "result": final.get("result")}))
            except asyncio.CancelledError:
                reason = state["reason"] or "interrupted"
                await self._persist_partial(request, subject, authorization, "".join(emitted), reason)
                await queue.put(("terminal", {"status": reason, "sources": []}))
            except HTTPException as exc:
                await self._persist_partial(request, subject, authorization, "".join(emitted), "interrupted")
                await queue.put(("terminal", {"status": "error", "message": str(exc.detail), "sources": []}))
            except Exception:
                await self._persist_partial(request, subject, authorization, "".join(emitted), "interrupted")
                await queue.put(("terminal", {"status": "error", "message": "The reply could not be completed.", "sources": []}))
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_turn())
        state["task"] = task
        try:
            yield self._sse({"type": "RUN_STARTED", "threadId": str(request.plan_id), "runId": request.event_id})
            yield self._sse({"type": "TEXT_MESSAGE_START", "messageId": message_id, "role": "assistant"})
            while True:
                if await is_disconnected() and not task.done():
                    state["reason"] = state["reason"] or "interrupted"
                    task.cancel()
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=0.05)
                except TimeoutError:
                    if task.done() and queue.empty():
                        break
                    continue
                if item is None:
                    break
                kind, value = item
                if kind == "content":
                    yield self._sse({"type": "TEXT_MESSAGE_CONTENT", "messageId": message_id, "delta": value})
                elif kind == "snapshot":
                    public_snapshot.update({name: item for name, item in value.items() if item is not None})
                    yield self._sse({"type": "STATE_SNAPSHOT", "snapshot": public_snapshot})
                else:
                    snapshot = {name: value[name] for name in ("canvas_draft", "trip_context", "canvas_edit_result") if value.get(name) is not None}
                    if snapshot:
                        public_snapshot.update(snapshot)
                        yield self._sse({"type": "STATE_SNAPSHOT", "snapshot": public_snapshot})
                    if value.get("trip_context"):
                        for message in a2ui_messages(ContextSnapshot.model_validate(value["trip_context"])):
                            yield self._sse({"type": "CUSTOM", "name": "a2ui", "value": message})
                    yield self._sse({"type": "TEXT_MESSAGE_END", "messageId": message_id})
                    yield self._sse({"type": "TERMINAL", **value})
                    yield self._sse({"type": "RUN_FINISHED", "threadId": str(request.plan_id), "runId": request.event_id})
        except asyncio.CancelledError:
            if not task.done():
                state["reason"] = state["reason"] or "interrupted"
                task.cancel()
            raise
        finally:
            if not task.done():
                state["reason"] = state["reason"] or "interrupted"
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            self._active_streams.pop(key, None)

    async def cancel(self, subject: str, plan_id: str, event_id: str) -> bool:
        state = self._active_streams.get((subject, plan_id, event_id))
        if not state or not state.get("task") or state["task"].done() or state.get("committing"):
            return False
        state["reason"] = "stopped"
        state["task"].cancel()
        return True

    async def _persist_partial(
        self,
        request: AgentRequest,
        subject: str,
        authorization: str | None,
        text: str,
        status: str,
        *,
        generation: int | None = None,
    ) -> None:
        if request.canvas_action or not self.context_reader:
            return
        token = (authorization or "")[7:].strip()
        plan_id = request.plan_id
        try:
            plan = await self._read_plan(subject, plan_id, token)
            context = await self.context_reader.context(plan_id, token)
            if generation is None:
                generation = int(context.get("revision", plan.get("revision", 1)))
            if request.message.strip():
                await self.context_reader.append(
                    plan_id, token, event_id=f"{request.event_id}:user", role="user",
                    content=request.message.strip(), generation=generation,
                )
            if text:
                await self.context_reader.append(
                    plan_id, token, event_id=f"{request.event_id}:assistant", role="assistant",
                    content=text[:2000], generation=generation, status=status,
                )
        except Exception:
            return

    @staticmethod
    def _sse(payload: dict[str, Any]) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}\n\n"

    @staticmethod
    def _validated_research_sources(
        value: Any, *, evidence: Any, evidence_ids: Any
    ) -> list[dict[str, str]]:
        """Project only cited, successfully read evidence from the current graph turn."""
        if not isinstance(value, list) or not isinstance(evidence, list) or not isinstance(evidence_ids, list):
            return []
        cited_ids = {
            item for item in evidence_ids
            if isinstance(item, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,180}", item)
        }
        read_by_id = {
            str(item.get("evidence_id")): item
            for item in evidence
            if isinstance(item, dict)
            and item.get("read_status") == "read"
            and isinstance(item.get("evidence_id"), str)
            and item.get("evidence_id") in cited_ids
            and (
                not item.get("expires_at")
                or (
                    isinstance(item.get("expires_at"), (int, float))
                    and item["expires_at"] > time.time()
                )
            )
        }
        sources: list[dict[str, str]] = []
        seen: set[str] = set()
        for item in value[:3]:
            if not isinstance(item, dict):
                continue
            evidence_id = item.get("evidence_id")
            read_item = read_by_id.get(evidence_id) if isinstance(evidence_id, str) else None
            if not read_item:
                continue
            title = re.sub(r"[\x00-\x1f\x7f\[\]]", " ", str(read_item.get("title", "")))[:80].strip()
            url = str(read_item.get("url", "")).strip()
            try:
                parsed = urlsplit(url)
                valid_https = (
                    parsed.scheme == "https"
                    and bool(parsed.hostname)
                    and parsed.username is None
                    and parsed.password is None
                    and not any(character.isspace() or ord(character) < 32 for character in url)
                )
                # Accessing port validates malformed port syntax.
                _ = parsed.port
            except ValueError:
                valid_https = False
            if not title or not valid_https or len(url) > 2048 or url in seen:
                continue
            seen.add(url)
            sources.append({"title": title, "url": url})
        return sources

    @staticmethod
    def _message_with_sources(content: str, sources: list[dict[str, str]]) -> str:
        if not sources:
            return content[:2000]
        source_block = "\n\nSources:\n" + "\n".join(f"- [{item['title']}]({item['url']})" for item in sources)
        while sources and len(source_block) > 700:
            sources = sources[:-1]
            source_block = "\n\nSources:\n" + "\n".join(f"- [{item['title']}]({item['url']})" for item in sources)
        available = max(0, 2000 - len(source_block))
        return content[:available] + source_block

    @staticmethod
    def _interrupted(plan_id: str, event_id: str, generation: int) -> dict[str, Any]:
        return {
            "status": "interrupted",
            "plan_id": plan_id,
            "event_id": event_id,
            "generation": generation,
        }
