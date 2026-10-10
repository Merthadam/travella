"""Request and response contracts for the authenticated agent HTTP interface."""

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from services.crud.profile_schemas import HomeCity
from services.trip_context import ContextSnapshot, ForwardedProps, TurnResult

from .canvas_contracts import CanvasDraft, ThemesComponent
from .editing_contracts import CanvasEditRequest, PublicCanvasEditResult


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan_id: UUID
    event_id: str = Field(min_length=1, max_length=100)
    message: str = Field(default="", max_length=2000)
    forwardedProps: ForwardedProps | None = None
    canvas_action: Literal["generate_themes", "generate_research", "generate_plan"] | None = None
    context_revision: int | None = Field(default=None, ge=1)
    canvas_themes: ThemesComponent | None = None
    canvas_edit: CanvasEditRequest | None = None

    @model_validator(mode="after")
    def separate_canvas_action(self):
        if self.canvas_edit and (self.canvas_action or self.forwardedProps or self.canvas_themes or self.context_revision):
            raise ValueError("Send canvas editing separately from other actions.")
        if self.canvas_edit and not self.message.strip():
            raise ValueError("A canvas editing message is required.")
        if (self.canvas_themes is not None or self.context_revision is not None) and not self.canvas_action:
            raise ValueError("Canvas context requires a canvas action.")
        if self.canvas_action and self.forwardedProps:
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
    canvas_edit_result: PublicCanvasEditResult | None = None


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
    operation: Literal["turn", "stream", "profile_sync", "cancel", "travel"]
    payload: dict[str, Any]
