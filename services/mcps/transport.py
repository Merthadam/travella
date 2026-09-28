"""Authentication primitives shared by the private MCP target servers.

The Gateway is the only component allowed to create an assertion.  Target
servers still verify both the Gateway service credential and the assertion so a
direct request cannot turn an untrusted tool argument into authorization.
"""

from __future__ import annotations

import base64
import contextlib
import contextvars
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Iterator, Mapping

import jwt


class AuthenticationError(ValueError):
    """Raised when an MCP request cannot be authenticated and scoped."""


@dataclass(frozen=True)
class ScopeAssertion:
    subject: str
    plan_id: str
    audience: str
    expires_at: int
    token_id: str


@dataclass(frozen=True)
class ToolAuthContext:
    subject: str
    plan_id: str
    assertion: str


_AUTH_CONTEXT: contextvars.ContextVar[ToolAuthContext | None] = contextvars.ContextVar(
    "travella_mcp_auth_context", default=None
)


def _secret() -> bytes:
    value = os.getenv("MCP_ASSERTION_SIGNING_SECRET")
    if not value:
        raise AuthenticationError("MCP assertion signing is not configured")
    return value.encode("utf-8")


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_scope_assertion(subject: str, plan_id: str, *, ttl_seconds: int = 60, token_id: str | None = None) -> str:
    if not subject or not plan_id or ttl_seconds < 1 or ttl_seconds > 300:
        raise AuthenticationError("invalid scope assertion inputs")
    now = int(time.time())
    payload = {
        "sub": subject,
        "plan": plan_id,
        "aud": os.getenv("MCP_ASSERTION_AUDIENCE", "travella-mcp"),
        "exp": now + ttl_seconds,
        "iat": now,
        "jti": token_id or _b64(os.urandom(12)),
    }
    encoded = _b64(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = hmac.new(_secret(), encoded.encode(), hashlib.sha256).digest()
    return f"{encoded}.{_b64(signature)}"


def verify_scope_assertion(assertion: str, *, subject: str | None = None, plan_id: str | None = None) -> ScopeAssertion:
    try:
        encoded, provided = assertion.split(".", 1)
        expected = hmac.new(_secret(), encoded.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(provided)):
            raise AuthenticationError("invalid scope assertion")
        payload = json.loads(_unb64(encoded))
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeError) as exc:
        raise AuthenticationError("invalid scope assertion") from exc
    now = int(time.time())
    if not isinstance(payload, dict) or int(payload.get("exp", 0)) <= now:
        raise AuthenticationError("expired scope assertion")
    audience = os.getenv("MCP_ASSERTION_AUDIENCE", "travella-mcp")
    if payload.get("aud") != audience or not payload.get("sub") or not payload.get("plan"):
        raise AuthenticationError("invalid scope assertion")
    if subject is not None and payload["sub"] != subject:
        raise AuthenticationError("scope subject mismatch")
    if plan_id is not None and payload["plan"] != plan_id:
        raise AuthenticationError("scope Plan mismatch")
    return ScopeAssertion(payload["sub"], payload["plan"], audience, int(payload["exp"]), payload["jti"])


