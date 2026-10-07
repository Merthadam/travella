"""Request and response contracts for the authenticated agent HTTP interface."""

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from services.crud.profile_schemas import HomeCity
from services.trip_context import ContextSnapshot, ForwardedProps, TurnResult

from .canvas_contracts import CanvasDraft, ThemesComponent


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
    forwardedProps: ForwardedProps | None = None
    canvas_action: Literal["generate_themes", "generate_research", "generate_plan"] | None = None
    context_revision: int | None = Field(default=None, ge=1)
    canvas_themes: ThemesComponent | None = None

    @model_validator(mode="after")
    def separate_canvas_action(self):
        if (self.canvas_themes is not None or self.context_revision is not None) and not self.canvas_action:
            raise ValueError("Canvas context requires a canvas action.")
        if self.canvas_action and (self.candidate_action or self.forwardedProps):
            raise ValueError("Send canvas generation separately from other actions.")
        return self


class AgentResponse(BaseModel):
    status: Literal[
        "needs your input", "shortlist_ready", "candidate_action", "source_detail",
        "unable to continue", "interrupted", "in_progress", "canvas_draft_ready",
    ]
    plan_id: UUID
    event_id: str
    generation: int = 0
    question: str | None = None
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[dict[str, str]] = Field(default_factory=list, max_length=5)
    action: dict[str, Any] | None = None
    error: str | None = None
    assistant_text: str | None = None
    result: TurnResult | None = None
    trip_context: ContextSnapshot | None = None
    canvas_draft: CanvasDraft | None = None


class OnboardingMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class OnboardingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[OnboardingMessage] = Field(default_factory=list, max_length=12)


class OnboardingCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: Literal[
        "departure_base", "citizenship", "food_needs", "accessibility", "travel_interests"
    ]
    value: str = Field(min_length=1, max_length=1000)


class OnboardingResponse(BaseModel):
    action: Literal["ask", "candidate", "finish"]
    assistant_text: str = Field(min_length=1, max_length=2000)
    answer_candidates: list[OnboardingCandidate] = Field(default_factory=list, max_length=5)


class TravelerProfileMemoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    departure_base: str = Field(default="", max_length=120)
    citizenships: list[str] = Field(default_factory=list, max_length=10)
    food_needs: str = Field(default="", max_length=1000)
    accessibility_needs: str = Field(default="", max_length=1000)
    travel_interests: str = Field(default="", max_length=1000)
    home_city: HomeCity | None = None
    default_airport: str | None = Field(default=None, pattern=r"^[A-Z0-9]{3}$")
    interest_ids: list[str] = Field(default_factory=list, max_length=40)
    custom_interests: list[str] = Field(default_factory=list, max_length=20)
    updated_at: str | None = Field(default=None, max_length=64)


class RuntimeInvocationRequest(BaseModel):
    """Private envelope accepted by the AgentCore Runtime HTTP protocol."""

    model_config = ConfigDict(extra="forbid")
    operation: Literal["turn", "stream", "onboarding", "profile_sync", "cancel"]
    payload: dict[str, Any]
