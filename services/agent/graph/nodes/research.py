"""Bounded evidence retrieval, review, and temporary map resolution stage."""

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
_MAX_PAGE_TEXT = 10_000
_MAX_PASS_COUNT = 3
_MAX_PAGE_COUNT_PER_PASS = 3
_MAX_TURN_CHARS = 10_000
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


class ResearchNode:
    """Search once per invocation, let Claude review evidence, and route safely."""

    def __init__(self, tools: Any) -> None:
        self.tools = tools

    async def _read_pass_evidence(
        self, *, state: AgentState, result: dict[str, Any], remaining_chars: int
    ) -> list[dict[str, Any]]:
        run_id = str(result.get("run_id", ""))
        sources = result.get("sources", [])
        if not isinstance(sources, list):
            sources = []
        if not sources:
            candidates = result.get("candidates", [])
            sources = [
                source
                for candidate in candidates if isinstance(candidate, dict)
                for source in candidate.get("evidence", []) if isinstance(source, dict)
            ]
        selected: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        for source in sources:
            if not isinstance(source, dict):
                continue
            evidence_id = str(source.get("evidence_id", ""))[:180]
            if not evidence_id or evidence_id in seen_ids:
                continue
            seen_ids.add(evidence_id)
            selected.append(source)
            if len(selected) == _MAX_PAGE_COUNT_PER_PASS:
                break

        pages: list[dict[str, Any]] = []
        page_read = result.get("page_read")
        if isinstance(page_read, dict) and page_read.get("evidence_id"):
            pages.append(page_read)

        first_id = str(page_read.get("evidence_id", "")) if isinstance(page_read, dict) else ""
        additional_ids = [
            str(source["evidence_id"])
            for source in selected
            if str(source.get("evidence_id", "")) != first_id
        ]
        read_sources = getattr(self.tools, "sources", None)
        if additional_ids and run_id and read_sources:
            try:
                read_result = await read_sources(
                    evidence_ids=additional_ids[:_MAX_PAGE_COUNT_PER_PASS - len(pages)],
                    traveler_scope=state["traveler_scope"],
                    plan_id=state["plan_id"],
                    run_id=run_id,
                    authorization_token=current_authorization_token(),
                    read_content=True,
                )
                extra_pages = read_result.get("evidence", []) if isinstance(read_result, dict) else []
                if isinstance(extra_pages, list):
                    pages.extend(page for page in extra_pages if isinstance(page, dict))
            except Exception:
                # An unread page stays unavailable; snippets never become evidence.
                pass

        source_by_id = {
            str(source.get("evidence_id")): source
            for source in selected
            if isinstance(source, dict) and source.get("evidence_id")
        }
        normalized: list[dict[str, Any]] = []
        consumed = 0
        for page in pages[:_MAX_PAGE_COUNT_PER_PASS]:
            evidence_id = str(page.get("evidence_id", ""))[:180]
            source = source_by_id.get(evidence_id, {})
            content = page.get("content")
            if page.get("read_status") != "read" or not isinstance(content, str) or not content.strip():
                continue
            allowance = min(_MAX_PAGE_TEXT, max(0, remaining_chars - consumed))
            if not allowance:
                break
            excerpt = content[:allowance]
            if not excerpt.strip():
                continue
            normalized.append({
                "evidence_id": evidence_id,
                "title": str(page.get("title") or source.get("title", ""))[:180],
                "url": str(page.get("url") or source.get("url", ""))[:2048],
                "publisher": str(page.get("publisher") or source.get("publisher", ""))[:180],
                "source_quality": str(page.get("source_quality") or source.get("source_quality", "general"))[:40],
                "retrieved_at": str(page.get("retrieved_at", ""))[:80],
                "read_status": "read",
                "content": excerpt,
            })
            consumed += len(excerpt)
        return normalized

    async def __call__(self, state: AgentState) -> dict[str, Any]:
        research_intent = state.get("research_intent")
        if research_intent not in {"factual_research", "destination_discovery"}:
            return {
                "status": "needs your input",
                "question": "Would you like factual information about a place, or suggestions for destinations?",
                "research_action": "answer",
            }

        action = state.get("candidate_action") or {}
        original_message = str(state.get("message", "")).strip()
        if action.get("action") == "extend":
            original_message = f"{original_message}; suggest additional options"
        if action.get("action") == "refresh":
            original_message = f"{original_message}; find current recommendations"

        reusable = _reusable_evidence(state, original_message)
        if reusable and not state.get("research_evidence"):
            reuse_review = await self._review(
                state=state, message=original_message, evidence=reusable,
                candidates=state.get("candidates", []), force_answer=False,
            )
            if reuse_review.get("action") == "answer":
                return await self._terminal(
                    state=state, candidates=state.get("candidates", []), evidence=reusable,
                    result={}, answer=str(reuse_review.get("answer", "")),
                    evidence_ids=list(reuse_review.get("evidence_ids", [])),
                    uncertainty=list(reuse_review.get("uncertainty", [])),
                    pass_count=0, queries=[],
                )

        pass_count = int(state.get("research_pass_count", 0))
        queries = list(state.get("research_queries", []))
        follow_up = state.get("research_query")
        query = str(follow_up if follow_up else original_message).strip()
        if not query or len(query) > (300 if follow_up else 500) or _normalize_query(query) in {
            _normalize_query(item) for item in queries
        }:
            return await self._answer_from_existing_evidence(state, original_message, "The follow-up query was empty, too long, or repeated.")
        if pass_count >= _MAX_PASS_COUNT:
            return await self._answer_from_existing_evidence(state, original_message, "The three-search limit was reached.")

        result = await self.tools.research(
            message=query,
            traveler_scope=state["traveler_scope"],
            plan_id=state["plan_id"],
            event_id=state["event_id"],
            authorization_token=current_authorization_token(),
            research_intent=research_intent,
        )
        status = result.get("status") if isinstance(result, dict) else None
        if status in {"question", "needs your input"}:
            return {
                "status": "needs your input",
                "question": str(result.get("question", "Tell me a little more about your trip.")),
                "research_action": "answer",
            }
        if status not in {"ready", "shortlist_ready", "uncertain"}:
            return {"status": "unable to continue", "error": "Research is temporarily unavailable.", "research_action": "answer"}

        try:
            retrieved_candidates = _bounded_candidates(result.get("candidates", []))
        except ValueError:
            return {"status": "unable to continue", "error": "Research results were invalid.", "research_action": "answer"}
        if research_intent == "factual_research":
            retrieved_candidates = []
        if research_intent == "destination_discovery" and not retrieved_candidates and not state.get("candidates"):
            return {
                "status": "unable to continue",
                "error": "No complete candidates were returned.",
                "research_action": "answer",
            }

        pass_count += 1
        queries.append(query)
        evidence = list(state.get("research_evidence", [])) or reusable
        remaining_chars = max(0, _MAX_TURN_CHARS - sum(len(str(item.get("content", ""))) for item in evidence))
        pass_evidence = await self._read_pass_evidence(
            state=state,
            result=result,
            remaining_chars=remaining_chars,
        )
        known_ids = {str(item.get("evidence_id")) for item in evidence}
        evidence.extend(item for item in pass_evidence if item["evidence_id"] not in known_ids)
        candidates = state.get("candidates") or retrieved_candidates
        if research_intent == "destination_discovery" and not candidates:
            return {"status": "unable to continue", "error": "No complete candidates were returned.", "research_action": "answer"}

        review = await self._review(
            state=state,
            message=original_message,
            evidence=evidence,
            candidates=candidates,
            force_answer=pass_count >= _MAX_PASS_COUNT,
        )
        if review.get("action") == "invalid":
            answer = "I couldn’t verify a useful answer because the research citation could not be validated. Tell me which detail you want me to check."
            return await self._terminal(
                state=state, candidates=candidates, evidence=evidence, result=result,
                answer=answer, evidence_ids=[], uncertainty=["The research review could not be validated."],
                pass_count=pass_count, queries=queries,
            )

        if review.get("action") == "refine":
            proposed_query = str(review.get("query", "")).strip()
            normalized = _normalize_query(proposed_query)
            if pass_count >= _MAX_PASS_COUNT or not normalized or len(proposed_query) > 300 or normalized in {
                _normalize_query(item) for item in queries
            }:
                review = await self._review(
                    state=state,
                    message=original_message,
                    evidence=evidence,
                    candidates=candidates,
                    force_answer=True,
                    gap=str(review.get("gap", "The requested detail remains uncertain.")),
                )
                if review.get("action") != "answer":
                    return await self._terminal(
                        state=state, candidates=candidates, evidence=evidence, result=result,
                        answer="I checked the available sources, but could not verify the remaining detail.",
                        evidence_ids=list(review.get("evidence_ids", [])),
                        uncertainty=[str(review.get("gap") or "The requested detail remains uncertain.")],
                        pass_count=pass_count, queries=queries,
                    )
            else:
                return {
                    "status": "in_progress",
                    "research_evidence": evidence,
                    "research_pass_count": pass_count,
                    "research_queries": queries,
                    "research_action": "refine",
                    "research_query": proposed_query,
                    "research_gap": str(review.get("gap", ""))[:300],
                    "candidates": candidates,
                    "run_id": str(result.get("run_id", state.get("run_id", ""))),
                }

        answer = str(review.get("answer", "")).strip()
        evidence_ids = list(review.get("evidence_ids", []))
        uncertainty = [str(item)[:300] for item in review.get("uncertainty", [])]
        if pass_count >= _MAX_PASS_COUNT:
            gap = str(state.get("research_gap", "")).strip()
            if gap and not any(gap.casefold() in item.casefold() for item in uncertainty):
                uncertainty.append(gap[:300])
            if uncertainty and "what remains uncertain" not in answer.casefold() and "still uncertain" not in answer.casefold():
                answer = f"{answer}\n\nWhat remains uncertain: {'; '.join(uncertainty)}"
        return await self._terminal(
            state=state, candidates=candidates, evidence=evidence, result=result,
            answer=answer, evidence_ids=evidence_ids, uncertainty=uncertainty,
            pass_count=pass_count, queries=queries,
        )

    async def _review(
        self, *, state: AgentState, message: str, evidence: list[dict[str, Any]],
        candidates: list[dict[str, Any]], force_answer: bool, gap: str | None = None,
    ) -> dict[str, Any]:
        eligible = {str(item.get("evidence_id")) for item in evidence if item.get("read_status") == "read"}
        if not eligible:
            return {
                "action": "answer",
                "answer": "I couldn’t read a source page for this question, so I can’t verify an answer yet.",
                "query": None,
                "gap": None,
                "evidence_ids": [],
                "uncertainty": ["The selected source pages were unavailable."],
            }
        synthesize = getattr(self.tools, "synthesize_research", None)
        if synthesize is None:
            return {"action": "invalid"}
        result = await synthesize(
            message=message,
            page_read={"evidence": evidence, "force_answer": force_answer, "known_gap": gap},
            context={
                "brief": {
                    str(key): value
                    for key, value in state.get("brief", {}).items()
                    if isinstance(value, dict) and value.get("active", True)
                }
            } if isinstance(state.get("brief", {}), dict) else {},
            research_intent=state.get("research_intent", "factual_research"),
            candidates=[
                {key: candidate[key] for key in ("candidate_id", "name") if key in candidate}
                for candidate in candidates
            ] if state.get("research_intent") == "destination_discovery" else [],
        )
        if not isinstance(result, dict):
            return {"action": "invalid"}
        cited = result.get("evidence_ids")
        if not isinstance(cited, list) or any(
            not isinstance(item, str) or item not in eligible for item in cited
        ):
            return {"action": "invalid"}
        if result.get("action") not in {"answer", "refine"}:
            return {"action": "invalid"}
        return result

    async def _answer_from_existing_evidence(self, state: AgentState, message: str, gap: str) -> dict[str, Any]:
        evidence = list(state.get("research_evidence", []))
        result = await self._review(
            state=state, message=message, evidence=evidence,
            candidates=state.get("candidates", []), force_answer=True, gap=gap,
        )
        if result.get("action") == "answer":
            return await self._terminal(
                state=state, candidates=state.get("candidates", []), evidence=evidence,
                result={}, answer=str(result.get("answer", "")),
                evidence_ids=list(result.get("evidence_ids", [])),
                uncertainty=[*result.get("uncertainty", []), gap],
                pass_count=int(state.get("research_pass_count", 0)),
                queries=list(state.get("research_queries", [])),
            )
        return await self._terminal(
            state=state, candidates=state.get("candidates", []), evidence=evidence,
            result={}, answer="I couldn’t verify the remaining detail from the available sources.",
            evidence_ids=[], uncertainty=[gap],
            pass_count=int(state.get("research_pass_count", 0)),
            queries=list(state.get("research_queries", [])),
        )

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
            "status": "shortlist_ready",
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
