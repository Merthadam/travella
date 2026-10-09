import asyncio
import pytest
from services.mcps.travel_server import travel_search
from services.mcps.transport import AuthenticationError, ToolAuthContext, authenticated_context


def test_scope_required_before_provider_call(monkeypatch):
    def fail(*a, **kw):
        raise AssertionError("Provider must not run")

    monkeypatch.setattr("services.mcps.travel_server.LiteApi", fail)
    with pytest.raises(AuthenticationError):
        asyncio.run(travel_search("capabilities", {}, "plan-1"))
    with authenticated_context(ToolAuthContext("actor-1", "plan-1", "assertion")):
        with pytest.raises(AuthenticationError):
            asyncio.run(travel_search("capabilities", {}, "plan-other"))
