"""Authenticated FastAPI boundary for the Plan-scoped agent graph."""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from typing import Any, Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from services.auth.config import CognitoConfig
from services.auth.contracts import ValidatedIdentity
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.auth import bearer_identity

from .claude import ClaudeGatewayAdapter
from .graph import AgentGraph
from .memory import create_memory_adapter
from .state import ProcessReceiptCache


class CandidateAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["explore", "reject", "extend", "refresh", "inspect", "name"]
    candidate_id: str | None = Field(default=None, max_length=180)
    reason: str | None = Field(default=None, max_length=500)
    evidence_ids: list[str] = Field(default_factory=list, max_length=10)
    destination: str | None = Field(default=None, max_length=255)


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan_id: UUID
    event_id: str = Field(min_length=1, max_length=100)
    message: str = Field(default="", max_length=2000)
    candidate_action: CandidateAction | None = None


class AgentResponse(BaseModel):
    status: Literal["needs your input", "shortlist_ready", "candidate_action", "source_detail", "unable to continue", "interrupted", "in_progress"]
    plan_id: UUID
    event_id: str
    generation: int = 0
    question: str | None = None
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    action: dict[str, Any] | None = None
    error: str | None = None


class CrudPlanReader:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def __call__(self, subject: str, plan_id: UUID, token: str) -> dict[str, Any] | None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{self.base_url}/v1/plans/{plan_id}", headers={"Authorization": f"Bearer {token}"})
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise HTTPException(503, "Plan service unavailable.")
        data = response.json()
        if data.get("lifecycle") != "active":
            return None
        return data


def create_app(*, verifier: Callable[[str], ValidatedIdentity] | None = None, plan_reader: Callable[..., Any] | None = None, graph: AgentGraph | None = None, adapter: Any | None = None, required_scope: str | None = None, cache_size: int = 256) -> FastAPI:
    """Create the agent app. Production startup must provide a verifier and reader."""
    if verifier is None and os.getenv("COGNITO_USER_POOL_ID"):
        verifier = CognitoJwtVerifier(CognitoConfig.from_env())
    if plan_reader is None:
        base_url = os.getenv("CRUD_BASE_URL")
        if base_url:
            plan_reader = CrudPlanReader(base_url)
    if verifier is None or plan_reader is None:
        # Keep import/test factories usable, but never silently authorize requests.
        async def unavailable_reader(*args: Any, **kwargs: Any) -> None:
            return None
        plan_reader = plan_reader or unavailable_reader

    adapter = adapter or ClaudeGatewayAdapter(os.getenv("AGENTCORE_GATEWAY_URL", "https://gateway.invalid/mcp"))
    graph = graph or AgentGraph(adapter)
    cache = ProcessReceiptCache(cache_size)
    generations: dict[tuple[str, str], int] = {}
    memory = create_memory_adapter()
    app = FastAPI(title="Travella agent service", docs_url=None, redoc_url=None)

    @app.middleware("http")
    async def protection(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "auth_configured": verifier is not None, "memory_enabled": memory.enabled}

    def identity_dependency(authorization: str | None = Header(default=None)) -> ValidatedIdentity:
        if verifier is None:
            raise HTTPException(503, "Agent authentication is not configured.")
        return bearer_identity(verifier, authorization, required_scope=required_scope or os.getenv("AGENT_REQUIRED_SCOPE", "travella/agent"))

    async def read_plan(subject: str, plan_id: UUID, token: str) -> dict[str, Any]:
        try:
            result = plan_reader(subject, plan_id, token)
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

    async def handle(request: AgentRequest, identity: ValidatedIdentity, authorization: str | None) -> AgentResponse:
        token = (authorization or "")[7:].strip()
        plan = await read_plan(identity.subject, request.plan_id, token)
        plan_id = str(request.plan_id)
        key = (identity.subject, plan_id)
        existing = cache.get(identity.subject, plan_id, request.event_id)
        if existing is not None:
            return AgentResponse.model_validate(existing)
        generation = generations.get(key, 0) + 1
        generations[key] = generation
        action = request.candidate_action.model_dump() if request.candidate_action else None
        if action and action["action"] in {"explore", "reject", "name"}:
            projection = {"status": "candidate_action", "plan_id": plan_id, "event_id": request.event_id, "generation": generation, "action": action}
            cache.put(identity.subject, plan_id, request.event_id, projection)
            return AgentResponse.model_validate(projection)
        if action and action["action"] == "inspect":
            if not action["evidence_ids"]:
                raise HTTPException(422, "Evidence IDs are required.")
            run_id = str(request.message or "")[:180]
            result = await adapter.sources(evidence_ids=action["evidence_ids"], traveler_scope=identity.subject, plan_id=plan_id, run_id=run_id, authorization_token=token)
            projection = {"status": "source_detail", "plan_id": plan_id, "event_id": request.event_id, "generation": generation, "evidence": result.get("evidence", [])[:10]}
            cache.put(identity.subject, plan_id, request.event_id, projection)
            return AgentResponse.model_validate(projection)
        state = {"traveler_scope": identity.subject, "authorization_token": token, "plan_id": plan_id, "plan_revision": int(plan.get("revision", 1)), "event_id": request.event_id, "generation": generation, "message": request.message, "candidate_action": action}
        result = await graph.invoke(state)
        projection = result.get("projection") if isinstance(result, dict) else None
        if not isinstance(projection, dict):
            raise HTTPException(502, "Agent response was invalid.")
        cache.put(identity.subject, plan_id, request.event_id, projection)
        return AgentResponse.model_validate(projection)

    router = APIRouter(prefix="/v1/agent")

    @router.post("/events", response_model=AgentResponse)
    async def events(request: AgentRequest, identity: ValidatedIdentity = Depends(identity_dependency), authorization: str | None = Header(default=None)):
        return await handle(request, identity, authorization)

    @router.post("/plans/{plan_id}/events", response_model=AgentResponse)
    async def plan_events(plan_id: UUID, request: AgentRequest, identity: ValidatedIdentity = Depends(identity_dependency), authorization: str | None = Header(default=None)):
        if request.plan_id != plan_id:
            raise HTTPException(422, "Plan ID does not match the request path.")
        return await handle(request, identity, authorization)

    app.include_router(router)
    return app
