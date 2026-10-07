"""Small, allow-listed contracts for the CRUD lifecycle boundary."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .models import PlanLifecycle, TitleSource, WorkingView


@dataclass(frozen=True)
class ConversationRef:
    conversation_id: UUID
    plan_id: UUID


@dataclass(frozen=True)
class PlanRef:
    plan_id: UUID
    traveler_subject: str
    lifecycle: PlanLifecycle
    revision: int
    title: str
    title_source: TitleSource
    destination_summary: str | None
    last_working_view: WorkingView
    last_activity_at: datetime
    recovery_deadline: datetime | None
    conversation: ConversationRef


@dataclass(frozen=True)
class DestinationRef:
    destination_id: UUID
    plan_id: UUID
    place_id: str
    name: str
    address: str
    latitude: float
    longitude: float
    granularity: str


@dataclass(frozen=True)
class BriefRef:
    plan_id: UUID
    payload: dict
    revision: int


class LifecycleProblem(Exception):
    def __init__(self, code: str, message: str = "Plan unavailable.") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


PROBLEMS = {
    "canvas_inconsistent": (422, "Trip cards disagree with the dates, travelers, or destination. Review the draft before saving."),
    "canvas_destination_limit": (422, "Remove a destination candidate from the Trip Brief before choosing a new destination."),
    "canvas_evidence_invalid": (422, "A finding changed or cannot be verified. Review it as uncertain before saving."),
    "invalid_profile": (422, "Check your profile details and try again."),
    "context_locked": (409, "Travella is replying. Try editing the Trip Brief when it finishes."),
    "revision_conflict": (409, "Plan changed. Refresh and try again."),
    "request_reused": (409, "Request could not be processed."),
    "challenge_invalid": (409, "Confirmation is no longer valid."),
    "gone": (410, "This plan can no longer be restored."),
    "invalid_title": (422, "Enter a valid plan name of 120 characters or fewer."),
    "invalid_request": (400, "Request could not be processed."),
    "expired_request": (400, "Request could not be processed."),
    "invalid_cursor": (400, "Refresh the list and try again."),
    "inconsistent_plan": (503, "Plan is temporarily unavailable."),
}