def _oauth_claims(headers: Mapping[str, str]) -> dict[str, Any]:
    authorization = headers.get("authorization") or headers.get("Authorization")
    issuer = os.getenv("MCP_GATEWAY_OAUTH_ISSUER")
    audience = os.getenv("MCP_GATEWAY_OAUTH_AUDIENCE")
    client_id = os.getenv("MCP_GATEWAY_OAUTH_CLIENT_ID")
    required_scope = os.getenv("MCP_GATEWAY_OAUTH_SCOPE", "travella.mcp")
    key = os.getenv("MCP_GATEWAY_OAUTH_JWT_KEY")
    jwks_url = os.getenv("MCP_GATEWAY_OAUTH_JWKS_URL")
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("invalid Gateway service credential")
    if not issuer or not audience or not client_id or not (key or jwks_url):
        raise AuthenticationError("Gateway OAuth target authentication is not configured")
    token = authorization[7:].strip()
    try:
        signing_key: Any = key
        if not signing_key:
            signing_key = jwt.PyJWKClient(jwks_url, timeout=5).get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "HS256"],
            issuer=issuer,
            audience=audience,
            options={"require": ["exp", "iat", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationError("invalid Gateway service credential") from exc
    supplied_client = claims.get("client_id") or claims.get("azp")
    if supplied_client != client_id or required_scope not in set(str(claims.get("scope", "")).split()):
        raise AuthenticationError("invalid Gateway service credential")
    return claims


def verify_service_credential(headers: Mapping[str, str]) -> dict[str, Any]:
    """Verify the Gateway's OAuth client-credentials token at the target."""
    return _oauth_claims(headers)


def authenticate_tool_call(headers: Mapping[str, str], *, assertion: str, plan_id: str) -> ToolAuthContext:
    verify_service_credential(headers)
    scope = verify_scope_assertion(assertion, plan_id=plan_id)
    return ToolAuthContext(scope.subject, scope.plan_id, assertion)


@contextlib.contextmanager
def authenticated_context(context: ToolAuthContext) -> Iterator[None]:
    token = _AUTH_CONTEXT.set(context)
    try:
        yield
    finally:
        _AUTH_CONTEXT.reset(token)


def require_tool_context(*, plan_id: str | None = None) -> ToolAuthContext:
    context = _AUTH_CONTEXT.get()
    if context is None:
        raise AuthenticationError("MCP tools require an authenticated Gateway request")
    if plan_id is not None and context.plan_id != plan_id:
        raise AuthenticationError("scope Plan mismatch")
    return context


def signed_assertion_from_headers(headers: Mapping[str, str], *, assertion: str, plan_id: str) -> ToolAuthContext:
    """Target-side entry point used by an HTTP adapter before dispatch."""
    return authenticate_tool_call(headers, assertion=assertion, plan_id=plan_id)


async def dispatch_authenticated_tool(
    tool: object,
    *,
    headers: Mapping[str, str],
    assertion: str,
    plan_id: str,
    arguments: Mapping[str, object],
) -> object:
    """Validate the Gateway envelope, then invoke a FastMCP tool function.

    HTTP adapters should use this boundary rather than calling the decorated
    function directly.  The assertion and service token are never forwarded
    to provider clients or returned to the model.
    """
    context = authenticate_tool_call(headers, assertion=assertion, plan_id=plan_id)
    if not callable(tool):
        raise AuthenticationError("invalid MCP tool")
    with authenticated_context(context):
        return await tool(**dict(arguments))


def _jsonrpc_error(request_id: object, message: str, *, code: int = -32001) -> dict[str, object]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


class AuthenticatedMcpASGI:
    """Authenticate the real FastMCP Streamable HTTP route before dispatch."""

    def __init__(self, app: Callable[..., Awaitable[None]], *, path: str = "/mcp") -> None:
        self.app = app
        self.path = path

    async def __call__(self, scope: dict[str, Any], receive: Callable[..., Awaitable[dict[str, Any]]], send: Callable[..., Awaitable[None]]) -> None:
        if scope.get("type") != "http" or scope.get("path") != self.path or scope.get("method") != "POST":
            await self.app(scope, receive, send)
            return
        headers = {key.decode("latin-1"): value.decode("latin-1") for key, value in scope.get("headers", [])}
        chunks: list[bytes] = []
        more = True
        while more:
            message = await receive()
            chunks.append(message.get("body", b""))
            more = bool(message.get("more_body"))
        body: object = None
        try:
            body = json.loads(b"".join(chunks))
            if not isinstance(body, dict) or body.get("jsonrpc") != "2.0" or "method" not in body:
                raise AuthenticationError("malformed MCP JSON-RPC envelope")
            method = body["method"]
            if method not in {"initialize", "tools/list", "tools/call"}:
                raise AuthenticationError("unsupported MCP operation")
            if method == "tools/call":
                params = body.get("params")
                if not isinstance(params, dict) or not isinstance(params.get("arguments"), dict):
                    raise AuthenticationError("malformed MCP tools/call envelope")
                arguments = dict(params["arguments"])
                plan_id = str(arguments.get("plan_id") or "").strip()
                assertion = str(arguments.get("__travella_scope_assertion") or "")
                if not plan_id or not assertion:
                    raise AuthenticationError("MCP tools/call requires Gateway scope")
                context = authenticate_tool_call(headers, assertion=assertion, plan_id=plan_id)
                arguments.pop("__travella_scope_assertion", None)
                arguments.pop("traveler_scope", None)
                params = dict(params)
                params["arguments"] = arguments
                body = dict(body)
                body["params"] = params
            else:
                verify_service_credential(headers)
                context = None
        except (AuthenticationError, json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
            response = json.dumps(_jsonrpc_error(body.get("id") if isinstance(body, dict) else None, "MCP request denied")).encode()
            await send({"type": "http.response.start", "status": 403, "headers": [(b"content-type", b"application/json")]})
            await send({"type": "http.response.body", "body": response})
            return

        async def replay() -> dict[str, Any]:
            sent = False
            async def next_message() -> dict[str, Any]:
                nonlocal sent
                if sent:
                    return {"type": "http.disconnect"}
                sent = True
                return {"type": "http.request", "body": json.dumps(body).encode(), "more_body": False}
            return await next_message()

        token = _AUTH_CONTEXT.set(context) if context is not None else None
        try:
            await self.app(scope, replay, send)
        finally:
            if token is not None:
                _AUTH_CONTEXT.reset(token)


def authenticated_mcp_app(mcp_server: Any) -> Any:
    """Build a mounted, authenticated ASGI app around a FastMCP instance."""
    return AuthenticatedMcpASGI(mcp_server.streamable_http_app())
