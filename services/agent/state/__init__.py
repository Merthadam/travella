"""Agent state contracts and local adapters, split by persistence concern."""

from .candidate_store import (
    CandidateSnapshot,
    EventReservation,
    PlanCandidateStore,
    ProcessReceiptCache,
)
from .checkpoint_memory import InMemoryCheckpointStore
from .contracts import (
    SCHEMA_VERSION,
    AgentState,
    CheckpointError,
    CheckpointSnapshot,
    CheckpointStore,
    EventReceipt,
)

__all__ = [
    "AgentState", "CandidateSnapshot", "CheckpointError", "CheckpointSnapshot",
    "CheckpointStore", "EventReceipt", "EventReservation", "InMemoryCheckpointStore",
    "PlanCandidateStore", "ProcessReceiptCache", "SCHEMA_VERSION",
]
