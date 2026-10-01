"""FastAPI composition root for the Plan-scoped agent microservice."""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException

from services.auth.config import CognitoConfig
from services.auth.contracts import ValidatedIdentity
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.auth import bearer_identity

from .claude import ClaudeGatewayAdapter
from .crud_client import CrudContextReader, CrudPlanReader
from .graph import AgentGraph
from .http_contracts import AgentRequest, AgentResponse
from .memory import create_memory_adapter
from .service import AgentTurnService
from .state import PlanCandidateStore, ProcessReceiptCache


def create_app(
    *,
    verifier: Callable[[str], ValidatedIdentity] | None = None,
    plan_reader: Callable[..., Any] | None = None,
    context_reader: CrudContextReader | None = None,
    graph: AgentGraph | None = None,
    adapter: Any | None = None,
    required_scope: str | None = None,
    cache_size: int = 256,
) -> FastAPI:
    """Compose HTTP, authorization, workflow, and adapters for one deployment."""
    if verifier is None and os.getenv("COGNITO_USER_POOL_ID"):
        verifier = CognitoJwtVerifier(CognitoConfig.from_env())
    if plan_reader is None:
        base_url = os.getenv("CRUD_BASE_URL")
        if base_url:
            plan_reader = CrudPlanReader(base_url)
            context_reader = context_reader or CrudContextReader(base_url)
    if plan_reader is None:
        async def unavailable_reader(*args: Any, **kwargs: Any) -> None:
            return None
        plan_reader = unavailable_reader

    adapter = adapter or ClaudeGatewayAdapter(
        os.getenv("AGENTCORE_GATEWAY_URL", "https://gateway.invalid/mcp")
    )
    workflow = graph or AgentGraph(adapter)
    candidates = PlanCandidateStore(max_receipts=cache_size)
    turn_service = AgentTurnService(
        plan_reader=plan_reader,
        context_reader=context_reader,
        graph=workflow,
        tools=adapter,
        candidates=candidates,
        receipts=ProcessReceiptCache(cache_size),
    )
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
        return bearer_identity(
            verifier,
            authorization,
            required_scope=required_scope or os.getenv("AGENT_REQUIRED_SCOPE", "travella/agent"),
        )

    router = APIRouter(prefix="/v1/agent")

    @router.post("/events", response_model=AgentResponse)
    async def events(
        request: AgentRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ) -> AgentResponse:
        return await turn_service.handle(request, identity.subject, authorization)

    @router.post("/plans/{plan_id}/events", response_model=AgentResponse)
    async def plan_events(
        plan_id: UUID,
        request: AgentRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ) -> AgentResponse:
        if request.plan_id != plan_id:
            raise HTTPException(422, "Plan ID does not match the request path.")
        return await turn_service.handle(request, identity.subject, authorization)

    app.include_router(router)
    return app
