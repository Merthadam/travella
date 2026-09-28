"""Authorized lifecycle routes with request-scoped transactions and safe projections."""

import base64
import binascii
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query

from .auth import identity_dependency
from .contracts import LifecycleProblem
from .repository import PlanRepository, as_utc, normalize_title, validate_request_id
from .schemas import ChallengeInput, ChallengeOutput, PlanOutput, PlanPage, TitleInput

WriteId = Annotated[str, Header(alias="Idempotency-Key", max_length=100)]
Revision = Annotated[int, Header(alias="If-Match", ge=1)]
Challenge = Annotated[str, Header(alias="X-Plan-Challenge", min_length=1, max_length=256)]


def decode_cursor(cursor: str | None, view: str):
    if cursor is None:
        return None
    try:
        value = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        if set(value) != {"view", "at", "id"} or value["view"] != view:
            raise ValueError
        activity = datetime.fromisoformat(value["at"])
        if activity.tzinfo is None:
            raise ValueError
        return activity, UUID(value["id"])
    except (ValueError, TypeError, KeyError, binascii.Error, UnicodeError) as exc:
        raise LifecycleProblem("invalid_cursor", "Refresh the list and try again.") from exc


def create_router(session_factory, verifier, *, required_scope, clock=None) -> APIRouter:
    router = APIRouter(prefix="/v1/plans")
    identity = identity_dependency(verifier, required_scope=required_scope)

    def repository(me=Depends(identity)):
        # SQLite has no row locks. Serialize local transactions before their first read.
        # PostgreSQL uses the repository's row locks and unique receipt constraints.
        with session_factory() as session:
            if session.bind.dialect.name == "sqlite":
                session.connection().exec_driver_sql("BEGIN IMMEDIATE")
            yield PlanRepository(session, **({"clock": clock} if clock else {}))

    Repo = Annotated[PlanRepository, Depends(repository)]

    @router.get("", response_model=PlanPage)
    def plans(
        repo: Repo,
        me=Depends(identity),
        view: Literal["active", "deleted"] = "active",
        limit: int = Query(25, ge=1, le=100),
        cursor: str | None = Query(None, max_length=512),
    ):
        refs = repo.list(
            me.subject,
            deleted=view == "deleted",
            limit=limit + 1,
            after=decode_cursor(cursor, view),
        )
        next_cursor = None
        if len(refs) > limit:
            last = refs[limit - 1]
            next_cursor = base64.urlsafe_b64encode(
                json.dumps(
                    {
                        "view": view,
                        "at": as_utc(last.last_activity_at).isoformat(),
                        "id": str(last.plan_id),
                    }
                ).encode()
            ).decode()
        return PlanPage(
            plans=[PlanOutput.from_ref(p) for p in refs[:limit]], next_cursor=next_cursor
        )

    @router.post("", response_model=PlanOutput)
    def create(request_id: WriteId, repo: Repo, me=Depends(identity)):
        return PlanOutput.from_ref(repo.create(me.subject, request_id))

    @router.get("/{plan_id}", response_model=PlanOutput)
    def get(plan_id: UUID, repo: Repo, me=Depends(identity)):
        return PlanOutput.from_ref(repo.get(me.subject, plan_id))

    @router.post("/{plan_id}/activity", response_model=PlanOutput)
    def activity(
        plan_id: UUID, request_id: WriteId, if_match: Revision, repo: Repo, me=Depends(identity)
    ):
        return PlanOutput.from_ref(repo.record_activity(me.subject, plan_id, request_id, if_match))

    @router.post("/{plan_id}/challenges", response_model=ChallengeOutput)
    def prepare(
        plan_id: UUID,
        data: ChallengeInput,
        request_id: WriteId,
        if_match: Revision,
        repo: Repo,
        me=Depends(identity),
    ):
        validate_request_id(request_id, repo.clock())
        title = normalize_title(data.title or "") if data.operation == "rename" else None
        if data.operation != "rename" and data.title is not None:
            raise LifecycleProblem("invalid_request", "Request could not be processed.")
        token = repo.issue_challenge(
            me.subject, plan_id, data.operation, if_match, {"title": title} if title else {}
        )
        return ChallengeOutput(
            challenge=token, operation=data.operation, revision=if_match, title=title
        )

    @router.patch("/{plan_id}/title", response_model=PlanOutput)
    def rename(
        plan_id: UUID,
        data: TitleInput,
        request_id: WriteId,
        if_match: Revision,
        challenge: Challenge,
        repo: Repo,
        me=Depends(identity),
    ):
        return PlanOutput.from_ref(
            repo.rename(me.subject, plan_id, request_id, if_match, data.title, challenge=challenge)
        )

    @router.delete("/{plan_id}", response_model=PlanOutput)
    def delete(
        plan_id: UUID,
        request_id: WriteId,
        if_match: Revision,
        challenge: Challenge,
        repo: Repo,
        me=Depends(identity),
    ):
        return PlanOutput.from_ref(
            repo.delete(me.subject, plan_id, request_id, if_match, challenge=challenge)
        )

    @router.post("/{plan_id}/restore", response_model=PlanOutput)
    def restore(
        plan_id: UUID,
        request_id: WriteId,
        if_match: Revision,
        challenge: Challenge,
        repo: Repo,
        me=Depends(identity),
    ):
        return PlanOutput.from_ref(
            repo.restore(
                me.subject, plan_id, request_id, expected_revision=if_match, challenge=challenge
            )
        )

    return router
