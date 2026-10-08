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

from .crud_client import CrudContextReader, CrudPlanReader
from .graph import AgentGraph
from .http_contracts import (
    AgentRequest,
    AgentResponse,
    RuntimeInvocationRequest,
    TravelerProfileMemoryRequest,
)
from .memory import create_memory_adapter
from .service import AgentTurnService
from .state import PlanRunStore, ProcessReceiptCache


def create_app(
    *,
    verifier: Callable[[str], ValidatedIdentity] | None = None,
    plan_reader: Callable[..., Any] | None = None,
    context_reader: CrudContextReader | None = None,
    graph: AgentGraph | None = None,
    canvas_worker: Any | None = None,
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

    from .claude.sdk_conversation import ClaudeSdkConversationClient
    from .claude.themes_worker import ClaudeThemesWorker
    from .config import ResearchWorkerConfig

    sdk_config = ResearchWorkerConfig.from_env() if adapter is None else None
    chat_client = adapter or ClaudeSdkConversationClient(sdk_config)
    if graph is None and canvas_worker is None and sdk_config is not None:
        canvas_worker = ClaudeThemesWorker(sdk_config)
    workflow = graph or AgentGraph(chat_client, canvas_worker=canvas_worker)
    memory = memory_adapter or create_memory_adapter()
    runs = PlanRunStore(max_receipts=cache_size)
    turn_service = AgentTurnService(
        plan_reader=plan_reader,
        context_reader=context_reader,
        graph=workflow,
        runs=runs,
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
        return {
            "status": "ok", "auth_configured": verifier is not None,
            "memory_enabled": memory.enabled,
            "model_provider": getattr(chat_client, "provider", "injected"),
            "model_id": getattr(chat_client, "model", None),
            "research_backend": "injected" if graph is not None else "claude-agent-sdk",
            "tool_transport": "claude-agent-sdk",
        }

    def identity_dependency(authorization: str | None = Header(default=None)) -> ValidatedIdentity:
        if verifier is None:
            raise HTTPException(503, "Agent authentication is not configured.")
        return bearer_identity(
            verifier,
            authorization,
            required_scope=(required_scope or os.getenv("AGENT_REQUIRED_SCOPE") or DEFAULT_SCOPE),
        )

    @app.get("/ping")
    async def runtime_ping() -> dict[str, str]:
        """Health endpoint required by AgentCore Runtime's HTTP protocol."""
        return {"status": "Healthy"}

    @app.post("/invocations")
    async def runtime_invocations(
        envelope: RuntimeInvocationRequest,
        http_request: Request,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ):
        """Invoke the existing use cases through AgentCore Runtime."""
        payload = envelope.payload
        if envelope.operation == "turn":
            request = AgentRequest.model_validate(payload)
            return await turn_service.handle(request, identity.subject, authorization)
        if envelope.operation == "stream":
            request = AgentRequest.model_validate(payload)
            token = (authorization or "")[7:].strip()
            await turn_service._read_plan(identity.subject, request.plan_id, token)
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
        if envelope.operation == "profile_sync":
            request = TravelerProfileMemoryRequest.model_validate(payload)
            if not memory.enabled:
                return {"status": "disabled"}
            try:
                synced = await memory.sync_profile(
                    identity.subject, request.model_dump(mode="json")
                )
            except Exception:
                synced = False
            return {"status": "synced" if synced else "unavailable"}
        if envelope.operation == "cancel":
            plan_id = str(payload.get("plan_id", ""))
            event_id = str(payload.get("event_id", ""))
            if not plan_id or not event_id:
                raise HTTPException(422, "Plan and event IDs are required.")
            return {
                "cancelled": await turn_service.cancel(identity.subject, plan_id, event_id)
            }
        raise HTTPException(422, "Unsupported runtime operation.")

    router = APIRouter(prefix="/v1/agent")

    @router.post("/events", response_model=AgentResponse)
    async def events(
        request: AgentRequest,
        identity: ValidatedIdentity = Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ) -> AgentResponse:
        return await turn_service.handle(request, identity.subject, authorization)

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
