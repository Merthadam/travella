"""Independent access-token boundary for the CRUD service."""

from collections.abc import Callable

from fastapi import Header, HTTPException

from services.auth.contracts import ValidatedIdentity

DEFAULT_SCOPE = "aws.cognito.signin.user.admin"


def bearer_identity(
    verifier: Callable[[str], ValidatedIdentity],
    authorization: str | None,
    *,
    required_scope: str = DEFAULT_SCOPE,
) -> ValidatedIdentity:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign-in required.")
    try:
        identity = verifier(authorization[7:])
        if required_scope not in identity.scopes:
            raise ValueError("missing scope")
        return identity
    except Exception as exc:
        raise HTTPException(401, "Sign-in required.") from exc


def identity_dependency(verifier, *, required_scope=DEFAULT_SCOPE):
    def dependency(authorization: str | None = Header(default=None)) -> ValidatedIdentity:
        return bearer_identity(verifier, authorization, required_scope=required_scope)

    return dependency
