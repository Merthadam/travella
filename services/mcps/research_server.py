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
from .transport import AuthenticationError, require_tool_context

MAX_CANDIDATES = 5
MAX_SOURCES = 10
MAX_EXCERPT = 700
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


def _destination_name(title: str, content: str) -> str:
    name = re.split(r"\s+[|–—-]\s+", title, maxsplit=1)[0].strip()
    return _clean_text(name, 120) or _clean_text(content, 120)


def _run_id(plan_id: str, query: str, request_id: str | None) -> str:
    seed = f"{plan_id}:{request_id or query}".encode()
    return f"research-{hashlib.sha256(seed).hexdigest()[:20]}"


def _candidate_projection(result: dict[str, Any], rank: int, *, run_id: str) -> dict[str, Any] | None:
    title = _clean_text(result.get("title"), 180)
    url = _canonical_url(result.get("url"))
    content = _clean_text(result.get("content"))
    name = _destination_name(title, content)
    if not name or not url:
        return None
    evidence_id = f"{run_id}-source-{rank}"
    return {
        "candidate_id": f"{run_id}-candidate-{rank}",
        "name": name,
        "status": "shortlisted",
        "confidence": "possible fit",
        "fit_summary": content[:420],
        "caveats": ["Evidence is based on a bounded web research pass."],
        "evidence": [{"evidence_id": evidence_id, "title": title, "url": url}],
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
    theme: str, traveler_scope: str, plan_id: str, max_candidates: int = MAX_CANDIDATES,
    request_id: str | None = None, scope_assertion: str | None = None,
) -> dict[str, Any]:
    """Find up to five cited destination candidates for one Plan intent."""
    del scope_assertion
    context = require_tool_context(plan_id=plan_id)
    if traveler_scope != context.subject:
        raise AuthenticationError("traveler_scope is controlled by the Gateway")
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
    seen: set[str] = set()
    for result in results:
        if not isinstance(result, dict):
            continue
        candidate = _candidate_projection(result, len(candidates) + 1, run_id=run_id)
        if candidate and candidate["name"].casefold() not in seen:
            seen.add(candidate["name"].casefold())
            candidates.append(candidate)
        if len(candidates) == limit:
            break
    _save_evidence(run_id, context.subject, plan_id, candidates)
    return {"status": "ready", "plan_id": plan_id, "run_id": run_id, "candidates": candidates}


@research_mcp.tool()
async def get_candidate_sources(
    evidence_ids: list[str], traveler_scope: str, plan_id: str, run_id: str,
    scope_assertion: str | None = None,
) -> dict[str, Any]:
    """Retrieve compact details only for evidence issued in this Plan/run."""
    del scope_assertion
    context = require_tool_context(plan_id=plan_id)
    if traveler_scope != context.subject or not run_id:
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
    research_mcp.run(transport="streamable-http")
