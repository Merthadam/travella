"""Shared authorization primitives for public services."""

from .contracts import AuthProblem, ValidatedIdentity


def traveler_key(identity: ValidatedIdentity) -> str:
    """Return the only supported durable-data owner key."""
    if not identity.subject:
        raise AuthProblem("unauthenticated", "Sign-in required.")
    return identity.subject


def require_owner(identity: ValidatedIdentity, owner_subject: str) -> str:
    """Authorize a resource using the verified token subject, never browser input."""
    if traveler_key(identity) != owner_subject:
        # Callers should map this to a non-disclosing 404/403 at their boundary.
        raise AuthProblem("not_found", "Resource not found.")
    return owner_subject
