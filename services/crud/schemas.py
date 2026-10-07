"""Public lifecycle projections. Internal owner identifiers never cross this boundary."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .contracts import PlanRef
from .repository import as_utc


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TitleInput(Input):
    title: str = Field(max_length=1024)


class ChallengeInput(Input):
    operation: Literal["rename", "delete", "restore"]
    title: str | None = Field(default=None, max_length=1024)


class ConversationOutput(BaseModel):
    conversation_id: UUID
    plan_id: UUID


class PlanOutput(BaseModel):
    plan_id: UUID
    lifecycle: Literal["active", "deleted"]
    revision: int
    title: str
    title_source: Literal["automatic", "manual"]
    destination_summary: str | None
    last_activity_at: datetime
    recovery_deadline: datetime | None
    conversation: ConversationOutput
    resume_target: Literal["conversation", "workspace"]

    @classmethod
    def from_ref(cls, ref: PlanRef):
        return cls(
            plan_id=ref.plan_id,
            lifecycle=ref.lifecycle,
            revision=ref.revision,
            title=ref.title,
            title_source=ref.title_source,
            destination_summary=ref.destination_summary,
            last_activity_at=as_utc(ref.last_activity_at),
            recovery_deadline=as_utc(ref.recovery_deadline) if ref.recovery_deadline else None,
            conversation=ConversationOutput(
                conversation_id=ref.conversation.conversation_id, plan_id=ref.plan_id
            ),
            resume_target=ref.last_working_view.value,
        )


class PlanPage(BaseModel):
    plans: list[PlanOutput]
    next_cursor: str | None = None


class ChallengeOutput(BaseModel):
    challenge: str
    operation: Literal["rename", "delete", "restore"]
    revision: int
    title: str | None
    expires_in: int = 300


class BriefInput(Input):
    interests: str = Field(default="", max_length=1000)
    start_date: str = Field(default="", max_length=10)
    end_date: str = Field(default="", max_length=10)
    travelers: int = Field(default=1, ge=1, le=50)
    budget: str = Field(default="", max_length=64)
    transport_tolerance: str = Field(default="", max_length=64)
    accessibility_needs: str = Field(default="", max_length=1000)


class BriefOutput(BaseModel):
    plan_id: UUID
    revision: int
    interests: str
    start_date: str
    end_date: str
    travelers: int
    budget: str
    transport_tolerance: str
    accessibility_needs: str


class BriefMutationOutput(BriefOutput):
    pass


class DestinationInput(Input):
    place_id: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    address: str = Field(default="", max_length=512)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    granularity: Literal["city", "country"] = "city"


class DestinationOutput(BaseModel):
    destination_id: UUID
    plan_id: UUID
    place_id: str
    name: str
    address: str
    latitude: float
    longitude: float
    granularity: Literal["city", "country"]


class DestinationMutationOutput(BaseModel):
    destination: DestinationOutput
    plan_revision: int
