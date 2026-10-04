from services.agent.checkpoint import (
    CHECKPOINT_SCHEMA_VERSION,
    checkpoint_config,
    safe_checkpoint_state,
    thread_id,
)


def test_checkpoint_thread_is_scoped_and_state_is_secret_free():
    assert thread_id("traveler-1", "plan-1") != thread_id("traveler-2", "plan-1")
    state = safe_checkpoint_state({"plan_id": "plan-1", "authorization_token": "secret", "candidates": [{"candidate_id": "c-1"}]})
    assert state["checkpoint_schema_version"] == CHECKPOINT_SCHEMA_VERSION
    assert "authorization_token" not in state
    assert checkpoint_config("traveler-1", "plan-1")["configurable"]["thread_id"] == thread_id("traveler-1", "plan-1")


def test_checkpoint_persists_only_bounded_allowlisted_same_plan_evidence():
    entry = {
        "plan_id": "plan-1", "evidence_id": "e-1", "title": "Example", "url": "HTTPS://Example.com/path#fragment",
        "publisher": "Example publisher", "domain": "example.com", "read_status": "read",
        "fact_type": "stable", "retrieved_at": "2026-10-04T10:00:00Z", "valid_until": "2026-11-03T10:00:00Z",
        "excerpt": "  " + ("Useful fact. " * 200), "content": "RAW PAGE", "raw_payload": {"secret": "no"},
    }
    state = safe_checkpoint_state({
        "plan_id": "plan-1", "evidence": [{"content": "not allowed"}],
        "research_evidence": [{"content": "not allowed"}],
        "research_state": {"evidence": [entry, {**entry, "evidence_id": "foreign", "plan_id": "plan-2"}]},
        "reasoning": "private", "api_key": "secret",
    })
    assert "evidence" not in state and "research_evidence" not in state
    assert state["research_state"]["schema_version"] == CHECKPOINT_SCHEMA_VERSION
    assert len(state["research_state"]["evidence"]) == 1
    saved = state["research_state"]["evidence"][0]
    assert saved["url"] == "https://example.com/path"
    assert len(saved["excerpt"]) <= 1200
    assert "RAW PAGE" not in repr(state)
    assert "private" not in repr(state) and "secret" not in repr(state)
    assert len(str(state).encode()) < 50_000


def test_checkpoint_limits_reuse_entries_and_rejects_unread_or_invalid_sources():
    base = {
        "plan_id": "plan-1", "evidence_id": "e", "url": "https://example.com", "read_status": "read",
        "fact_type": "stable", "retrieved_at": "2026-10-04T10:00:00Z", "valid_until": "2026-11-03T10:00:00Z", "excerpt": "fact",
    }
    entries = [{**base, "evidence_id": str(i)} for i in range(8)]
    entries += [
        {**base, "evidence_id": "unread", "read_status": "unread"},
        {**base, "evidence_id": "bad-url", "url": "http://example.com"},
    ]
    state = safe_checkpoint_state({"plan_id": "plan-1", "research_state": {"evidence": entries}})
    saved = state["research_state"]["evidence"]
    assert len(saved) == 6
    assert [item["evidence_id"] for item in saved] == [str(i) for i in range(6)]


def test_checkpoint_rejects_oversized_serialized_state():
    import pytest

    with pytest.raises(ValueError, match="bounded size"):
        safe_checkpoint_state({"plan_id": "plan-1", "message": "x" * 50_000})
