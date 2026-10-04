"""Shared evidence freshness and terminal candidate/source projection."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlsplit

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
_FRESHNESS = {"stable": timedelta(days=30), "rules_schedule": timedelta(hours=24), "live": timedelta(hours=1)}


def _fact_type(message: str) -> str:
    value = message.casefold()
    if any(term in value for term in ("weather", "alert", "disruption", "safety", "health", "condition")):
        return "live"
    if any(term in value for term in ("visa", "entry", "rule", "schedule", "timetable", "opening hours", "hours")):
        return "rules_schedule"
    return "stable"


def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _reusable_evidence(state: AgentState, message: str, *, now: datetime | None = None) -> list[dict[str, Any]]:
    saved = state.get("research_state")
    if not isinstance(saved, dict) or saved.get("plan_id") != state.get("plan_id"):
        return []
    now = now or datetime.now(timezone.utc)
    query_terms = {term for term in _normalize_query(message).split() if len(term) > 2}
    result = []
    for item in saved.get("evidence", []) if isinstance(saved.get("evidence"), list) else []:
        if not isinstance(item, dict) or item.get("plan_id") != state.get("plan_id") or item.get("read_status") != "read":
            continue
        expiry = _parse_time(item.get("valid_until"))
        retrieved = _parse_time(item.get("retrieved_at"))
        fact_type = item.get("fact_type")
        excerpt = item.get("excerpt")
        if not expiry or not retrieved or expiry <= now or fact_type not in _FRESHNESS or not isinstance(excerpt, str) or not excerpt.strip():
            continue
        if now - retrieved > _FRESHNESS[fact_type]:
            continue
        haystack = f"{item.get('title', '')} {item.get('publisher', '')} {excerpt}".casefold()
        if query_terms and not any(term in haystack for term in query_terms):
            continue
        result.append({
            "evidence_id": item.get("evidence_id", ""), "title": item.get("title", ""),
            "url": item.get("url", ""), "publisher": item.get("publisher", ""),
            "source_quality": "general", "retrieved_at": item.get("retrieved_at", ""),
            "read_status": "read", "content": excerpt,
            "expires_at": expiry.timestamp(), "fact_type": fact_type,
        })
    return result[:6]


def _bounded_candidates(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("invalid candidate projection")
    candidates = []
    for item in value[:5]:
        if not isinstance(item, dict) or not item.get("candidate_id") or not item.get("name"):
            raise ValueError("invalid candidate projection")
        candidates.append({key: item[key] for key in _CANDIDATE_FIELDS if key in item})
    return candidates


def _normalize_query(value: str) -> str:
    return " ".join(value.casefold().split())


class ResearchProjection:
    """Project a completed SDK research result without further model calls."""

    def __init__(self, tools: Any) -> None:
        self.tools = tools

    async def _terminal(
        self, *, state: AgentState, candidates: list[dict[str, Any]], evidence: list[dict[str, Any]],
        result: dict[str, Any], answer: str, evidence_ids: list[str], uncertainty: list[str],
        pass_count: int, queries: list[str],
    ) -> dict[str, Any]:
        eligible = {str(item.get("evidence_id")): item for item in evidence if item.get("read_status") == "read"}
        citations = list(dict.fromkeys(item for item in evidence_ids if item in eligible))
        if citations and not answer.strip():
            answer = "I couldn’t complete a source-grounded answer. Please try again."
            citations = []
        sources = [
            {key: eligible[evidence_id].get(key, "") for key in ("evidence_id", "title", "url", "retrieved_at")}
            for evidence_id in citations
        ]
        now = datetime.now(timezone.utc)
        reusable_entries = []
        for item in evidence:
            if not isinstance(item, dict) or item.get("read_status") != "read":
                continue
            retrieved = _parse_time(item.get("retrieved_at")) or now
            kind = str(item.get("fact_type") or _fact_type(str(state.get("message", ""))))
            if kind not in _FRESHNESS:
                kind = "stable"
            valid_until = retrieved + _FRESHNESS[kind]
            try:
                domain = urlsplit(str(item.get("url", ""))).hostname or ""
            except ValueError:
                domain = ""
            reusable_entries.append({
                "plan_id": state.get("plan_id"),
                "evidence_id": str(item.get("evidence_id", ""))[:180],
                "title": str(item.get("title", ""))[:180],
                "url": str(item.get("url", ""))[:2048],
                "publisher": str(item.get("publisher", ""))[:180],
                "domain": str(item.get("domain") or domain)[:180],
                "read_status": "read", "fact_type": kind,
                "retrieved_at": retrieved.isoformat().replace("+00:00", "Z"),
                "valid_until": valid_until.isoformat().replace("+00:00", "Z"),
                "excerpt": " ".join(str(item.get("content", "")).split())[:1200],
            })
        prior_reuse = state.get("research_state", {}).get("evidence", []) if isinstance(state.get("research_state"), dict) else []
        merged_reuse = {str(item.get("evidence_id")): item for item in [*prior_reuse, *reusable_entries] if isinstance(item, dict) and item.get("evidence_id")}
        research_intent = state.get("research_intent")
        if candidates and research_intent == "destination_discovery":
            try:
                locations_result = await self.tools.resolve_map(
                    names=[candidate["name"] for candidate in candidates],
                    traveler_scope=state["traveler_scope"],
                    plan_id=state["plan_id"],
                    authorization_token=current_authorization_token(),
                )
            except Exception:
                # A missing optional map must not discard a completed research answer.
                locations_result = {}
                uncertainty = [*uncertainty, "Map locations are temporarily unavailable."]
            locations = locations_result.get("locations", []) if isinstance(locations_result, dict) else []
            if isinstance(locations, list):
                by_name = {
                    str(item.get("candidate_name")): item
                    for item in locations if isinstance(item, dict) and item.get("candidate_name")
                }
                for candidate in candidates:
                    location = by_name.get(str(candidate["name"]))
                    if location:
                        candidate["map_location"] = {key: location[key] for key in _MAP_FIELDS if key in location}
        return {
            "status": "shortlist_ready" if candidates or research_intent == "factual_research" else "in_progress",
            "candidates": candidates,
            "run_id": str(result.get("run_id", state.get("run_id", ""))),
            "assistant_text": answer.strip()[:2000],
            "research_intent": research_intent,
            "research_sources": sources[:9],
            "research_evidence_ids": citations,
            "research_uncertainty": uncertainty[:5],
            "research_evidence": evidence,
            "research_state": {"plan_id": state.get("plan_id"), "evidence": list(merged_reuse.values())[-6:]},
            "research_pass_count": pass_count,
            "research_queries": queries,
            "research_action": "answer",
        }
