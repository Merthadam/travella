"""Bounded evidence retrieval and temporary map resolution stage."""

from __future__ import annotations

from typing import Any

from ...request_context import current_authorization_token
from ...state import AgentState

_CANDIDATE_FIELDS = (
    "candidate_id",
    "name",
    "status",
    "confidence",
    "fit_summary",
    "caveats",
    "evidence",
)
_MAP_FIELDS = ("place_id", "label", "city", "country", "location", "temporary", "attribution")
_MAX_PAGE_TEXT = 10_000


def _bounded_candidates(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("invalid candidate projection")
    candidates = []
    for item in value[:5]:
        if not isinstance(item, dict) or not item.get("candidate_id") or not item.get("name"):
            raise ValueError("invalid candidate projection")
        candidates.append({key: item[key] for key in _CANDIDATE_FIELDS if key in item})
    return candidates


class ResearchNode:
    """Read bounded evidence, synthesize an answer, and resolve map locations."""

    def __init__(self, tools: Any) -> None:
        self.tools = tools

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        action = state.get("candidate_action") or {}
        message = str(state.get("message", "")).strip()
        if action.get("action") == "extend":
            message = f"{message}; suggest additional options"
        if action.get("action") == "refresh":
            message = f"{message}; find current recommendations"

        result = await self.tools.research(
            message=message,
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            event_id=state["event_id"],
            authorization_token=current_authorization_token(),
            research_intent=state.get("research_intent", "destination_discovery"),
        )
        status = result.get("status") if isinstance(result, dict) else None
        if status in {"question", "needs your input"}:
            return {
                "status": "needs your input",
                "question": str(result.get("question", "Tell me a little more about your trip.")),
            }
        if status not in {"ready", "shortlist_ready"}:
            return {"status": "unable to continue", "error": "Research is temporarily unavailable."}

        try:
            candidates = _bounded_candidates(result.get("candidates", []))
        except ValueError:
            return {"status": "unable to continue", "error": "Research results were invalid."}
        if not candidates:
            return {
                "status": "unable to continue",
                "error": "No complete candidates were returned.",
            }

        page_read = result.get("page_read")
        if not isinstance(page_read, dict):
            page_read = {"read_status": "unavailable"}
        safe_page_read = {
            "evidence_id": str(page_read.get("evidence_id", ""))[:180],
            "title": str(page_read.get("title", ""))[:180],
            "url": str(page_read.get("url", ""))[:2048],
            "retrieved_at": str(page_read.get("retrieved_at", ""))[:80],
            "read_status": "read" if page_read.get("read_status") == "read" else "unavailable",
        }
        if safe_page_read["read_status"] == "read":
            content = page_read.get("content")
            if (
                not safe_page_read["evidence_id"]
                or not safe_page_read["url"].startswith("https://")
                or not isinstance(content, str)
                or not content.strip()
            ):
                safe_page_read["read_status"] = "unavailable"
            else:
                safe_page_read["content"] = content[:_MAX_PAGE_TEXT]

        synthesize = getattr(self.tools, "synthesize_research", None)
        if synthesize is None:
            return {"status": "unable to continue", "error": "Research synthesis is unavailable."}
        synthesis = await synthesize(
            message=message,
            page_read=safe_page_read,
            context=state.get("brief", {}),
        )
        if not isinstance(synthesis, dict):
            synthesis = {}
        answer = synthesis.get("answer")
        returned_ids = synthesis.get("evidence_ids")
        eligible_ids = (
            {safe_page_read["evidence_id"]}
            if safe_page_read["read_status"] == "read"
            else set()
        )
        citations = (
            list(dict.fromkeys(item for item in returned_ids if isinstance(item, str) and item in eligible_ids))
            if isinstance(returned_ids, list)
            else []
        )
        if not isinstance(answer, str) or not answer.strip():
            answer = "I couldn’t complete a source-grounded answer. Please try again."
            citations = []
        elif safe_page_read["read_status"] != "read":
            answer = "I couldn’t read a source page for this question, so I can’t verify an answer yet."
            citations = []
        elif not citations:
            answer = "I couldn’t verify a useful answer from the page I read. Tell me what detail you want me to check."

        answer_sources = (
            [{key: safe_page_read[key] for key in ("evidence_id", "title", "url", "retrieved_at")}]
            if citations
            else []
        )

        locations_result = await self.tools.resolve_map(
            names=[candidate["name"] for candidate in candidates],
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            authorization_token=current_authorization_token(),
        )
        locations = (
            locations_result.get("locations", []) if isinstance(locations_result, dict) else []
        )
        if isinstance(locations, list):
            by_name = {
                str(item.get("candidate_name")): item
                for item in locations
                if isinstance(item, dict) and item.get("candidate_name")
            }
            for candidate in candidates:
                location = by_name.get(str(candidate["name"]))
                if location:
                    candidate["map_location"] = {
                        key: location[key] for key in _MAP_FIELDS if key in location
                    }

        return {
            "status": "shortlist_ready",
            "candidates": candidates,
            "run_id": str(result.get("run_id", "")),
            "assistant_text": answer.strip()[:2000],
            "research_sources": answer_sources,
            "research_evidence_ids": citations,
        }
