"""Application use case for one Plan event, independent of FastAPI routing."""

from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import HTTPException

from .http_contracts import AgentRequest, AgentResponse
from .state import PlanCandidateStore, ProcessReceiptCache


class AgentTurnService:
    """Authorize, gather CRUD context, run the graph, and publish one event."""

    def __init__(
        self,
        *,
        plan_reader: Callable[..., Any],
        context_reader: Any | None,
        graph: Any,
        tools: Any,
        candidates: PlanCandidateStore,
        receipts: ProcessReceiptCache,
    ) -> None:
        self.plan_reader = plan_reader
        self.context_reader = context_reader
        self.graph = graph
        self.tools = tools
        self.candidates = candidates
        self.receipts = receipts
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
    ) -> AgentResponse:
        token = (authorization or "")[7:].strip()
        plan = await self._read_plan(subject, request.plan_id, token)
        plan_id = str(request.plan_id)
        context = (
            await self.context_reader.context(request.plan_id, token) if self.context_reader else {}
        )
        reservation = await self.candidates.reserve(subject, plan_id, request.event_id)
        if not reservation.owner:
            if reservation.future.done():
                return AgentResponse.model_validate(reservation.future.result())
            prior = await self.candidates.snapshot(subject, plan_id)
            return AgentResponse(
                status="in_progress",
                plan_id=request.plan_id,
                event_id=request.event_id,
                generation=reservation.generation,
                candidates=list(prior.candidates) if prior else [],
            )

        generation = reservation.generation
        action = request.candidate_action.model_dump() if request.candidate_action else None
        prior = await self.candidates.snapshot(subject, plan_id)

        async def finish(projection: dict[str, Any]) -> AgentResponse:
            if not await self.candidates.generation_current(subject, plan_id, generation):
                projection = self._interrupted(plan_id, request.event_id, generation, prior)
            self.receipts.put(subject, plan_id, request.event_id, projection)
            await self.candidates.resolve_pending(subject, plan_id, request.event_id, projection)
            return AgentResponse.model_validate(projection)

        async def emit_if_current(delta: str) -> None:
            if on_text_delta and await self.candidates.generation_current(subject, plan_id, generation):
                value = on_text_delta(delta)
                if isinstance(value, Awaitable):
                    await value

        try:
            action_name = action.get("action") if action else None
            if action_name in {"explore", "reject"}:
                if prior is None:
                    raise HTTPException(422, "No current candidate shortlist.")
                selected = next(
                    (
                        item
                        for item in prior.candidates
                        if item.get("candidate_id") == action.get("candidate_id")
                    ),
                    None,
                )
                if selected is None:
                    raise HTTPException(422, "Candidate is not part of the current shortlist.")
                if action_name == "reject":
                    rejected = frozenset((*prior.rejected, str(selected["candidate_id"])))
                    remaining = [
                        item
                        for item in prior.candidates
                        if item.get("candidate_id") not in rejected
                    ]
                    if not await self.candidates.publish(
                        subject,
                        plan_id,
                        generation,
                        query=prior.query,
                        run_id=prior.run_id,
                        candidates=remaining,
                        rejected=rejected,
                    ):
                        return await finish(
                            self._interrupted(plan_id, request.event_id, generation, prior)
                        )
                    return await finish(
                        {
                            "status": "candidate_action",
                            "plan_id": plan_id,
                            "event_id": request.event_id,
                            "generation": generation,
                            "action": action,
                            "candidates": remaining,
                        }
                    )
                return await finish(
                    {
                        "status": "candidate_action",
                        "plan_id": plan_id,
                        "event_id": request.event_id,
                        "generation": generation,
                        "action": action,
                        "candidates": [selected],
                    }
                )

            if action_name == "inspect":
                if prior is None or not action["evidence_ids"]:
                    raise HTTPException(422, "Evidence IDs are required for the current shortlist.")
                known = {
                    str(ref.get("evidence_id"))
                    for candidate in prior.candidates
                    for ref in candidate.get("evidence", [])
                }
                if not set(action["evidence_ids"]).issubset(known):
                    raise HTTPException(422, "Evidence is not part of the current shortlist.")
                result = await self.tools.sources(
                    evidence_ids=action["evidence_ids"],
                    traveler_scope=subject,
                    plan_id=plan_id,
                    run_id=prior.run_id,
                    authorization_token=token,
                )
                evidence = result.get("evidence", []) if isinstance(result, dict) else []
                if not isinstance(evidence, list):
                    raise HTTPException(502, "Source results were invalid.")
                return await finish(
                    {
                        "status": "source_detail",
                        "plan_id": plan_id,
                        "event_id": request.event_id,
                        "generation": generation,
                        "evidence": evidence[:10],
                    }
                )

            query = request.message.strip()
            if action_name == "name":
                query = (action.get("destination") or "").strip()
                if not query:
                    raise HTTPException(422, "Destination is required.")
            if action_name in {"extend", "refresh"} and not query:
                query = prior.query if prior else ""
            if action_name in {"extend", "refresh"} and not query:
                raise HTTPException(422, "A previous research query is required.")

            graph_state = {
                "traveler_scope": subject,
                "plan_id": plan_id,
                "plan_revision": int(context.get("revision", plan.get("revision", 1))),
                "conversation_id": context.get("conversation_id"),
                "brief": context.get("brief", {}),
                "recent_messages": context.get("messages", []),
                "event_id": request.event_id,
                "generation": generation,
                "message": query,
                "candidate_action": action,
            }
            if on_text_delta:
                result = await self.graph.invoke(
                    graph_state,
                    authorization_token=token,
                    on_text_delta=emit_if_current if on_text_delta else None,
                )
            else:
                result = await self.graph.invoke(graph_state, authorization_token=token)
            if not await self.candidates.generation_current(subject, plan_id, generation):
                return await finish(self._interrupted(plan_id, request.event_id, generation, prior))
            projection = result.get("projection") if isinstance(result, dict) else None
            if not isinstance(projection, dict):
                raise HTTPException(502, "Agent response was invalid.")
            is_candidate_research = (
                projection.get("status") == "shortlist_ready"
                and projection.get("research_intent") != "factual_research"
            )
            fresh = projection.get("candidates", []) if is_candidate_research else []
            if action_name == "extend" and prior:
                seen = {str(item.get("candidate_id")) for item in prior.candidates}
                fresh = list(prior.candidates) + [
                    item
                    for item in fresh
                    if str(item.get("candidate_id")) not in seen
                    and str(item.get("candidate_id")) not in prior.rejected
                ]
                fresh = fresh[:5]
            if is_candidate_research and not fresh:
                projection = {
                    **projection,
                    "status": "unable to continue",
                    "error": "No complete candidates were returned.",
                }
            if is_candidate_research:
                run_id = str(result.get("run_id") or projection.get("run_id") or "")
                if action_name == "extend" and prior:
                    run_id = prior.run_id
                if not await self.candidates.publish(
                    subject,
                    plan_id,
                    generation,
                    query=query,
                    run_id=run_id,
                    candidates=fresh,
                    rejected=prior.rejected if prior else frozenset(),
                ):
                    return await finish(
                        self._interrupted(plan_id, request.event_id, generation, prior)
                    )
                projection = {**projection, "candidates": fresh}
            elif prior:
                projection = {
                    **projection,
                    "candidates": list(prior.candidates),
                    "action": action if action_name == "refresh" else projection.get("action"),
                }

            if self.context_reader and query:
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
            if self.context_reader and assistant_content:
                await self.context_reader.append(
                    request.plan_id,
                    token,
                    event_id=f"{request.event_id}:assistant",
                    role="assistant",
                    content=assistant_content,
                    generation=generation,
                )
            return await finish(projection)
        except HTTPException as exc:
            await self.candidates.resolve_pending(
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
            if prior:
                safe["candidates"] = list(prior.candidates)
            await self.candidates.resolve_pending(subject, plan_id, request.event_id, safe)
            return AgentResponse.model_validate(safe)

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
        queue: asyncio.Queue[tuple[str, Any] | None] = asyncio.Queue()
        emitted: list[str] = []
        state: dict[str, Any] = {"reason": None, "task": None}
        message_id = f"{request.event_id}:assistant"
        self._active_streams[key] = state

        async def on_text_delta(value: str) -> None:
            if not value or state["reason"]:
                return
            emitted.append(value)
            await queue.put(("content", value))

        async def run_turn() -> None:
            try:
                response = await self.handle(
                    request,
                    subject,
                    authorization,
                    on_text_delta=on_text_delta,
                )
                final = response.model_dump(mode="json")
                if not emitted:
                    text = response.assistant_text or response.question or ""
                    for start in range(0, len(text), 28):
                        await on_text_delta(text[start:start + 28])
                status = "error" if response.status == "unable to continue" else response.status
                await queue.put(("terminal", {"status": status, "sources": final.get("sources", [])}))
            except asyncio.CancelledError:
                reason = state["reason"] or "interrupted"
                await self._persist_partial(request, subject, authorization, "".join(emitted), reason)
                await queue.put(("terminal", {"status": reason, "sources": []}))
            except HTTPException as exc:
                await queue.put(("terminal", {"status": "error", "message": str(exc.detail), "sources": []}))
            except Exception:
                await queue.put(("terminal", {"status": "error", "message": "The reply could not be completed.", "sources": []}))
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_turn())
        state["task"] = task
        try:
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
                else:
                    yield self._sse({"type": "TEXT_MESSAGE_END", "messageId": message_id})
                    yield self._sse({"type": "TERMINAL", **value})
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
        if not state or not state.get("task") or state["task"].done():
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
    ) -> None:
        if not self.context_reader:
            return
        token = (authorization or "")[7:].strip()
        plan_id = request.plan_id
        try:
            plan = await self._read_plan(subject, plan_id, token)
            context = await self.context_reader.context(plan_id, token)
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
    def _interrupted(plan_id: str, event_id: str, generation: int, prior: Any) -> dict[str, Any]:
        return {
            "status": "interrupted",
            "plan_id": plan_id,
            "event_id": event_id,
            "generation": generation,
            "candidates": list(prior.candidates) if prior else [],
        }
