"""AgentCore Gateway REQUEST interceptor contract.

This module is intentionally framework-neutral: the deployed Gateway adapter
can map its request object to :class:`GatewayRequest`.  It never trusts a
traveler or Plan supplied in tool arguments.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Callable, Mapping
from urllib.request import Request, urlopen

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
        plan_owner: Callable[..., bool],
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
        params = request.body.get("params")
        if not isinstance(params, Mapping) or params.get("name") is None:
            raise AuthenticationError("invalid tool arguments")
        arguments = params.get("arguments")
        if not isinstance(arguments, Mapping):
            raise AuthenticationError("invalid tool arguments")
        plan_id = str(arguments.get("plan_id") or "").strip()
        token = str((request.headers.get("authorization") or request.headers.get("Authorization"))[7:]).strip()
        try:
            owned = self.plan_owner(str(claims["sub"]), plan_id, token)
        except TypeError:
            owned = self.plan_owner(str(claims["sub"]), plan_id)
        if not plan_id or not owned:
            raise AuthenticationError("Plan is not owned by traveler")
        assertion = issue_scope_assertion(str(claims["sub"]), plan_id)
        transformed_arguments = dict(arguments)
        transformed_arguments.pop("traveler_scope", None)
        transformed_arguments["__travella_scope_assertion"] = assertion
        transformed_arguments["traveler_scope"] = str(claims["sub"])
        result = dict(request.body)
        result["params"] = dict(params)
        result["params"]["arguments"] = transformed_arguments
        return GatewayDecision(True, result)


def intercept_request(interceptor: GatewayRequestInterceptor, request: GatewayRequest) -> GatewayDecision:
    try:
        return interceptor.intercept(request)
    except AuthenticationError as exc:
        return GatewayDecision(False, {"error": str(exc)}, 403)


def request_from_agentcore_event(event: Mapping[str, Any]) -> GatewayRequest:
    """Adapt AgentCore's documented MCP interceptor event to the local contract."""
    if event.get("interceptorInputVersion") != "1.0":
        raise AuthenticationError("unsupported interceptor input version")
    gateway = event.get("mcp", {}).get("gatewayRequest") if isinstance(event.get("mcp"), Mapping) else None
    if not isinstance(gateway, Mapping) or not isinstance(gateway.get("body"), Mapping):
        raise AuthenticationError("malformed AgentCore MCP request")
    return GatewayRequest(
        str(gateway.get("httpMethod") or "POST"),
        gateway.get("headers", {}) if isinstance(gateway.get("headers", {}), Mapping) else {},
        gateway["body"],
        pass_request_headers="headers" in gateway,
    )


def agentcore_response(decision: GatewayDecision) -> dict[str, Any]:
    """Wrap a transformed request in AgentCore's documented MCP output envelope."""
    if not decision.allowed:
        return {
            "interceptorOutputVersion": "1.0",
            "mcp": {"transformedGatewayResponse": {"statusCode": decision.status_code, "body": decision.body}},
        }
    return {"interceptorOutputVersion": "1.0", "mcp": {"transformedGatewayRequest": {"body": decision.body}}}


def lambda_handler(event: Mapping[str, Any], _context: object = None) -> dict[str, Any]:
    """AgentCore REQUEST interceptor entry point for a configured deployment."""
    try:
        request = request_from_agentcore_event(event)
        jwt_key = os.getenv("COGNITO_JWT_KEY", "")
        issuer = os.getenv("COGNITO_ISSUER", "")
        client_id = os.getenv("COGNITO_CLIENT_ID", "")
        if not jwt_key or not issuer or not client_id:
            raise AuthenticationError("interceptor authentication is not configured")
        crud_url = os.getenv("CRUD_PRIVATE_URL", "").rstrip("/")
        if not crud_url:
            raise AuthenticationError("private CRUD ownership reader is not configured")

        def plan_owner(subject: str, plan_id: str, token: str) -> bool:
            request = Request(f"{crud_url}/v1/plans/{plan_id}", headers={"Authorization": f"Bearer {token}", "X-Travella-Subject": subject})
            try:
                with urlopen(request, timeout=5) as response:
                    if response.status != 200:
                        return False
                    data = json.loads(response.read().decode("utf-8"))
                    return data.get("lifecycle") == "active"
            except Exception:
                return False

        interceptor = GatewayRequestInterceptor(
            jwt_key=jwt_key,
            issuer=issuer,
            client_id=client_id,
            plan_owner=plan_owner,
        )
        return agentcore_response(intercept_request(interceptor, request))
    except AuthenticationError as exc:
        return agentcore_response(GatewayDecision(False, {"error": str(exc)}, 403))
