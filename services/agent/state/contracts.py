"""Typed contracts shared by graph and state adapters."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Protocol, TypedDict

SCHEMA_VERSION = 1


class ResearchReuseEvidence(TypedDict, total=False):
    """Compact, Plan-scoped read evidence eligible for checkpoint reuse."""

    plan_id: str
    evidence_id: str
    title: str
    url: str
    publisher: str
    domain: str
    read_status: str
    fact_type: str
    retrieved_at: str
    valid_until: str
    excerpt: str


class ResearchState(TypedDict, total=False):
    schema_version: int
    plan_id: str
    evidence: list[ResearchReuseEvidence]

class AgentState(TypedDict, total=False):
    traveler_scope: str
    plan_id: str
    plan_revision: int
    event_id: str
    generation: int
    message: str
    candidate_action: dict[str, Any] | None
    canvas_action: str | None
    canvas_draft: dict[str, Any] | None
    status: str
    question: str | None
    candidates: list[dict[str, Any]]
    locations: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    research_sources: list[dict[str, str]]
    research_evidence_ids: list[str]
    error: str | None
    projection: dict[str, Any]
    conversation_id: str
    brief: dict[str, Any]
    trip_context: dict[str, Any]
    state_changes: list[dict[str, Any]]
    tentative_inferences: dict[str, Any]
    recent_messages: list[dict[str, str]]
    research_state: ResearchState
    assistant_text: str
    turn_decision: str
    research_intent: str
    resolved_research_message: str
    run_id: str
    research_evidence: list[dict[str, Any]]
    research_pass_count: int
    research_queries: list[str]
    research_action: str
    research_query: str | None
    research_gap: str | None
    research_uncertainty: list[str]


@dataclass(frozen=True)
class ResearchDecision:
    """Validated model decision; model output cannot directly call a tool."""

    action: str
    answer: str | None = None
    query: str | None = None
    gap: str | None = None
    evidence_ids: tuple[str, ...] = ()
    uncertainty: tuple[str, ...] = ()

    @classmethod
    def parse(cls, raw: str, *, evidence_ids: set[str]) -> "ResearchDecision | None":
        try:
            payload = json.loads(raw)
        except (TypeError, ValueError):
            return None
        if not isinstance(payload, dict) or set(payload) != {
            "action", "answer", "query", "gap", "evidence_ids", "uncertainty"
        }:
            return None
        action = payload["action"]
        answer, query, gap = payload["answer"], payload["query"], payload["gap"]
        citations, uncertainty = payload["evidence_ids"], payload["uncertainty"]
        if action not in {"answer", "refine"}:
            return None
        if not isinstance(citations, list) or any(not isinstance(item, str) for item in citations):
            return None
        if any(item not in evidence_ids for item in citations):
            return None
        if not isinstance(uncertainty, list) or any(not isinstance(item, str) for item in uncertainty):
            return None
        if len(uncertainty) > 5 or any(len(item) > 300 for item in uncertainty):
            return None
        if action == "answer":
            if not isinstance(answer, str) or not answer.strip() or len(answer) > 2000:
                return None
            if query is not None or gap is not None:
                return None
            if not citations:
                return None
            return cls(
                action="answer",
                answer=answer.strip(),
                evidence_ids=tuple(dict.fromkeys(citations)),
                uncertainty=tuple(item.strip() for item in uncertainty if item.strip()),
            )
        if answer is not None or not isinstance(query, str) or not isinstance(gap, str):
            return None
        query = " ".join(query.split())
        gap = " ".join(gap.split())
        if not query or len(query) > 300 or not gap or len(gap) > 300:
            return None
        return cls(
            action="refine",
            query=query,
            gap=gap,
            evidence_ids=tuple(dict.fromkeys(citations)),
            uncertainty=tuple(item.strip() for item in uncertainty if item.strip()),
        )


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
