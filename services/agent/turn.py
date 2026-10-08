"""Typed, bounded context and prompt construction for one Plan turn."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from services.shared.traveler_profile import profile_context

PROMPT_DIR = Path(__file__).with_name("prompts")
MAX_HISTORY = 12
MAX_TEXT = 2000


@dataclass(frozen=True)
class TurnContext:
    traveler_scope: str
    plan_id: str
    conversation_id: str | None = None
    plan_revision: int = 1
    brief: dict[str, Any] = field(default_factory=dict)
    trip_context: dict[str, Any] = field(default_factory=dict)
    traveler_profile: dict[str, Any] = field(default_factory=dict)
    recent_messages: tuple[dict[str, str], ...] = ()
    generation: int = 0

    def bounded(self) -> "TurnContext":
        history = tuple(
            {
                "role": str(item.get("role", "user")),
                "content": str(item.get("content", ""))[:MAX_TEXT],
            }
            for item in self.recent_messages[-MAX_HISTORY:]
            if isinstance(item, dict) and str(item.get("content", "")).strip()
        )
        active_brief = {
            str(key): value
            for key, value in self.brief.items()
            if isinstance(value, dict) and value.get("active", True)
        }
        return TurnContext(
            traveler_scope=self.traveler_scope,
            plan_id=self.plan_id,
            conversation_id=self.conversation_id,
            plan_revision=self.plan_revision,
            brief=active_brief,
            trip_context=dict(self.trip_context),
            traveler_profile=profile_context(self.traveler_profile),
            recent_messages=history,
            generation=self.generation,
        )


def load_prompt(name: str) -> str:
    if name not in {"chat-v1", "canvas-themes-v1", "canvas-review-v1", "canvas-research-v1"}:
        raise ValueError("prompt is not allowlisted")
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")
