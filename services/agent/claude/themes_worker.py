"""Focused SDK worker: summarize supplied context, with no research tools."""

from __future__ import annotations

import asyncio
import hashlib
import json

from ..canvas_contracts import ThemeComponentItem, ThemesComponent, ThemesSummary
from ..config import ResearchWorkerConfig
from ..turn import TurnContext, load_prompt
from .research_worker import ClaudeResearchWorker, ResearchWorkerError


def summary_sources(context: TurnContext, message: str) -> list[dict[str, str]]:
    """Project relevant bounded data; never forward the full graph or identity."""
    bounded = context.bounded()
    sources = []

    def add(label: str, content: str) -> None:
        if content.strip():
            sources.append({"id": f"source-{len(sources) + 1}",
                            "label": label, "content": content[:4000]})

    # These are advisory and precede current Plan facts and traveler corrections.
    for field in ("travel_interests", "custom_interests", "food_needs", "accessibility_needs"):
        value = bounded.traveler_profile.get(field)
        if value:
            add("Saved preference", f"{field}: {json.dumps(value, ensure_ascii=False)}")
    for field, value in bounded.brief.items():
        add("Trip context", f"{field}: {json.dumps(value, ensure_ascii=False)}")
    if bounded.trip_context:
        add("Trip context", json.dumps(bounded.trip_context, ensure_ascii=False))
    # Agent suggestions are not traveler preferences. Only traveler messages are evidence.
    for item in bounded.recent_messages:
        if item["role"] == "user":
            add("Conversation", item["content"])
    add("Conversation", message[:2000])
    if len(json.dumps(sources, ensure_ascii=False)) > 32000:
        raise ResearchWorkerError("canvas_context_too_large")
    return sources


class ClaudeThemesWorker:
    """A single isolated Agent SDK invocation owned by the LangGraph node."""

    def __init__(self, config: ResearchWorkerConfig, *, worker=None) -> None:
        self.config = config
        self.worker = worker if worker is not None else ClaudeResearchWorker(config)

    async def run(self, *, context: TurnContext, message: str = "") -> dict:
        try:
            sources = summary_sources(context, message)
            if not sources:
                return ThemesComponent(items=[]).model_dump()
            async with asyncio.timeout(min(self.config.timeout_seconds, 45)):
                with self.worker.session() as session:
                    raw, _ = await self.worker.structured(
                        session=session,
                        system=load_prompt("canvas-themes-v1"),
                        payload={"sources": sources},
                        schema=ThemesSummary.model_json_schema(),
                        budget=min(self.config.max_budget_usd, 0.10),
                    )
            result = ThemesSummary.model_validate(raw)
            known = {item["id"]: item for item in sources}
            items = []
            seen = set()
            for item in result.items:
                source = known.get(item.source_id)
                if (source is None or not item.source_quote.strip()
                        or item.source_quote not in source["content"] or not item.text.strip()):
                    raise ResearchWorkerError("canvas_output_invalid")
                text = " ".join(item.text.split())
                identity = f"{item.kind}:{text.casefold()}"
                if identity in seen:
                    continue
                seen.add(identity)
                items.append(ThemeComponentItem(
                    id="theme-" + hashlib.sha256(identity.encode()).hexdigest()[:20],
                    kind=item.kind, text=text, source=source["label"],
                ))
            return ThemesComponent(items=items).model_dump()
        except asyncio.CancelledError:
            raise
        except Exception:
            # Provider exceptions and source excerpts must never reach browser errors.
            raise ResearchWorkerError("canvas_summary_unavailable") from None
