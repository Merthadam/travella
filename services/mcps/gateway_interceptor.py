"""AgentCore Gateway REQUEST interceptor contract.

This module is intentionally framework-neutral: the deployed Gateway adapter
can map its request object to :class:`GatewayRequest`.  It never trusts a
traveler or Plan supplied in tool arguments.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Mapping

import jwt

from .transport import AuthenticationError, issue_scope_assertion


@dataclass(frozen=True)
class GatewayRequest:
    method: str
    headers: Mapping[str, str]
    body: Mapping[str, object]
    pass_request_headers: bool = True


@dataclass(frozen=True)
class GatewayDecision:
    allowed: bool
    body: dict[str, object]
    status_code: int = 200


class GatewayRequestInterceptor:
    def __init__(
        self,
        *,
        jwt_key: str | bytes,
        issuer: str,
        client_id: str,
        plan_owner: Callable[[str, str], bool],
        required_scope: str = "travella/agent",
    ) -> None:
        self.jwt_key = jwt_key
        self.issuer = issuer
        self.client_id = client_id
        self.plan_owner = plan_owner
        self.required_scope = required_scope

    def _claims(self, request: GatewayRequest) -> dict[str, object]:
        if not request.pass_request_headers:
            raise AuthenticationError("Gateway must explicitly pass Authorization headers")
        authorization = request.headers.get("authorization") or request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise AuthenticationError("missing Cognito access token")
        try:
            return jwt.decode(
                authorization[7:].strip(),
                self.jwt_key,
                algorithms=["RS256", "HS256"],
                issuer=self.issuer,
                options={"verify_aud": False, "require": ["exp", "iat", "sub", "iss", "client_id", "token_use"]},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("invalid Cognito access token") from exc

    def intercept(self, request: GatewayRequest) -> GatewayDecision:
        operation = request.body.get("method") or request.method
        if operation in {"tools/list", "initialize"}:
            return GatewayDecision(True, dict(request.body))
        if operation != "tools/call":
            return GatewayDecision(False, {"error": "unsupported MCP operation"}, 405)
        claims = self._claims(request)
        if claims.get("client_id") != self.client_id or claims.get("token_use") != "access":
            raise AuthenticationError("invalid Cognito access token")
        scope_values = set(str(claims.get("scope", "")).split())
        if self.required_scope not in scope_values:
            raise AuthenticationError("missing agent scope")
        arguments = request.body.get("params", {})
        if not isinstance(arguments, Mapping):
            raise AuthenticationError("invalid tool arguments")
        plan_id = str(arguments.get("plan_id") or "").strip()
        if not plan_id or not self.plan_owner(str(claims["sub"]), plan_id):
            raise AuthenticationError("Plan is not owned by traveler")
        assertion = issue_scope_assertion(str(claims["sub"]), plan_id)
        params = dict(arguments)
        params.pop("traveler_scope", None)
        params["__travella_scope_assertion"] = assertion
        params["traveler_scope"] = str(claims["sub"])
        result = dict(request.body)
        result["params"] = params
        return GatewayDecision(True, result)


def intercept_request(interceptor: GatewayRequestInterceptor, request: GatewayRequest) -> GatewayDecision:
    try:
        return interceptor.intercept(request)
    except AuthenticationError as exc:
        return GatewayDecision(False, {"error": str(exc)}, 403)
