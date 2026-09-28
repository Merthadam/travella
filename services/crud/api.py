"""Allow-listed CRUD lifecycle routes."""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from services.auth.contracts import ValidatedIdentity

from .auth import identity_dependency
from .contracts import LifecycleProblem
from .repository import PlanRepository


class TitleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(max_length=120)


def create_router(
    repository: PlanRepository, verifier: Callable[[str], ValidatedIdentity]
) -> APIRouter:
    router = APIRouter(prefix="/v1/plans")
    identity = identity_dependency(verifier)

    def call(fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except LifecycleProblem as exc:
            status = 409 if exc.code in {"revision_conflict", "request_reused"} else 404
            raise HTTPException(status, {"code": exc.code, "message": exc.message}) from exc

    @router.get("")
    def plans(view: str = Query("active"), me: ValidatedIdentity = Depends(identity)):
        if view not in {"active", "deleted"}:
            raise HTTPException(400, "Invalid view.")
        return {"plans": [p.__dict__ for p in repository.list(me.subject, deleted=view == "deleted")]}

    @router.post("")
    def create(
        request_id: str = Header(alias="Idempotency-Key"), me: ValidatedIdentity = Depends(identity)
    ):
        return call(repository.create, me.subject, request_id).__dict__

    @router.get("/{plan_id}")
    def get(plan_id: UUID, me: ValidatedIdentity = Depends(identity)):
        return call(repository.get, me.subject, plan_id).__dict__

    @router.post("/{plan_id}/activity")
    def activity(
        plan_id: UUID,
        request_id: str = Header(alias="Idempotency-Key"),
        me: ValidatedIdentity = Depends(identity),
    ):
        return call(repository.record_activity, me.subject, plan_id, request_id).__dict__

    @router.patch("/{plan_id}/title")
    def rename(
        plan_id: UUID,
        data: TitleInput,
        request_id: str = Header(alias="Idempotency-Key"),
        if_match: int = Header(alias="If-Match"),
        challenge: str = Header(alias="X-Plan-Challenge"),
        me: ValidatedIdentity = Depends(identity),
    ):
        return call(
            repository.rename,
            me.subject,
            plan_id,
            request_id,
            if_match,
            data.title,
            challenge=challenge,
        ).__dict__

    @router.delete("/{plan_id}")
    def delete(
        plan_id: UUID,
        request_id: str = Header(alias="Idempotency-Key"),
        if_match: int = Header(alias="If-Match"),
        challenge: str = Header(alias="X-Plan-Challenge"),
        me: ValidatedIdentity = Depends(identity),
    ):
        return call(repository.delete, me.subject, plan_id, request_id, if_match, challenge=challenge).__dict__

    @router.post("/{plan_id}/restore")
    def restore(
        plan_id: UUID,
        request_id: str = Header(alias="Idempotency-Key"),
        challenge: str = Header(alias="X-Plan-Challenge"),
        me: ValidatedIdentity = Depends(identity),
    ):
        return call(repository.restore, me.subject, plan_id, request_id, challenge=challenge).__dict__

    return router
