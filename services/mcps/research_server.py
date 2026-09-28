"""Bounded, source-backed destination research FastMCP target."""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

from .config import McpSettings, required_secret
from .transport import AuthenticationError, authenticated_mcp_app, require_tool_context

MAX_CANDIDATES = 5
MAX_SOURCES = 10
MAX_EXCERPT = 700
MAX_CLAIM = 420
EVIDENCE_TTL_SECONDS = 60 * 60
TAVILY_SEARCH_URL = "https://api.tavily.com/search"
research_mcp = FastMCP("travella-research-mcp")


def _registry_path() -> Path:
    return Path(os.getenv("MCP_EVIDENCE_REGISTRY_PATH", ".cache/travella-evidence.json"))


def _read_registry() -> dict[str, dict[str, Any]]:
    try:
        return json.loads(_registry_path().read_text())
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}


def _write_registry(registry: dict[str, dict[str, Any]]) -> None:
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(registry, separators=(",", ":")))
    temporary.replace(path)


def _clean_text(value: object, limit: int = MAX_EXCERPT) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    text = re.sub(r"(?i)(ignore|disregard) (all|previous|prior) instructions?", "", text)
    return text[:limit].strip()


def _canonical_url(value: object) -> str | None:
    url = str(value or "").strip()
    if not url.lower().startswith("https://") or len(url) > 2048:
        return None
    return url.split("#", 1)[0]


# This is deliberately a small, conservative location vocabulary.  Tavily text is
# evidence, not a destination taxonomy or an instruction channel.  A later place
# identity service can replace this without changing the MCP projection contract.
_DESTINATION_COUNTRIES = {
    "Kyoto": "Japan", "Osaka": "Japan", "Tokyo": "Japan", "Nara": "Japan",
    "Lisbon": "Portugal", "Porto": "Portugal", "Paris": "France", "Lyon": "France",
    "Rome": "Italy", "Florence": "Italy", "Venice": "Italy", "Milan": "Italy",
    "Barcelona": "Spain", "Madrid": "Spain", "Seville": "Spain",
    "London": "United Kingdom", "Edinburgh": "United Kingdom", "Dublin": "Ireland",
    "Amsterdam": "Netherlands", "Berlin": "Germany", "Prague": "Czechia",
    "Vienna": "Austria", "Budapest": "Hungary", "Athens": "Greece",
    "Istanbul": "Turkey", "Reykjavik": "Iceland", "Copenhagen": "Denmark",
    "Stockholm": "Sweden", "Oslo": "Norway", "Helsinki": "Finland",
    "New York": "United States", "Boston": "United States", "Montreal": "Canada",
    "Vancouver": "Canada", "Mexico City": "Mexico", "Buenos Aires": "Argentina",
    "Lima": "Peru", "Cusco": "Peru", "Marrakesh": "Morocco", "Cape Town": "South Africa",
    "Singapore": "Singapore", "Seoul": "South Korea", "Bangkok": "Thailand",
    "Bali": "Indonesia", "Sydney": "Australia", "Melbourne": "Australia",
    "Auckland": "New Zealand", "Honolulu": "United States",
}


def _destination_name(title: str, content: str) -> str:
    """Return a place entity only when the source text names one explicitly.

    In particular, never derive an entity from a page heading: list and article
    titles are evidence about places, not place identities themselves.
    """
    haystack = _clean_text(content, MAX_EXCERPT)
    if not haystack:
        return ""
    for city, country in sorted(_DESTINATION_COUNTRIES.items(), key=lambda item: -len(item[0])):
        if re.search(rf"(?<![\w]){re.escape(city)}(?![\w])", haystack, flags=re.IGNORECASE):
            return f"{city}, {country}"
    return ""


def _destination_entities(result: dict[str, Any]) -> list[str]:
    """Extract all supported place entities from the result's evidence text."""
    raw_content = str(result.get("content") or "")
    if re.search(
        r"(?i)\b(?:ignore|disregard|override)\b.{0,80}\b(?:instructions?|rules?|system)\b|\b(?:system|developer)\s+message\b",
        raw_content,
    ):
        return []
    content = _clean_text(raw_content)
    if not content:
        return []
    entities: list[tuple[int, str]] = []
    for city, country in sorted(_DESTINATION_COUNTRIES.items(), key=lambda item: -len(item[0])):
        match = re.search(rf"(?<![\w]){re.escape(city)}(?![\w])", content, flags=re.IGNORECASE)
        if match:
            entities.append((match.start(), f"{city}, {country}"))
    return [entity for _, entity in sorted(entities)]


def _stable_source_id(run_id: str, url: str) -> str:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
    return f"{run_id}-source-{digest}"


def _stable_candidate_id(run_id: str, name: str) -> str:
    digest = hashlib.sha256(name.casefold().encode("utf-8")).hexdigest()[:16]
    return f"{run_id}-candidate-{digest}"


def _claim_polarity(text: str) -> int:
    lowered = text.casefold()
    return -1 if re.search(r"\b(?:avoid|unsafe|poor|not recommended|difficult|unpleasant)\b", lowered) else 1


def _run_id(plan_id: str, query: str, request_id: str | None) -> str:
    seed = f"{plan_id}:{request_id or query}".encode()
    return f"research-{hashlib.sha256(seed).hexdigest()[:20]}"


