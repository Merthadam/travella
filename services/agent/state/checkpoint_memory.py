"""In-memory checkpoint adapter for isolated tests and local development."""

from __future__ import annotations

import copy

from .contracts import (
    SCHEMA_VERSION,
    CheckpointError,
    CheckpointSnapshot,
    EventReceipt,
)


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


