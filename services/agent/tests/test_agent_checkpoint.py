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