def _candidate_projection(
    result: dict[str, Any], destination: str, *, run_id: str
) -> dict[str, Any] | None:
    title = _clean_text(result.get("title"), 180)
    url = _canonical_url(result.get("url"))
    content = _clean_text(result.get("content"), MAX_EXCERPT)
    if not destination or not url or not content:
        return None
    evidence_id = _stable_source_id(run_id, url)
    claim_text = _clean_text(content, MAX_CLAIM)
    caveat_text = "Assessment is limited to the retrieved source excerpt."
    return {
        "candidate_id": _stable_candidate_id(run_id, destination),
        "name": destination,
        "status": "shortlisted",
        "confidence": "supported",
        "fit_summary": claim_text,
        "claims": [{"text": claim_text, "evidence_ids": [evidence_id], "confidence": "supported"}],
        "caveats": [{"text": caveat_text, "evidence_ids": [evidence_id], "confidence": "bounded"}],
        "evidence": [{"evidence_id": evidence_id, "title": title, "url": url}],
        "_polarity": _claim_polarity(content),
    }


def _save_evidence(run_id: str, subject: str, plan_id: str, candidates: list[dict[str, Any]]) -> None:
    now = int(time.time())
    registry = _read_registry()
    for candidate in candidates:
        for evidence in candidate["evidence"]:
            registry[evidence["evidence_id"]] = {
                "subject": subject,
                "plan_id": plan_id,
                "run_id": run_id,
                "title": evidence["title"],
                "url": evidence["url"],
                "excerpt": candidate["fit_summary"],
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": now + EVIDENCE_TTL_SECONDS,
                "attribution": "Tavily search",
            }
    _write_registry(registry)


@research_mcp.tool()
async def research_destination_candidates(
    theme: str, plan_id: str, max_candidates: int = MAX_CANDIDATES,
    request_id: str | None = None, scope_assertion: str | None = None,
) -> dict[str, Any]:
    """Find up to five cited destination candidates for one Plan intent."""
    del scope_assertion
    context = require_tool_context(plan_id=plan_id)
    query = " ".join(theme.split()).strip()
    if not query or len(query) > 500:
        raise ValueError("theme must contain between 1 and 500 characters")
    limit = min(MAX_CANDIDATES, max(1, int(max_candidates)))
    api_key = required_secret(McpSettings.from_env().tavily_api_key, "TAVILY_API_KEY")
    payload = {"api_key": api_key, "query": f"best travel destinations for {query}", "topic": "general", "search_depth": "advanced", "max_results": limit, "include_answer": False, "include_raw_content": False}
    run_id = _run_id(plan_id, query, request_id)
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            response = await client.post(TAVILY_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return {"status": "unable_to_continue", "plan_id": plan_id, "run_id": run_id, "error": "research provider unavailable"}
    results = data.get("results", []) if isinstance(data, dict) else []
    candidates: list[dict[str, Any]] = []
    by_identity: dict[str, dict[str, Any]] = {}
    for result in results:
        if not isinstance(result, dict):
            continue
        for destination in _destination_entities(result):
            if len(candidates) >= limit:
                break
            candidate = _candidate_projection(result, destination, run_id=run_id)
            if not candidate:
                continue
            identity = destination.casefold()
            existing = by_identity.get(identity)
            if existing is None:
                by_identity[identity] = candidate
                candidates.append(candidate)
            else:
                prior_ids = {item["evidence_id"] for item in existing["evidence"]}
                new_evidence = [item for item in candidate["evidence"] if item["evidence_id"] not in prior_ids]
                if not new_evidence:
                    continue
                existing["evidence"].extend(new_evidence)
                existing["claims"].extend(candidate["claims"])
                existing["caveats"].extend(candidate["caveats"])
                existing_polarity = existing.get("_polarity", 1)
                if existing_polarity != candidate["_polarity"]:
                    existing["confidence"] = "uncertain"
                    existing["caveats"].append({
                        "text": "Sources provide conflicting assessments.",
                        "evidence_ids": [item["evidence_id"] for item in existing["evidence"]],
                        "confidence": "uncertain",
                    })
                    existing["_polarity"] = 0
                elif existing_polarity != 0:
                    existing["_polarity"] = existing_polarity
        if len(candidates) >= limit:
            break
    _save_evidence(run_id, context.subject, plan_id, candidates)
    for candidate in candidates:
        candidate.pop("_polarity", None)
    return {"status": "ready" if candidates else "uncertain", "plan_id": plan_id, "run_id": run_id, "candidates": candidates}


@research_mcp.tool()
async def get_candidate_sources(
    evidence_ids: list[str], plan_id: str, run_id: str,
    scope_assertion: str | None = None,
) -> dict[str, Any]:
    """Retrieve compact details only for evidence issued in this Plan/run."""
    del scope_assertion
    context = require_tool_context(plan_id=plan_id)
    if not run_id:
        raise AuthenticationError("invalid research scope")
    now = int(time.time())
    registry = _read_registry()
    requested = [str(item).strip() for item in evidence_ids if re.fullmatch(r"[A-Za-z0-9_-]{1,180}", str(item).strip())][:MAX_SOURCES]
    evidence: list[dict[str, Any]] = []
    for evidence_id in requested:
        item = registry.get(evidence_id)
        if not item or item.get("subject") != context.subject or item.get("plan_id") != plan_id or item.get("run_id") != run_id or int(item.get("expires_at", 0)) <= now:
            continue
        evidence.append({"evidence_id": evidence_id, "title": item["title"], "url": item["url"], "retrieved_at": item["retrieved_at"], "excerpt": item["excerpt"], "attribution": item["attribution"]})
    return {"status": "ready", "plan_id": plan_id, "run_id": run_id, "evidence": evidence, "requested_ids": requested}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(authenticated_mcp_app(research_mcp), host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
