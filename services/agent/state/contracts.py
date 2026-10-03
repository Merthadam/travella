"""Typed contracts shared by graph and state adapters."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Protocol, TypedDict

SCHEMA_VERSION = 1

class AgentState(TypedDict, total=False):
    traveler_scope: str
    plan_id: str
    plan_revision: int
    event_id: str
    generation: int
    message: str
    candidate_action: dict[str, Any] | None
    status: str
    question: str | None
    candidates: list[dict[str, Any]]
    locations: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    error: str | None
    projection: dict[str, Any]
    conversation_id: str
    brief: dict[str, Any]
    tentative_inferences: dict[str, Any]
    recent_messages: list[dict[str, str]]
    research_state: dict[str, Any]
    assistant_text: str
    turn_decision: str


@dataclass(frozen=True)
class CheckpointSnapshot:
    traveler_scope: str
    plan_id: str
    plan_revision: int
    generation: int
    status: str
    candidates: tuple[dict[str, Any], ...] = ()
    evidence_ids: tuple[str, ...] = ()
    schema_version: int = SCHEMA_VERSION
    interrupted: bool = False


@dataclass(frozen=True)
class EventReceipt:
    traveler_scope: str
    plan_id: str
    event_id: str
    projection: dict[str, Any]
    created_at: float = field(default_factory=time.time)


class CheckpointError(ValueError):
    pass


class CheckpointStore(Protocol):
    def load(self, traveler_scope: str, plan_id: str, *, plan_revision: int) -> CheckpointSnapshot | None: ...

    def save(self, snapshot: CheckpointSnapshot) -> None: ...

    def record_receipt(self, receipt: EventReceipt) -> None: ...

    def receipt(self, traveler_scope: str, plan_id: str, event_id: str) -> EventReceipt | None: ...

    def takeover(self, traveler_scope: str, plan_id: str, generation: int) -> None: ...

    def delete(self, traveler_scope: str, plan_id: str) -> None: ...

    def purge(self, traveler_scope: str, plan_id: str) -> None: ...


