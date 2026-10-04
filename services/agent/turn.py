"""Typed, bounded context and prompt construction for one Plan turn."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

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
    tentative_inferences: dict[str, Any] = field(default_factory=dict)
    recent_messages: tuple[dict[str, str], ...] = ()
    research_state: dict[str, Any] = field(default_factory=dict)
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
            tentative_inferences=dict(self.tentative_inferences),
            recent_messages=history,
            research_state=dict(self.research_state),
            generation=self.generation,
        )

    def messages(self, user_message: str) -> list[dict[str, str]]:
        context = self.bounded()
        context_blob = json.dumps(
            {
                "plan_id": context.plan_id,
                "plan_revision": context.plan_revision,
                "brief": context.brief,
                "tentative_inferences": context.tentative_inferences,
                "research_state": context.research_state,
                "generation": context.generation,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        return [
            *list(context.recent_messages),
            {
                "role": "user",
                "content": f"Plan context (JSON): {context_blob}\nTraveler message: {user_message[:MAX_TEXT]}",
            },
        ]


def load_prompt(name: str) -> str:
    if name not in {"conversation-v1", "research-v1", "onboarding-intake-v1"}:
        raise ValueError("prompt is not allowlisted")
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")
