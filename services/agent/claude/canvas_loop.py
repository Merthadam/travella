"""Shared, bounded generation/review/revision orchestration (no hidden retries)."""
from __future__ import annotations

import json
import logging
import math
import time
from pathlib import Path

from pydantic import ValidationError

from ..canvas_contracts import CanvasReview
from .research_worker import ResearchWorkerError

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


def canvas_prompt(name: str) -> str:
    if name not in {"canvas-themes-v1", "canvas-research-v1", "canvas-review-v1"}:
        raise ValueError("Unknown canvas prompt")
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


class CanvasBudget:
    def __init__(self, ceiling: float, seconds: float):
        self.ceiling = ceiling
        self.deadline = time.monotonic() + seconds
        self.cost = 0.0
        self.calls = 0
        self.stage = "prepare"

    def allowance(self) -> float:
        remaining = self.ceiling - self.cost
        if remaining <= 0 or time.monotonic() >= self.deadline or self.calls >= 3:
            raise ResearchWorkerError("canvas_budget_exhausted")
        self.calls += 1
        return remaining

    def charge(self, cost: float) -> None:
        if not isinstance(cost, (int, float)) or not math.isfinite(cost) or cost < 0:
            raise ResearchWorkerError("canvas_usage_unavailable")
        self.cost += cost
        if self.cost > self.ceiling:
            raise ResearchWorkerError("canvas_budget_exhausted")


async def reviewed_candidate(*, invoke, payload, schema, validate, budget, review_sources=None):
    """Always review a parseable candidate, including one requiring schema repair."""
    budget.stage = "generate"
    raw, cost = await invoke("generate", payload, schema, budget.allowance())
    budget.charge(cost)
    if not isinstance(raw, dict) or len(json.dumps(raw)) > 48000:
        raise ResearchWorkerError("canvas_output_invalid")
    errors = []
    try:
        validate(raw)
    except (ValidationError, ValueError, ResearchWorkerError):
        # Do not put validation input (possibly sensitive provider text) in errors.
        errors = ["Candidate fails schema, bounds or source validation. Repair it."]
    review_payload = {**payload, "candidate": raw, "validation_errors": errors}
    if review_sources:
        review_payload["read_evidence"] = review_sources()
    budget.stage = "review"
    review_raw, cost = await invoke(
        "review", review_payload, CanvasReview.model_json_schema(), budget.allowance()
    )
    budget.charge(cost)
    review = CanvasReview.model_validate(review_raw)
    if errors or review.verdict == "revise" or review.issues:
        budget.stage = "revise"
        revised, cost = await invoke("revise", {
            **review_payload, "review": review.model_dump(),
        }, schema, budget.allowance())
        budget.charge(cost)
        # There is deliberately no second review. Conservatively remove unchanged
        # items explicitly rejected by the reviewer before final code validation.
        if isinstance(revised, dict):
            for issue in review.issues:
                old_items = raw.get(issue.component_id, raw.get("items", []))
                new_items = revised.get(issue.component_id, revised.get("items", []))
                if not isinstance(old_items, list) or not isinstance(new_items, list):
                    continue
                for index, old in enumerate(old_items):
                    if issue.item_id in {str(index), f"item-{index}", str(old.get("id", "")) if isinstance(old, dict) else ""}:
                        new_items[:] = [item for item in new_items if item != old]
        raw = revised
    return validate(raw)


def report_canvas_usage(budget: CanvasBudget, usage: dict | None, *, group: str,
                        complete: bool, cancelled: bool, searches: int = 0, reads: int = 0) -> None:
    """Known completed-call spend is a lower bound when an SDK call failed."""
    metadata = {"calls": budget.calls, "cost_usd": budget.cost,
                "usage_complete": complete, "stage": budget.stage,
                "searches": searches, "reads": reads}
    if usage is not None:
        usage.update(metadata)
    if cancelled:
        # Cancellation exits the graph before service-level result logging.
        # Fixed group/stage labels and numeric counts only: no prompt or identity.
        logging.getLogger(__name__).info(
            "canvas_cancelled group=%s stage=%s calls=%s known_cost_usd=%s "
            "usage_complete=false searches=%s reads=%s",
            group, budget.stage, budget.calls, budget.cost, searches, reads,
        )
