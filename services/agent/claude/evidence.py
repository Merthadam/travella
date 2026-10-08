"""Shared read-evidence freshness envelope; volatile claims must be refreshed."""
from datetime import UTC, datetime, timedelta

from .research_result import ReadEvidence


def recent_evidence(items: list[dict]) -> list[dict]:
    result = []
    now = datetime.now(UTC)
    for item in items[:9]:
        try:
            evidence = ReadEvidence.model_validate({
                key: item[key] for key in ReadEvidence.model_fields if key in item
            })
            read_at = datetime.fromisoformat(evidence.retrieved_at.replace("Z", "+00:00"))
            if read_at.tzinfo and timedelta(0) <= now - read_at <= timedelta(days=30):
                result.append(evidence.model_dump())
        except (ValueError, TypeError, KeyError):
            continue
    return result

