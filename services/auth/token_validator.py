from collections.abc import Callable, Iterable
from typing import Any

from .contracts import AuthProblem, ValidatedIdentity


class TokenValidationError(ValueError):
    """Raised when an access token cannot be trusted."""


def validate_claims(
    claims: dict[str, Any],
    *,
    issuer: str,
    client_id: str,
    required_scopes: Iterable[str] = (),
    now: int,
) -> ValidatedIdentity:
    required = set(required_scopes)
    if claims.get("iss") != issuer:
        raise TokenValidationError("invalid issuer")
    if claims.get("token_use") != "access":
        raise TokenValidationError("invalid token use")
    if claims.get("client_id") != client_id:
        raise TokenValidationError("invalid client")
    subject = claims.get("sub")
    expires_at = claims.get("exp")
    issued_at = claims.get("iat")
    if not isinstance(subject, str) or not subject:
        raise TokenValidationError("missing subject")
    if type(expires_at) is not int or expires_at <= now:
        raise TokenValidationError("expired token")
    if type(issued_at) is not int or issued_at > now:
        raise TokenValidationError("missing issued-at")
    scope = claims.get("scope", "")
    if not isinstance(scope, str):
        raise TokenValidationError("invalid scope")
    scopes = frozenset(scope.split())
    if not required.issubset(scopes):
        raise TokenValidationError("missing scope")
    return ValidatedIdentity(subject, client_id, scopes, issued_at, expires_at)


def require_identity(
    raw_token: str | None,
    verifier: Callable[[str], dict[str, Any]],
    **validation: Any,
) -> ValidatedIdentity | AuthProblem:
    if not raw_token:
        return AuthProblem("unauthenticated", "Sign-in required.")
    try:
        claims = verifier(raw_token)
        return validate_claims(claims, **validation)
    except (TokenValidationError, ValueError, KeyError):
        return AuthProblem("unauthenticated", "Sign-in required.")
