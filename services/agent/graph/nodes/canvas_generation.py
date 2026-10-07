"""LangGraph-owned canvas assembly; generation never writes durable Plan data."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from dataclasses import replace
from typing import Any

from ...canvas_contracts import CanvasDraft, ThemesComponent
from ...canvas_mapping import mapped_components
from ...claude.research_worker import ResearchWorkerError
from ...claude.themes_worker import summary_sources
from ...request_context import current_traveler_profile, emit_canvas_draft
from ...state import AgentState
from ...turn import TurnContext


class CanvasGenerationNode:
    def __init__(self, worker: Any = None, research_worker: Any = None) -> None:
        self.worker = worker
        self.research_worker = research_worker

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        draft = None
        usage = {}
        private_evidence = []
        try:
            action = state.get("canvas_action")
            if action not in {"generate_themes", "generate_research", "generate_plan"}:
                raise ValueError("Unsupported canvas action")
            context = TurnContext(
                traveler_scope=state["traveler_scope"], plan_id=state["plan_id"],
                brief=state.get("brief", {}), trip_context=state.get("trip_context", {}),
                recent_messages=tuple(state.get("generation_messages", state.get("recent_messages", []))),
                traveler_profile=current_traveler_profile(),
            )
            # Validate full coverage before any SDK invocation, including research-only retries.
            summary_sources(context, state.get("message", ""))
            previous = state.get("canvas_draft") or {}
            components = deepcopy(previous.get("components", {}))
            known = mapped_components(context.trip_context)
            # Existing saved pins survive generation if the chosen destination is unchanged.
            old_map = components.get("map", {})
            if old_map.get("destination") == known["map"]["destination"]:
                known["map"]["pins"] = old_map.get("pins", [])
            for key, value in known.items():
                if action != "generate_plan" and key in components:
                    continue
                components[key] = value
            draft = CanvasDraft(
                components=components, generation_id=state.get("event_id"),
                context_revision=state.get("context_revision"),
                plan_revision=state.get("plan_revision"),
            )
            groups = (["themes", "research"] if action == "generate_plan" else
                      ["themes"] if action == "generate_themes" else ["research"])
            draft.group_status = {group: "loading" for group in groups}
            await emit_canvas_draft(draft.model_dump(exclude_none=True))
            from ...claude.canvas_research_worker import ClaudeCanvasResearchWorker
            from ...claude.themes_worker import ClaudeThemesWorker
            from ...config import ResearchWorkerConfig

            config = getattr(self.worker, "config", None) or ResearchWorkerConfig.from_env()
            ceiling = min(config.max_budget_usd, 0.35)
            spent = 0.0
            async with asyncio.timeout(min(config.timeout_seconds, 120)):
                for group in groups:
                    allocation = min(0.10 if group == "themes" else 0.25, ceiling - spent)
                    group_usage = {}
                    try:
                        if allocation <= 0:
                            raise ResearchWorkerError("canvas_budget_exhausted")
                        group_config = replace(config, max_budget_usd=allocation)
                        if group == "themes":
                            # Use injected worker when its configured ceiling fits this allocation.
                            worker = self.worker if (self.worker is not None and
                                min(config.max_budget_usd, 0.10) <= allocation) else ClaudeThemesWorker(group_config)
                            raw = await worker.run(context=context, message=state.get("message", ""),
                                                   usage=group_usage)
                            draft.components["themes"] = ThemesComponent.model_validate(raw).model_dump()
                            if action == "generate_themes":
                                draft.component = "TripThemes"
                                draft.data = ThemesComponent.model_validate(raw)
                        else:
                            worker = self.research_worker or ClaudeCanvasResearchWorker(group_config)
                            generated = await worker.run(
                                destination=context.trip_context.get("finalDestination", ""),
                                themes=draft.components.get("themes", {"status": "ready", "items": []}),
                                trip_context=context.trip_context,
                                reusable_evidence=state.get("reusable_evidence", []),
                                usage=group_usage, evidence_sink=private_evidence,
                            )
                            # Validate the entire proposed surface before accepting either component.
                            checked = CanvasDraft(components={**draft.components, **generated})
                            draft.components = checked.components
                        spent += group_usage.get("cost_usd", 0.0)
                        draft.group_status[group] = "ready"
                    except asyncio.CancelledError:
                        raise
                    except Exception:
                        # Unknown failed-call usage conservatively consumes its reserved budget.
                        spent += allocation
                        draft.group_status[group] = "error"
                    usage[group] = group_usage
                    await emit_canvas_draft(draft.model_dump(exclude_none=True))
            return {"status": "canvas_draft_ready", "canvas_draft": draft.model_dump(exclude_none=True),
                    "assistant_text": "", "question": None, "error": None,
                    "state_changes": [], "_canvas_usage": usage, "_canvas_evidence": private_evidence}
        except asyncio.CancelledError:
            raise
        except Exception as error:
            if draft is not None:
                for group, status in draft.group_status.items():
                    if status == "loading":
                        draft.group_status[group] = "error"
                await emit_canvas_draft(draft.model_dump(exclude_none=True))
                return {"status": "canvas_draft_ready", "canvas_draft": draft.model_dump(exclude_none=True),
                        "assistant_text": "", "question": None, "state_changes": [], "error": None,
                        "_canvas_usage": usage, "_canvas_evidence": private_evidence}
            coverage = isinstance(error, ResearchWorkerError) and error.code == "canvas_coverage_incomplete"
            return {"status": "unable to continue", "canvas_draft": state.get("canvas_draft"),
                    "assistant_text": "", "question": None, "state_changes": [],
                    "error": ("This conversation exceeds the generation context limit. No generation was started."
                              if coverage else "Your canvas could not be generated. Please try again.")}
