"""AgentCore Memory configuration boundary for the future LangGraph service."""

from __future__ import annotations

from .config import McpSettings


class MemoryProvider:
    """Provider interface; graph reads/writes are added after auth wiring."""

    def __init__(self, settings: McpSettings | None = None):
        self.settings = settings or McpSettings.from_env()

    @property
    def enabled(self) -> bool:
        return self.settings.memory_provider == "agentcore" and bool(self.settings.agentcore_memory_id)

    def namespace(self, actor_id: str) -> str:
        return self.settings.memory_namespace_template.replace("{actorId}", actor_id)


memory_provider = MemoryProvider()
