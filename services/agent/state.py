"""Plan-scoped checkpoint and receipt contracts for the agent graph."""

from __future__ import annotations

import asyncio
import copy
import time
from collections import OrderedDict
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


class InMemoryCheckpointStore:
    """Strict contract adapter used by local/dev tests.

    The production service does not restore from this store.  Scope and revision
    checks deliberately reject stale or foreign snapshots instead of guessing.
    """

    def __init__(self) -> None:
        self._snapshots: dict[tuple[str, str], CheckpointSnapshot] = {}
        self._receipts: dict[tuple[str, str, str], EventReceipt] = {}
        self._active_generation: dict[tuple[str, str], int] = {}

    def load(self, traveler_scope: str, plan_id: str, *, plan_revision: int) -> CheckpointSnapshot | None:
        snapshot = self._snapshots.get((traveler_scope, plan_id))
        if snapshot is None:
            if any(existing_plan_id == plan_id for _, existing_plan_id in self._snapshots):
                raise CheckpointError("checkpoint belongs to another traveler")
            return None
        if snapshot.schema_version != SCHEMA_VERSION:
            raise CheckpointError("unsupported checkpoint schema")
        if snapshot.plan_revision != plan_revision:
            raise CheckpointError("checkpoint Plan revision is stale")
        return copy.deepcopy(snapshot)

    def save(self, snapshot: CheckpointSnapshot) -> None:
        if snapshot.schema_version != SCHEMA_VERSION:
            raise CheckpointError("unsupported checkpoint schema")
        if not snapshot.traveler_scope or not snapshot.plan_id:
            raise CheckpointError("checkpoint scope is required")
        key = (snapshot.traveler_scope, snapshot.plan_id)
        active = self._active_generation.get(key, 0)
        if snapshot.generation < active:
            raise CheckpointError("older generation cannot take over a Plan")
        prior = self._snapshots.get(key)
        if prior and snapshot.plan_revision < prior.plan_revision:
            raise CheckpointError("older CRUD revision cannot overwrite checkpoint")
        self._active_generation[key] = snapshot.generation
        self._snapshots[key] = copy.deepcopy(snapshot)

    def record_receipt(self, receipt: EventReceipt) -> None:
        if not receipt.traveler_scope or not receipt.plan_id or not receipt.event_id:
            raise CheckpointError("receipt scope and event ID are required")
        key = (receipt.traveler_scope, receipt.plan_id, receipt.event_id)
        existing = self._receipts.get(key)
        if existing and existing.projection != receipt.projection:
            raise CheckpointError("event ID was reused with a different projection")
        self._receipts[key] = copy.deepcopy(receipt)

    def receipt(self, traveler_scope: str, plan_id: str, event_id: str) -> EventReceipt | None:
        receipt = self._receipts.get((traveler_scope, plan_id, event_id))
        return copy.deepcopy(receipt) if receipt else None

    def takeover(self, traveler_scope: str, plan_id: str, generation: int) -> None:
        key = (traveler_scope, plan_id)
        if generation < self._active_generation.get(key, 0):
            raise CheckpointError("takeover generation is older than the active run")
        self._active_generation[key] = generation

    def delete(self, traveler_scope: str, plan_id: str) -> None:
        self._snapshots.pop((traveler_scope, plan_id), None)

    def purge(self, traveler_scope: str, plan_id: str) -> None:
        self.delete(traveler_scope, plan_id)
        for key in list(self._receipts):
            if key[:2] == (traveler_scope, plan_id):
                del self._receipts[key]
        self._active_generation.pop((traveler_scope, plan_id), None)


class ProcessReceiptCache:
    """Bounded process-local idempotency cache for the stateless dev service."""

    def __init__(self, max_entries: int = 256) -> None:
        self.max_entries = max(1, max_entries)
        self._items: OrderedDict[tuple[str, str, str], dict[str, Any]] = OrderedDict()

    def get(self, traveler_scope: str, plan_id: str, event_id: str) -> dict[str, Any] | None:
        key = (traveler_scope, plan_id, event_id)
        value = self._items.get(key)
        if value is not None:
            self._items.move_to_end(key)
            return copy.deepcopy(value)
        return None

    def put(self, traveler_scope: str, plan_id: str, event_id: str, projection: dict[str, Any]) -> None:
        key = (traveler_scope, plan_id, event_id)
        self._items[key] = copy.deepcopy(projection)
        self._items.move_to_end(key)
        while len(self._items) > self.max_entries:
            self._items.popitem(last=False)


