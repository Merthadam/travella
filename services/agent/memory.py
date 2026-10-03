"""Traveler-scoped long-term memory boundary.

AgentCore Memory is deliberately inactive in this slice.  Keeping the boundary
here prevents graph code from acquiring a provider-specific dependency before
identity, retention, and authorization are fully wired.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class MemoryAdapter(Protocol):
    async def retrieve_relevant_memory(self, traveler_scope: str, topic: str) -> list[dict[str, Any]]: ...

    async def record_memory_candidate(self, traveler_scope: str, observation: dict[str, Any]) -> None: ...


@dataclass(frozen=True)
class DisabledMemory:
    """No-op memory adapter, including when AgentCore is configured."""

    namespace_template: str = "traveler/{actorId}"
    event_expiry_days: int = 30
    enabled: bool = False

    def namespace(self, traveler_scope: str) -> str:
        return self.namespace_template.replace("{actorId}", traveler_scope)

    async def retrieve_relevant_memory(self, traveler_scope: str, topic: str) -> list[dict[str, Any]]:
        del traveler_scope, topic
        return []

    async def record_memory_candidate(self, traveler_scope: str, observation: dict[str, Any]) -> None:
        del traveler_scope, observation


def create_memory_adapter() -> DisabledMemory:
    return DisabledMemory()
