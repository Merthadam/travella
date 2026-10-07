"""Tool-free, reviewed canvas themes from the complete authorized source pack."""
from __future__ import annotations

import asyncio
import hashlib
import json

from ..canvas_contracts import ThemeComponentItem, ThemesComponent, ThemesSummary
from ..config import ResearchWorkerConfig
from ..turn import TurnContext
from .canvas_loop import CanvasBudget, canvas_prompt, reviewed_candidate
from .research_worker import ClaudeResearchWorker, ResearchWorkerError


def summary_sources(context: TurnContext, message: str) -> list[dict[str, str]]:
    """Keep the provided generation history intact; never silently trim it."""
    sources = []

    def add(label: str, content: str, role: str = "context", active: bool = True) -> None:
        if content.strip():
            sources.append({"id": f"source-{len(sources) + 1}", "label": label,
                            "content": content, "role": role, "active": active})

    for field in ("travel_interests", "custom_interests", "food_needs", "accessibility_needs"):
        value = context.traveler_profile.get(field)
        if value:
            add("Saved preference", f"{field}: {json.dumps(value, ensure_ascii=False)}")
    # Inactive records deliberately remain in the snapshot as tombstones.
    for field, value in context.brief.items():
        active = not isinstance(value, dict) or value.get("active", True)
        add("Trip context", f"{field}: {json.dumps(value, ensure_ascii=False)}", active=active)
    if context.trip_context:
        add("Trip context", json.dumps(context.trip_context, ensure_ascii=False))
    if len(context.recent_messages) > 500:
        raise ResearchWorkerError("canvas_coverage_incomplete")
    for item in context.recent_messages:
        if item.get("role") in {"user", "assistant"}:
            add("Conversation", str(item.get("content", "")), item["role"])
    if message.strip():
        add("Conversation", message, "user")
    if len(json.dumps(sources, ensure_ascii=False)) > 60000:
        raise ResearchWorkerError("canvas_coverage_incomplete")
    return sources


def themes_projection(raw: dict, sources: list[dict]) -> dict:
    result = ThemesSummary.model_validate(raw)
    known = {item["id"]: item for item in sources}
    items, seen = [], set()
    for item in result.items:
        source = known.get(item.source_id)
        if (source is None or not source.get("active", True)
                or not item.source_quote.strip() or item.source_quote not in source["content"]
                or not item.text.strip()):
            raise ResearchWorkerError("canvas_output_invalid")
        if source.get("role") == "assistant":
            acceptance = item.acceptance
            accepted_source = known.get(acceptance.source_id) if acceptance else None
            if (not accepted_source or accepted_source.get("role") != "user"
                    or not acceptance.source_quote.strip()
                    or acceptance.source_quote not in accepted_source["content"]
                    or sources.index(accepted_source) <= sources.index(source)):
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


class ClaudeThemesWorker:
    def __init__(self, config: ResearchWorkerConfig, *, worker=None) -> None:
        self.config = config
        self.worker = worker if worker is not None else ClaudeResearchWorker(config)

    async def run(self, *, context: TurnContext, message: str = "", usage: dict | None = None) -> dict:
        try:
            sources = summary_sources(context, message)
            budget = CanvasBudget(min(self.config.max_budget_usd, 0.10),
                                  min(self.config.timeout_seconds, 45))
            if not sources:
                if usage is not None:
                    usage.update(calls=0, cost_usd=0.0)
                return ThemesComponent(items=[]).model_dump()
            async with asyncio.timeout(min(self.config.timeout_seconds, 45)):
                with self.worker.session() as session:
                    async def invoke(stage, payload, schema, allowance):
                        return await self.worker.structured(
                            session=session,
                            system=canvas_prompt("canvas-review-v1" if stage == "review"
                                                 else "canvas-themes-v1"),
                            payload=payload, schema=schema, budget=allowance,
                        )
                    result = await reviewed_candidate(
                        invoke=invoke, payload={"sources": sources},
                        schema=ThemesSummary.model_json_schema(),
                        validate=lambda raw: themes_projection(raw, sources), budget=budget,
                    )
            if usage is not None:
                usage.update(calls=budget.calls, cost_usd=budget.cost)
            return result
        except asyncio.CancelledError:
            raise
        except ResearchWorkerError:
            raise
        except Exception:
            raise ResearchWorkerError("canvas_summary_unavailable") from None
