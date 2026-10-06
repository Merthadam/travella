"""Authorized lifecycle routes with request-scoped transactions and safe projections."""

import base64
import binascii
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query

from services.trip_context import (
    ContextEdit,
    ContextRun,
    ContextSnapshot,
    ContextSurface,
    a2ui_messages,
)

from .auth import identity_dependency
from .contracts import LifecycleProblem
from .profile import TravelerProfileRepository
from .profile_schemas import AccountSectionMutation, OnboardingMutation, ProfileInput, ProfileOutput
from .repository import PlanRepository, as_utc, normalize_title, validate_request_id
from .research_context import ResearchContextRepository
from .schemas import (
    BriefInput,
    BriefMutationOutput,
    BriefOutput,
    ChallengeInput,
    ChallengeOutput,
    DestinationInput,
    DestinationMutationOutput,
    DestinationOutput,
    PlanOutput,
    PlanPage,
    TitleInput,
)

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
    def get(
        plan_id: UUID,
        repo: Repo,
        me=Depends(identity),
        view: Literal["active", "deleted"] = "active",
    ):
        return PlanOutput.from_ref(repo.get(me.subject, plan_id, include_deleted=view == "deleted"))

    @router.get("/{plan_id}/research-context", response_model=ContextSurface)
    def research_context(plan_id: UUID, repo: Repo, me=Depends(identity)):
        snapshot = ResearchContextRepository(repo).snapshot(me.subject, plan_id)
        return ContextSurface(**snapshot.model_dump(), a2ui_messages=a2ui_messages(snapshot))

    @router.patch("/{plan_id}/research-context", response_model=ContextSnapshot)
    def edit_research_context(plan_id: UUID, data: ContextEdit, request_id: WriteId, if_match: Revision, repo: Repo, me=Depends(identity)):
        return ResearchContextRepository(repo).edit(me.subject, plan_id, request_id, if_match, data.changes)

    @router.post("/{plan_id}/research-context/run", response_model=ContextSnapshot)
    def research_context_run(plan_id: UUID, data: ContextRun, repo: Repo, me=Depends(identity)):
        return ResearchContextRepository(repo).run(me.subject, plan_id, data)

    @router.get("/{plan_id}/brief", response_model=BriefOutput)
    def get_brief(plan_id: UUID, repo: Repo, me=Depends(identity)):
        brief = repo.get_brief(me.subject, plan_id)
        return BriefOutput(plan_id=brief.plan_id, revision=brief.revision, **{k: brief.payload.get(k, BriefInput().model_dump()[k]) for k in BriefInput.model_fields})

    @router.patch("/{plan_id}/brief", response_model=BriefMutationOutput)
    def update_brief(plan_id: UUID, data: BriefInput, request_id: WriteId, if_match: Revision, repo: Repo, me=Depends(identity)):
        brief = repo.update_brief(me.subject, plan_id, request_id, if_match, data.model_dump())
        return BriefMutationOutput(plan_id=brief.plan_id, revision=brief.revision, **brief.payload)

    @router.get("/{plan_id}/conversation/messages", response_model=list[dict])
    def conversation_messages(plan_id: UUID, repo: Repo, me=Depends(identity), limit: int = Query(12, ge=1, le=50)):
        return repo.conversation_messages(me.subject, plan_id, limit)

    @router.post("/{plan_id}/conversation/messages", response_model=dict)
    def append_conversation_message(plan_id: UUID, data: dict, repo: Repo, me=Depends(identity)):
        return repo.append_conversation_message(me.subject, plan_id, str(data.get("event_id", "")), str(data.get("role", "")), str(data.get("content", "")), generation=int(data.get("generation", 0)), status=str(data.get("status", "complete")))

    @router.get("/{plan_id}/agent-context", response_model=dict)
    def agent_context(plan_id: UUID, repo: Repo, me=Depends(identity), limit: int = Query(12, ge=1, le=50)):
        return repo.agent_context(me.subject, plan_id, limit)

    @router.get("/{plan_id}/destinations", response_model=list[DestinationOutput])
    def destinations(plan_id: UUID, repo: Repo, me=Depends(identity)):
        return [DestinationOutput(destination_id=d.destination_id, plan_id=d.plan_id, place_id=d.place_id, name=d.name, address=d.address, latitude=d.latitude, longitude=d.longitude, granularity=d.granularity) for d in repo.destinations(me.subject, plan_id)]

    @router.post("/{plan_id}/destinations", response_model=DestinationMutationOutput)
    def add_destination(plan_id: UUID, data: DestinationInput, request_id: WriteId, if_match: Revision, repo: Repo, me=Depends(identity)):
        destination, revision = repo.add_destination(me.subject, plan_id, request_id, if_match, data.model_dump())
        return DestinationMutationOutput(destination=DestinationOutput(destination_id=destination.destination_id, plan_id=destination.plan_id, place_id=destination.place_id, name=destination.name, address=destination.address, latitude=destination.latitude, longitude=destination.longitude, granularity=destination.granularity), plan_revision=revision)

    @router.delete("/{plan_id}/destinations/{destination_id}", response_model=dict)
    def remove_destination(plan_id: UUID, destination_id: UUID, request_id: WriteId, if_match: Revision, repo: Repo, me=Depends(identity)):
        return {"plan_revision": repo.remove_destination(me.subject, plan_id, destination_id, request_id, if_match)}

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


def create_profile_router(session_factory, verifier, *, required_scope, clock=None) -> APIRouter:
    router = APIRouter(prefix="/v1/traveler-profile")
    identity = identity_dependency(verifier, required_scope=required_scope)

    def repository(me=Depends(identity)):
        with session_factory() as session:
            yield TravelerProfileRepository(session, **({"clock": clock} if clock else {}))

    Repo = Annotated[TravelerProfileRepository, Depends(repository)]

    @router.get("", response_model=ProfileOutput)
    def get_traveler_profile(repo: Repo, me=Depends(identity)):
        return ProfileOutput.from_row(repo.get(me.subject))

    @router.put("", response_model=ProfileOutput)
    def save_traveler_profile(data: ProfileInput, repo: Repo, me=Depends(identity)):
        payload = data.model_dump(exclude={"onboarding_complete"}, exclude_unset=True)
        complete = data.onboarding_complete if "onboarding_complete" in data.model_fields_set else None
        row = repo.save(me.subject, payload, complete)
        return ProfileOutput.from_row(row)

    @router.patch("/onboarding", response_model=ProfileOutput)
    def save_onboarding_step(data: OnboardingMutation, repo: Repo, me=Depends(identity)):
        return repo.save_step(me.subject, data)

    @router.patch("/sections", response_model=ProfileOutput)
    def save_account_section(data: AccountSectionMutation, repo: Repo, me=Depends(identity)):
        return repo.save_section(me.subject, data)

    return router
