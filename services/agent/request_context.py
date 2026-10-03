"""Ephemeral per-request values that must stay outside LangGraph state."""

from __future__ import annotations

from contextvars import ContextVar, Token

_AUTHORIZATION_TOKEN: ContextVar[str | None] = ContextVar(
    "travella_agent_authorization_token", default=None
)


def current_authorization_token() -> str | None:
    """Return the verified token for this request without checkpointing it."""
    return _AUTHORIZATION_TOKEN.get()


def bind_authorization_token(value: str | None) -> Token[str | None]:
    """Bind a verified token to the current async request context."""
    return _AUTHORIZATION_TOKEN.set(value)


def reset_authorization_token(context_token: Token[str | None]) -> None:
    """Restore the previous async request context after graph execution."""
    _AUTHORIZATION_TOKEN.reset(context_token)
