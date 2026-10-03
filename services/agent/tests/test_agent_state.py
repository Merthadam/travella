from __future__ import annotations

import asyncio

import pytest

from services.agent.memory import create_memory_adapter
from services.agent.state import (
    CheckpointError,
    CheckpointSnapshot,
    EventReceipt,
    InMemoryCheckpointStore,
)


def test_checkpoint_rejects_stale_revision_schema_and_generation():
    store = InMemoryCheckpointStore()
    snapshot = CheckpointSnapshot("traveler-1", "plan-1", 2, 1, "ready", ({"candidate_id": "c-1"},), ("e-1",))
    store.save(snapshot)
    assert store.load("traveler-1", "plan-1", plan_revision=2) == snapshot
    with pytest.raises(CheckpointError):
        store.load("traveler-1", "plan-1", plan_revision=3)
    with pytest.raises(CheckpointError):
        store.save(CheckpointSnapshot("traveler-1", "plan-1", 2, 0, "ready"))
    with pytest.raises(CheckpointError):
        store.load("traveler-2", "plan-1", plan_revision=2)


def test_receipt_scope_and_purge():
    store = InMemoryCheckpointStore()
    receipt = EventReceipt("traveler-1", "plan-1", "event-1", {"status": "shortlist_ready"})
    store.record_receipt(receipt)
    assert store.receipt("traveler-1", "plan-1", "event-1") == receipt
    with pytest.raises(CheckpointError):
        store.record_receipt(EventReceipt("traveler-1", "plan-1", "event-1", {"status": "other"}))
    store.purge("traveler-1", "plan-1")
    assert store.receipt("traveler-1", "plan-1", "event-1") is None


def test_agentcore_memory_is_inactive_and_bounded():
    memory = create_memory_adapter()
    assert memory.enabled is False
    assert memory.namespace("traveler-1") == "traveler/traveler-1"
    assert asyncio.run(memory.retrieve_relevant_memory("traveler-1", "food")) == []
    asyncio.run(memory.record_memory_candidate("traveler-1", {"observation": "safe"}))
