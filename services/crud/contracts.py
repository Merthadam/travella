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
