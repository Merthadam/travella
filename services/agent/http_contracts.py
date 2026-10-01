"""Request and response contracts for the authenticated agent HTTP interface."""

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    status: Literal[
        "needs your input", "shortlist_ready", "candidate_action", "source_detail",
        "unable to continue", "interrupted", "in_progress",
    ]
    plan_id: UUID
    event_id: str
    generation: int = 0
    question: str | None = None
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    action: dict[str, Any] | None = None
    error: str | None = None
    assistant_text: str | None = None
