"""PostgreSQL-backed LangGraph checkpoint wiring and safe state boundaries."""

from __future__ import annotations

import hashlib
import json
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

CHECKPOINT_SCHEMA_VERSION = 1
_SECRET_KEYS = {"authorization_token", "access_token", "api_key", "token", "raw_payload", "raw_html"}


def thread_id(traveler_scope: str, plan_id: str) -> str:
    """Derive a stable opaque thread key from verified identity and Plan."""
    return hashlib.sha256(f"{traveler_scope}:{plan_id}".encode()).hexdigest()


def safe_checkpoint_state(state: dict[str, Any]) -> dict[str, Any]:
    """Allowlist compact graph state; credentials/provider payloads never persist."""
    allowed = {"traveler_scope", "plan_id", "plan_revision", "event_id", "generation", "message", "status", "question", "candidates", "evidence", "run_id", "error", "projection", "research_state", "assistant_text", "turn_decision"}
    output = {key: value for key, value in state.items() if key in allowed and key not in _SECRET_KEYS}
    output["checkpoint_schema_version"] = CHECKPOINT_SCHEMA_VERSION
    encoded = json.dumps(output, ensure_ascii=False, default=str)
    if len(encoded) > 50000:
        raise ValueError("checkpoint state exceeds bounded size")
    return output


@asynccontextmanager
async def postgres_checkpointer(database_url: str | None = None) -> AsyncIterator[AsyncPostgresSaver]:
    """Open the agent-owned saver. Setup is explicit and fails closed."""
    dsn = database_url or os.getenv("AGENT_CHECKPOINT_DATABASE_URL")
    if not dsn:
        raise RuntimeError("AGENT_CHECKPOINT_DATABASE_URL is required")
    async with AsyncPostgresSaver.from_conn_string(dsn) as saver:
        await saver.setup()
        yield saver


def checkpoint_config(traveler_scope: str, plan_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id(traveler_scope, plan_id)}}
