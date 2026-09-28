"""Tavily-backed destination research MCP server.

The server returns compact, citation-bearing candidate projections. Raw Tavily
responses never leave this private boundary.
"""

from __future__ import annotations

import httpx
from mcp.server.fastmcp import FastMCP

from .config import McpSettings, required_secret

MAX_CANDIDATES = 5
TAVILY_SEARCH_URL = "https://api.tavily.com/search"

research_mcp = FastMCP("travella-research-mcp")


def _candidate_projection(result: dict, rank: int) -> dict:
    title = str(result.get("title") or "Untitled source").strip()
    url = str(result.get("url") or "").strip()
    content = " ".join(str(result.get("content") or "").split())
    return {
        "candidate_id": f"research-{rank}",
        "name": title,
        "confidence": "possible fit",
        "fit_summary": content[:420],
        "caveats": [],
        "evidence": [{"evidence_id": f"source-{rank}", "url": url, "title": title}]
        if url
        else [],
    }


@research_mcp.tool()
async def research_destination_candidates(
    theme: str,
    traveler_scope: str,
    plan_id: str,
    max_candidates: int = 5,
) -> dict:
    """Find up to five destination candidates for a Plan-scoped travel theme.

    Results are temporary research projections. This tool never writes Plan or
    destination records, and the traveler must explicitly confirm any choice.
    """
    del traveler_scope  # Scope fields are carried for the agent auth boundary.
    query = " ".join(theme.split()).strip()
    if not query or len(query) > 500:
        raise ValueError("theme must contain between 1 and 500 characters")
    limit = min(MAX_CANDIDATES, max(1, max_candidates))
    settings = McpSettings.from_env()
    api_key = required_secret(settings.tavily_api_key, "TAVILY_API_KEY")
    payload = {
        "api_key": api_key,
        "query": f"best travel destinations for {query}",
        "topic": "general",
        "search_depth": "advanced",
        "max_results": limit,
        "include_answer": False,
        "include_raw_content": False,
    }
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.post(TAVILY_SEARCH_URL, json=payload)
        response.raise_for_status()
        data = response.json()
    results = data.get("results") if isinstance(data, dict) else []
    candidates = [
        _candidate_projection(result, index)
        for index, result in enumerate(results[:limit], start=1)
        if isinstance(result, dict)
    ]
    return {
        "status": "ready",
        "plan_id": plan_id,
        "run_id": f"tavily-{abs(hash(query))}",
        "candidates": candidates,
    }


@research_mcp.tool()
async def get_candidate_sources(evidence_ids: list[str], traveler_scope: str) -> dict:
    """Return the allow-listed source references requested by the agent.

    Source retrieval is intentionally a contract stub until the graph owns the
    short-lived evidence registry; arbitrary URLs are never fetched here.
    """
    del traveler_scope
    clean_ids = [item.strip() for item in evidence_ids if item.strip()][:10]
    return {"status": "not_ready", "evidence": [], "requested_ids": clean_ids}


if __name__ == "__main__":
    research_mcp.run(transport="streamable-http")
