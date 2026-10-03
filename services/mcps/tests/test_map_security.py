from __future__ import annotations

import asyncio

import pytest

from services.mcps import map_server
from services.mcps.transport import AuthenticationError, ToolAuthContext, authenticated_context


def test_map_rejects_spoofed_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "server-key")
    with authenticated_context(ToolAuthContext("actor-1", "plan-1", "assertion")):
        with pytest.raises(AuthenticationError):
            asyncio.run(map_server.resolve_candidate_locations(["Kyoto"], "attacker-plan"))
