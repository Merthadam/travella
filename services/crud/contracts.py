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


class LifecycleProblem(Exception):
    def __init__(self, code: str, message: str = "Plan unavailable.") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


PROBLEMS = {
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
