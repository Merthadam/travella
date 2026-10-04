"""FastAPI composition root for the Plan-scoped agent microservice."""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from services.auth.config import CognitoConfig
from services.auth.contracts import ValidatedIdentity
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.auth import DEFAULT_SCOPE, bearer_identity

from .claude import ClaudeGatewayAdapter, LocalMcpAdapter
from .crud_client import CrudContextReader, CrudPlanReader
from .graph import AgentGraph
from .graph.onboarding import build_onboarding_intake_graph
from .http_contracts import (
    AgentRequest,
    AgentResponse,
    OnboardingRequest,
    OnboardingResponse,
    TravelerProfileMemoryRequest,
)
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
    memory_adapter: Any | None = None,
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

    if adapter is None:
        app_env = (os.getenv("APP_ENV") or "development").strip().lower()
        default_transport = "local" if app_env in {"development", "test"} else "agentcore"
        transport = (os.getenv("AGENT_MCP_TRANSPORT") or default_transport).strip().lower()
        if transport == "local":
            if app_env not in {"development", "test"}:
                raise RuntimeError("Local MCP transport is only available in development or test.")
            adapter = LocalMcpAdapter(
                research_url=os.getenv("LOCAL_RESEARCH_MCP_URL", "http://research-mcp:8000/mcp"),
                map_url=os.getenv("LOCAL_MAP_MCP_URL", "http://map-mcp:8001/mcp"),
            )
        elif transport == "agentcore":
            adapter = ClaudeGatewayAdapter(os.getenv("AGENTCORE_GATEWAY_URL", ""))
        else:
            raise ValueError("AGENT_MCP_TRANSPORT must be 'agentcore' or 'local'.")
    workflow = graph or AgentGraph(adapter)
    onboarding_graph = build_onboarding_intake_graph(getattr(adapter, "messages", adapter))
    memory = memory_adapter or create_memory_adapter()
    candidates = PlanCandidateStore(max_receipts=cache_size)
    turn_service = AgentTurnService(
        plan_reader=plan_reader,
        context_reader=context_reader,
        graph=workflow,
        tools=adapter,
        candidates=candidates,
        receipts=ProcessReceiptCache(cache_size),
        memory=memory,
    )
    app = FastAPI(title="Travella agent service", docs_url=None, redoc_url=None)

    @app.middleware("http")
    async def protection(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/health")
    def health() -> dict[str, Any]:
        messages = getattr(adapter, "messages", None)
        tool_transport = getattr(adapter, "transport", "agentcore")
        return {
            "status": "ok",
            "auth_configured": verifier is not None,
            "memory_enabled": memory.enabled,
            "model_provider": getattr(messages, "provider", "amazon-bedrock"),
            "model_id": getattr(messages, "model", None),
            "tool_transport": tool_transport,
            "gateway_configured": bool(getattr(adapter, "gateway_url", "")),
            "local_mcp_configured": (
                bool(getattr(adapter, "local_mcp", None)) if tool_transport == "local" else None
            ),
        }

    def identity_dependency(authorization: str | None = Header(default=None)) -> ValidatedIdentity:
        if verifier is None:
            raise HTTPException(503, "Agent authentication is not configured.")
        return bearer_identity(
            verifier,
            authorization,
            required_scope=(required_scope or os.getenv("AGENT_REQUIRED_SCOPE") or DEFAULT_SCOPE),
        )

    router = APIRouter(prefix="/v1/agent")

    @router.post("/events", response_model=AgentResponse)
    async def events(
        request: AgentRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ) -> AgentResponse:
        return await turn_service.handle(request, identity.subject, authorization)

    @router.post("/onboarding/events", response_model=OnboardingResponse)
    async def onboarding_events(
        request: OnboardingRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
    ) -> OnboardingResponse:
        del identity  # Authentication is required; the stateless intake stores no identity.
        result = await onboarding_graph.ainvoke(
            {"messages": [message.model_dump() for message in request.messages]}
        )
        return OnboardingResponse(
            action=result["action"],
            assistant_text=result["assistant_text"],
            answer_candidates=[
                {"topic": item["topic"], "value": item["value"]}
                for item in result["answer_candidates"]
            ],
        )

    @router.put("/traveler-profile/memory")
    async def sync_traveler_profile(
        request: TravelerProfileMemoryRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
    ) -> dict[str, str]:
        if not memory.enabled:
            return {"status": "disabled"}
        try:
            synced = await memory.sync_profile(
                identity.subject, request.model_dump(mode="json")
            )
        except Exception:
            # AgentCore availability must never roll back the CRUD-owned profile.
            synced = False
        return {"status": "synced" if synced else "unavailable"}

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

    @router.post("/plans/{plan_id}/events/stream")
    async def plan_events_stream(
        plan_id: UUID,
        request: AgentRequest,
        http_request: Request,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ):
        if request.plan_id != plan_id:
            raise HTTPException(422, "Plan ID does not match the request path.")
        token = (authorization or "")[7:].strip()
        await turn_service._read_plan(identity.subject, plan_id, token)
        return StreamingResponse(
            turn_service.stream(
                request,
                identity.subject,
                authorization,
                is_disconnected=http_request.is_disconnected,
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    @router.post("/plans/{plan_id}/events/{event_id}/cancel")
    async def cancel_plan_event(
        plan_id: UUID,
        event_id: str,
        identity: ValidatedIdentity = Depends(identity_dependency),
    ):
        return {"cancelled": await turn_service.cancel(identity.subject, str(plan_id), event_id)}

    app.include_router(router)
    return app
