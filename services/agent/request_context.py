"""Ephemeral per-request values that must stay outside LangGraph state."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from contextvars import ContextVar, Token
from typing import Any

from services.shared.traveler_profile import profile_context

_AUTHORIZATION_TOKEN: ContextVar[str | None] = ContextVar(
    "travella_agent_authorization_token", default=None
)
_TEXT_DELTA_CALLBACK: ContextVar[Callable[[str], Any] | None] = ContextVar(
    "travella_agent_text_delta_callback", default=None
)
_TRAVELER_PROFILE: ContextVar[dict[str, Any] | None] = ContextVar(
    "travella_agent_traveler_profile", default=None
)


def current_traveler_profile() -> dict[str, Any]:
    """Return ephemeral verified profile context without checkpointing it."""
    return dict(_TRAVELER_PROFILE.get() or {})


def bind_traveler_profile(value: dict[str, Any] | None) -> Token[dict[str, Any] | None]:
    return _TRAVELER_PROFILE.set(profile_context(value or {}))


def reset_traveler_profile(context_token: Token[dict[str, Any] | None]) -> None:
    _TRAVELER_PROFILE.reset(context_token)


def current_authorization_token() -> str | None:
    """Return the verified token for this request without checkpointing it."""
    return _AUTHORIZATION_TOKEN.get()


def bind_authorization_token(value: str | None) -> Token[str | None]:
    """Bind a verified token to the current async request context."""
    return _AUTHORIZATION_TOKEN.set(value)


def reset_authorization_token(context_token: Token[str | None]) -> None:
    """Restore the previous async request context after graph execution."""
    _AUTHORIZATION_TOKEN.reset(context_token)


def current_text_delta_callback() -> Callable[[str], Any] | None:
    """Return the request-local text sink without adding it to graph state."""
    return _TEXT_DELTA_CALLBACK.get()


def bind_text_delta_callback(value: Callable[[str], Any] | None) -> Token[Callable[[str], Any] | None]:
    return _TEXT_DELTA_CALLBACK.set(value)


def reset_text_delta_callback(context_token: Token[Callable[[str], Any] | None]) -> None:
    _TEXT_DELTA_CALLBACK.reset(context_token)


async def emit_text_delta(value: str) -> None:
    callback = current_text_delta_callback()
    if callback is None or not value:
        return
    result = callback(value)
    if isinstance(result, Awaitable):
        await result


_CANVAS_CALLBACK: ContextVar[Callable[[dict], Any] | None] = ContextVar(
    "travella_canvas_callback", default=None
)

def bind_canvas_callback(value):
    return _CANVAS_CALLBACK.set(value)

def reset_canvas_callback(token):
    _CANVAS_CALLBACK.reset(token)

async def emit_canvas_draft(value: dict) -> None:
    callback = _CANVAS_CALLBACK.get()
    if callback is not None:
        result = callback(value)
        if isinstance(result, Awaitable):
            await result
