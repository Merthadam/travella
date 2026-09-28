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
from typing import Iterator, Mapping


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


def verify_service_credential(headers: Mapping[str, str]) -> None:
    expected = os.getenv("MCP_GATEWAY_SERVICE_TOKEN")
    authorization = headers.get("authorization") or headers.get("Authorization")
    if not expected or not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("invalid Gateway service credential")
    supplied = authorization[7:].strip()
    if not hmac.compare_digest(supplied, expected):
        raise AuthenticationError("invalid Gateway service credential")


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
