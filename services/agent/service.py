"""Application use case for one Plan event, independent of FastAPI routing."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from .http_contracts import AgentRequest, AgentResponse
from .state import PlanCandidateStore, ProcessReceiptCache


class AgentTurnService:
    """Authorize, gather CRUD context, run the graph, and publish one event."""

    def __init__(
        self, *, plan_reader: Callable[..., Any], context_reader: Any | None,
        graph: Any, tools: Any, candidates: PlanCandidateStore,
        receipts: ProcessReceiptCache,
    ) -> None:
        self.plan_reader = plan_reader
        self.context_reader = context_reader
        self.graph = graph
        self.tools = tools
        self.candidates = candidates
        self.receipts = receipts

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

    async def handle(self, request: AgentRequest, subject: str, authorization: str | None) -> AgentResponse:
        token = (authorization or "")[7:].strip()
        plan = await self._read_plan(subject, request.plan_id, token)
        plan_id = str(request.plan_id)
        context = await self.context_reader.context(request.plan_id, token) if self.context_reader else {}
        reservation = await self.candidates.reserve(subject, plan_id, request.event_id)
        if not reservation.owner:
            if reservation.future.done():
                return AgentResponse.model_validate(reservation.future.result())
            prior = await self.candidates.snapshot(subject, plan_id)
            return AgentResponse(
                status="in_progress", plan_id=request.plan_id, event_id=request.event_id,
                generation=reservation.generation, candidates=list(prior.candidates) if prior else [],
            )

        generation = reservation.generation
        action = request.candidate_action.model_dump() if request.candidate_action else None
        prior = await self.candidates.snapshot(subject, plan_id)

        async def finish(projection: dict[str, Any]) -> AgentResponse:
            self.receipts.put(subject, plan_id, request.event_id, projection)
            await self.candidates.resolve_pending(subject, plan_id, request.event_id, projection)
            return AgentResponse.model_validate(projection)

        try:
            action_name = action.get("action") if action else None
            if action_name in {"explore", "reject"}:
                if prior is None:
                    raise HTTPException(422, "No current candidate shortlist.")
                selected = next(
                    (item for item in prior.candidates if item.get("candidate_id") == action.get("candidate_id")),
                    None,
                )
                if selected is None:
                    raise HTTPException(422, "Candidate is not part of the current shortlist.")
                if action_name == "reject":
                    rejected = frozenset((*prior.rejected, str(selected["candidate_id"])))
                    remaining = [item for item in prior.candidates if item.get("candidate_id") not in rejected]
                    if not await self.candidates.publish(
                        subject, plan_id, generation, query=prior.query, run_id=prior.run_id,
                        candidates=remaining, rejected=rejected,
                    ):
                        return await finish(self._interrupted(plan_id, request.event_id, generation, prior))
                    return await finish({
                        "status": "candidate_action", "plan_id": plan_id, "event_id": request.event_id,
                        "generation": generation, "action": action, "candidates": remaining,
                    })
                return await finish({
                    "status": "candidate_action", "plan_id": plan_id, "event_id": request.event_id,
                    "generation": generation, "action": action, "candidates": [selected],
                })

            if action_name == "inspect":
                if prior is None or not action["evidence_ids"]:
                    raise HTTPException(422, "Evidence IDs are required for the current shortlist.")
                known = {
                    str(ref.get("evidence_id")) for candidate in prior.candidates
                    for ref in candidate.get("evidence", [])
                }
                if not set(action["evidence_ids"]).issubset(known):
                    raise HTTPException(422, "Evidence is not part of the current shortlist.")
                result = await self.tools.sources(
                    evidence_ids=action["evidence_ids"], traveler_scope=subject,
                    plan_id=plan_id, run_id=prior.run_id, authorization_token=token,
                )
                evidence = result.get("evidence", []) if isinstance(result, dict) else []
                if not isinstance(evidence, list):
                    raise HTTPException(502, "Source results were invalid.")
                return await finish({
                    "status": "source_detail", "plan_id": plan_id, "event_id": request.event_id,
                    "generation": generation, "evidence": evidence[:10],
                })

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
                "traveler_scope": subject, "authorization_token": token, "plan_id": plan_id,
                "plan_revision": int(context.get("revision", plan.get("revision", 1))),
                "conversation_id": context.get("conversation_id"), "brief": context.get("brief", {}),
                "recent_messages": context.get("messages", []), "event_id": request.event_id,
                "generation": generation, "message": query, "candidate_action": action,
            }
            result = await self.graph.invoke(graph_state)
            projection = result.get("projection") if isinstance(result, dict) else None
            if not isinstance(projection, dict):
                raise HTTPException(502, "Agent response was invalid.")
            fresh = projection.get("candidates", []) if projection.get("status") == "shortlist_ready" else []
            if action_name == "extend" and prior:
                seen = {str(item.get("candidate_id")) for item in prior.candidates}
                fresh = list(prior.candidates) + [
                    item for item in fresh
                    if str(item.get("candidate_id")) not in seen
                    and str(item.get("candidate_id")) not in prior.rejected
                ]
                fresh = fresh[:5]
            if projection.get("status") == "shortlist_ready" and not fresh:
                projection = {**projection, "status": "unable to continue", "error": "No complete candidates were returned."}
            if projection.get("status") == "shortlist_ready":
                run_id = str(result.get("run_id") or projection.get("run_id") or "")
                if action_name == "extend" and prior:
                    run_id = prior.run_id
                if not await self.candidates.publish(
                    subject, plan_id, generation, query=query, run_id=run_id,
                    candidates=fresh, rejected=prior.rejected if prior else frozenset(),
                ):
                    return await finish(self._interrupted(plan_id, request.event_id, generation, prior))
                projection = {**projection, "candidates": fresh}
            elif prior:
                projection = {
                    **projection, "candidates": list(prior.candidates),
                    "action": action if action_name == "refresh" else projection.get("action"),
                }

            if self.context_reader and query:
                await self.context_reader.append(
                    request.plan_id, token, event_id=f"{request.event_id}:user", role="user",
                    content=query, generation=generation,
                )
            if self.context_reader and projection.get("assistant_text"):
                await self.context_reader.append(
                    request.plan_id, token, event_id=f"{request.event_id}:assistant", role="assistant",
                    content=str(projection["assistant_text"]), generation=generation,
                )
            return await finish(projection)
        except HTTPException as exc:
            await self.candidates.resolve_pending(subject, plan_id, request.event_id, {
                "status": "unable to continue", "plan_id": plan_id, "event_id": request.event_id,
                "generation": generation, "error": str(exc.detail),
            })
            raise
        except Exception:
            safe = {
                "status": "unable to continue", "plan_id": plan_id, "event_id": request.event_id,
                "generation": generation, "error": "Agent provider unavailable.",
            }
            if prior:
                safe["candidates"] = list(prior.candidates)
            await self.candidates.resolve_pending(subject, plan_id, request.event_id, safe)
            return AgentResponse.model_validate(safe)

    @staticmethod
    def _interrupted(plan_id: str, event_id: str, generation: int, prior: Any) -> dict[str, Any]:
        return {
            "status": "interrupted", "plan_id": plan_id, "event_id": event_id,
            "generation": generation, "candidates": list(prior.candidates) if prior else [],
        }
