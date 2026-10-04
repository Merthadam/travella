"""PostgreSQL-backed LangGraph checkpoint wiring and safe state boundaries."""

from __future__ import annotations

import hashlib
import json
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncIterator
from urllib.parse import urlsplit, urlunsplit

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

CHECKPOINT_SCHEMA_VERSION = 2
_SECRET_KEYS = {"authorization_token", "access_token", "api_key", "token", "raw_payload", "raw_html"}
_REUSE_FIELDS = (
    "evidence_id", "title", "url", "publisher", "domain", "read_status",
    "fact_type", "retrieved_at", "valid_until", "excerpt",
)
_MAX_REUSE_ENTRIES = 6
_MAX_EXCERPT_CHARS = 1200


def thread_id(traveler_scope: str, plan_id: str) -> str:
    """Derive a stable opaque thread key from verified identity and Plan."""
    return hashlib.sha256(f"{traveler_scope}:{plan_id}".encode()).hexdigest()


def safe_checkpoint_state(state: dict[str, Any]) -> dict[str, Any]:
    """Allowlist compact graph state; raw research evidence never persists."""
    allowed = {"traveler_scope", "plan_id", "plan_revision", "event_id", "generation", "message", "status", "question", "candidates", "run_id", "error", "projection", "research_state", "assistant_text", "turn_decision"}
    output = {key: value for key, value in state.items() if key in allowed and key not in _SECRET_KEYS}
    output.pop("research_state", None)
    research_state = state.get("research_state")
    plan_id = state.get("plan_id")
    if isinstance(research_state, dict) and isinstance(plan_id, str):
        entries = research_state.get("evidence", [])
        safe_entries = []
        if isinstance(entries, list):
            for entry in entries:
                if not isinstance(entry, dict) or entry.get("plan_id") != plan_id or entry.get("read_status") != "read":
                    continue
                url = entry.get("url")
                if not isinstance(url, str) or len(url) > 2048:
                    continue
                parsed = urlsplit(url)
                if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                    continue
                if any(character.isspace() or ord(character) < 32 for character in url):
                    continue
                try:
                    _ = parsed.port
                    datetime.fromisoformat(str(entry.get("retrieved_at", "")).replace("Z", "+00:00"))
                    datetime.fromisoformat(str(entry.get("valid_until", "")).replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    continue
                if not re.fullmatch(r"[A-Za-z0-9_-]{1,180}", str(entry.get("evidence_id", ""))):
                    continue
                if entry.get("fact_type") not in {"stable", "rules_schedule", "live"}:
                    continue
                safe_entry = {}
                for key in _REUSE_FIELDS:
                    value = entry.get(key)
                    if not isinstance(value, str):
                        continue
                    limit = _MAX_EXCERPT_CHARS if key == "excerpt" else (2048 if key == "url" else 180)
                    safe_entry[key] = (urlunsplit(("https", parsed.netloc.lower(), parsed.path, parsed.query, "")) if key == "url" else " ".join(value.split()))[:limit]
                required = ("evidence_id", "url", "fact_type", "retrieved_at", "valid_until", "excerpt")
                if all(safe_entry.get(key) for key in required):
                    safe_entry["plan_id"] = plan_id
                    safe_entries.append(safe_entry)
                if len(safe_entries) == _MAX_REUSE_ENTRIES:
                    break
        output["research_state"] = {"schema_version": CHECKPOINT_SCHEMA_VERSION, "plan_id": plan_id, "evidence": safe_entries}
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