@dataclass(frozen=True)
class CandidateSnapshot:
    """The latest complete, temporary candidate projection for one Plan."""

    query: str
    run_id: str
    generation: int
    candidates: tuple[dict[str, Any], ...] = ()
    rejected: frozenset[str] = frozenset()
    updating: bool = False


@dataclass
class EventReservation:
    generation: int
    future: asyncio.Future[dict[str, Any]]
    owner: bool


class PlanCandidateStore:
    """Bounded process-local candidate state and atomic event reservations.

    This is intentionally a local coordination primitive.  A production
    deployment must replace it with the LangGraph checkpointer and reconcile
    against CRUD revisions before exposing a restored snapshot.
    """

    def __init__(self, max_plans: int = 128, max_receipts: int = 256) -> None:
        self.max_plans = max(1, max_plans)
        self.max_receipts = max(1, max_receipts)
        self._locks: dict[tuple[str, str], asyncio.Lock] = {}
        self._generations: dict[tuple[str, str], int] = {}
        self._snapshots: OrderedDict[tuple[str, str], CandidateSnapshot] = OrderedDict()
        self._receipts: OrderedDict[tuple[str, str, str], dict[str, Any]] = OrderedDict()
        self._pending: dict[tuple[str, str, str], asyncio.Future[dict[str, Any]]] = {}

    def _lock(self, key: tuple[str, str]) -> asyncio.Lock:
        return self._locks.setdefault(key, asyncio.Lock())

    async def reserve(self, traveler_scope: str, plan_id: str, event_id: str) -> EventReservation:
        key = (traveler_scope, plan_id)
        receipt_key = (*key, event_id)
        async with self._lock(key):
            cached = self._receipts.get(receipt_key)
            if cached is not None:
                future = asyncio.get_running_loop().create_future()
                future.set_result(copy.deepcopy(cached))
                return EventReservation(self._generations.get(key, 0), future, False)
            pending = self._pending.get(receipt_key)
            if pending is not None:
                return EventReservation(self._generations.get(key, 0), pending, False)
            generation = self._generations.get(key, 0) + 1
            self._generations[key] = generation
            future = asyncio.get_running_loop().create_future()
            self._pending[receipt_key] = future
            prior = self._snapshots.get(key)
            if prior is not None:
                self._snapshots[key] = CandidateSnapshot(
                    prior.query, prior.run_id, generation, prior.candidates, prior.rejected, True
                )
            return EventReservation(generation, future, True)

    async def snapshot(self, traveler_scope: str, plan_id: str) -> CandidateSnapshot | None:
        key = (traveler_scope, plan_id)
        async with self._lock(key):
            value = self._snapshots.get(key)
            return copy.deepcopy(value) if value else None

    async def publish(
        self,
        traveler_scope: str,
        plan_id: str,
        generation: int,
        *,
        query: str,
        run_id: str,
        candidates: list[dict[str, Any]],
        rejected: frozenset[str] = frozenset(),
    ) -> bool:
        key = (traveler_scope, plan_id)
        async with self._lock(key):
            if self._generations.get(key, 0) != generation:
                return False
            self._snapshots[key] = CandidateSnapshot(
                query, run_id, generation, tuple(copy.deepcopy(candidates)), rejected, False
            )
            self._snapshots.move_to_end(key)
            while len(self._snapshots) > self.max_plans:
                self._snapshots.popitem(last=False)
            return True

    async def finish(
        self,
        traveler_scope: str,
        plan_id: str,
        event_id: str,
        projection: dict[str, Any],
    ) -> None:
        key = (traveler_scope, plan_id)
        receipt_key = (*key, event_id)
        async with self._lock(key):
            future = self._pending.pop(receipt_key, None)
            self._receipts[receipt_key] = copy.deepcopy(projection)
            self._receipts.move_to_end(receipt_key)
            while len(self._receipts) > self.max_receipts:
                self._receipts.popitem(last=False)
            if future is not None and not future.done():
                future.set_result(copy.deepcopy(projection))

    async def resolve_pending(
        self, traveler_scope: str, plan_id: str, event_id: str, projection: dict[str, Any]
    ) -> None:
        key = (traveler_scope, plan_id)
        receipt_key = (*key, event_id)
        async with self._lock(key):
            future = self._pending.pop(receipt_key, None)
            self._receipts[receipt_key] = copy.deepcopy(projection)
            self._receipts.move_to_end(receipt_key)
            while len(self._receipts) > self.max_receipts:
                self._receipts.popitem(last=False)
            if future is not None and not future.done():
                future.set_result(copy.deepcopy(projection))

    async def generation_current(self, traveler_scope: str, plan_id: str, generation: int) -> bool:
        key = (traveler_scope, plan_id)
        async with self._lock(key):
            return self._generations.get(key, 0) == generation
