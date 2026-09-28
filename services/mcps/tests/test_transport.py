from __future__ import annotations

import time

import pytest

from services.mcps.gateway_interceptor import GatewayRequest, GatewayRequestInterceptor
from services.mcps.transport import (
    AuthenticationError,
    authenticate_tool_call,
    issue_scope_assertion,
    verify_scope_assertion,
)


def test_direct_target_call_requires_service_token_and_signed_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    monkeypatch.setenv("MCP_GATEWAY_SERVICE_TOKEN", "gateway-token")
    assertion = issue_scope_assertion("actor-1", "plan-1")
    context = authenticate_tool_call({"Authorization": "Bearer gateway-token"}, assertion=assertion, plan_id="plan-1")
    assert context.subject == "actor-1"
    with pytest.raises(AuthenticationError):
        authenticate_tool_call({}, assertion=assertion, plan_id="plan-1")


def test_expired_or_foreign_assertion_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    assertion = issue_scope_assertion("actor-1", "plan-1", ttl_seconds=1)
    monkeypatch.setattr(time, "time", lambda: 100000000)
    with pytest.raises(AuthenticationError):
        verify_scope_assertion(assertion, subject="actor-2")


def test_gateway_removes_spoofed_scope_and_injects_assertion(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_ASSERTION_SIGNING_SECRET", "secret")
    import jwt

    token = jwt.encode({"sub": "actor-1", "iss": "issuer", "aud": "client", "client_id": "client", "token_use": "access", "scope": "travella/agent", "iat": int(time.time()), "exp": int(time.time()) + 60}, "jwt-secret", algorithm="HS256")
    interceptor = GatewayRequestInterceptor(jwt_key="jwt-secret", issuer="issuer", client_id="client", plan_owner=lambda subject, plan: subject == "actor-1" and plan == "plan-1")
    decision = interceptor.intercept(GatewayRequest("tools/call", {"Authorization": f"Bearer {token}"}, {"method": "tools/call", "params": {"plan_id": "plan-1", "traveler_scope": "attacker"}}))
    params = decision.body["params"]
    assert params["traveler_scope"] == "actor-1"
    assert params["__travella_scope_assertion"]


def test_tools_list_does_not_require_traveler_assertion() -> None:
    interceptor = GatewayRequestInterceptor(jwt_key="unused", issuer="issuer", client_id="client", plan_owner=lambda *_: False)
    decision = interceptor.intercept(GatewayRequest("tools/list", {}, {"method": "tools/list"}, pass_request_headers=False))
    assert decision.allowed is True
