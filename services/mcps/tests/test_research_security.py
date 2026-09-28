from __future__ import annotations

import asyncio
import json

import pytest

from services.mcps import research_server
from services.mcps.transport import ToolAuthContext, authenticated_context


def test_source_lookup_is_tenant_and_run_scoped(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("MCP_EVIDENCE_REGISTRY_PATH", str(tmp_path / "evidence.json"))
    research_server._write_registry({"evidence-1": {"subject": "actor-1", "plan_id": "plan-1", "run_id": "run-1", "title": "Kyoto", "url": "https://example.test", "excerpt": "safe", "retrieved_at": "now", "expires_at": 9999999999, "attribution": "Tavily search"}})
    with authenticated_context(ToolAuthContext("actor-1", "plan-1", "assertion")):
        result = asyncio.run(research_server.get_candidate_sources(["evidence-1", "https://attacker.test"], "actor-1", "plan-1", "run-1"))
    assert len(result["evidence"]) == 1
    assert "https://attacker.test" not in json.dumps(result)


def test_source_lookup_does_not_return_expired_evidence(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("MCP_EVIDENCE_REGISTRY_PATH", str(tmp_path / "evidence.json"))
    research_server._write_registry({"expired": {"subject": "actor-1", "plan_id": "plan-1", "run_id": "run-1", "title": "old", "url": "https://example.test", "excerpt": "old", "retrieved_at": "old", "expires_at": 1, "attribution": "Tavily search"}})
    with authenticated_context(ToolAuthContext("actor-1", "plan-1", "assertion")):
        result = asyncio.run(research_server.get_candidate_sources(["expired"], "actor-1", "plan-1", "run-1"))
    assert result["evidence"] == []
