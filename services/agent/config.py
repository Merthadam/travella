"""Bounded research-worker settings and private startup credential resolution."""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass, field
from typing import Any

import boto3
from botocore.config import Config


class ResearchConfigurationError(RuntimeError):
    """A configuration failure whose message contains no supplied values."""


def _api_key(value: object) -> str:
    # Validate shape only; provider authentication remains the provider's responsibility.
    if not isinstance(value, str) or not re.fullmatch(r"sk-ant-[A-Za-z0-9_-]{16,}", value):
        raise ResearchConfigurationError("A valid ANTHROPIC_API_KEY is required for research.")
    return value


def _resolve_key(secrets_client: Any = None) -> str:
    arn = os.getenv("ANTHROPIC_API_KEY_SECRET_ARN", "").strip()
    if not arn:
        return _api_key(os.getenv("ANTHROPIC_API_KEY", "").strip())
    match = re.fullmatch(
        r"arn:aws(?:-us-gov|-cn)?:secretsmanager:([a-z0-9-]+):\d{12}:secret:.+", arn
    )
    if not match:
        raise ResearchConfigurationError("ANTHROPIC_API_KEY_SECRET_ARN must be a secret ARN.")
    try:
        client = (
            secrets_client
            if secrets_client is not None
            else boto3.client(
                "secretsmanager",
                region_name=match.group(1),
                config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2}),
            )
        )
        value = client.get_secret_value(SecretId=arn)["SecretString"]
    except Exception:
        # AWS exceptions can contain request values; never chain them into startup logs.
        raise ResearchConfigurationError("Unable to load the configured research secret.") from None
    if isinstance(value, str) and value.startswith("sk-ant-"):
        return _api_key(value)
    try:
        payload = json.loads(value)
        if not isinstance(payload, dict):
            raise ValueError
        return _api_key(payload.get("ANTHROPIC_API_KEY"))
    except (ValueError, TypeError):
        raise ResearchConfigurationError(
            "Research secret must contain ANTHROPIC_API_KEY."
        ) from None


def _number(name: str, default: int | float, maximum: int | float) -> int | float:
    try:
        raw = os.getenv(name, "").strip()
        value = type(default)(raw) if raw else default
        if not math.isfinite(value) or not 0 < value <= maximum:
            raise ValueError
        return value
    except (ValueError, OverflowError):
        raise ResearchConfigurationError(
            f"{name} must be positive and at most {maximum}."
        ) from None


@dataclass(frozen=True)
class ResearchWorkerConfig:
    api_key: str = field(repr=False)
    model: str = "claude-sonnet-4-6"
    max_turns: int = 8
    timeout_seconds: float = 120
    max_budget_usd: float = 0.5
    max_searches: int = 3
    max_fetches: int = 6

    @classmethod
    def from_env(cls, *, secrets_client: Any = None) -> ResearchWorkerConfig:
        model = (os.getenv("AGENT_RESEARCH_MODEL", "").strip()
                 or os.getenv("ANTHROPIC_MODEL", "").strip() or "claude-sonnet-4-6")
        if not re.fullmatch(r"claude-[a-z0-9.-]+", model):
            raise ResearchConfigurationError("AGENT_RESEARCH_MODEL must name a Claude model.")
        return cls(
            api_key=_resolve_key(secrets_client),
            model=model,
            max_turns=_number("AGENT_RESEARCH_MAX_TURNS", 8, 32),
            timeout_seconds=_number("AGENT_RESEARCH_TIMEOUT_SECONDS", 120.0, 600),
            max_budget_usd=_number("AGENT_RESEARCH_MAX_BUDGET_USD", 0.5, 10),
            max_searches=_number("AGENT_RESEARCH_MAX_SEARCHES", 3, 10),
            max_fetches=_number("AGENT_RESEARCH_MAX_FETCHES", 6, 20),
        )
