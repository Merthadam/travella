"""Independent access-token boundary for the CRUD service."""

from collections.abc import Callable

from fastapi import Header, HTTPException

from services.auth.contracts import ValidatedIdentity


def bearer_identity(
    verifier: Callable[[str], ValidatedIdentity], authorization: str | None
) -> ValidatedIdentity:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign-in required.")
    try:
        return verifier(authorization[7:])
    except Exception as exc:
        raise HTTPException(401, "Sign-in required.") from exc


def identity_dependency(verifier: Callable[[str], ValidatedIdentity]):
    def dependency(authorization: str | None = Header(default=None)) -> ValidatedIdentity:
        return bearer_identity(verifier, authorization)

    return dependency
