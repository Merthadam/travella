"""Projection and maintenance telemetry redaction checks."""

from datetime import datetime, timezone

from services.crud.purge import purge_expired
from services.crud.repository import PlanRepository
from services.crud.schemas import PlanOutput


def test_purge_result_cannot_contain_private_fields(db_session):
    metrics = purge_expired(db_session, database_now=datetime.now(timezone.utc))
    serialized = repr(metrics) + str(metrics.__dict__)
    for secret in ("traveler", "email", "token", "conversation", "payload", "reasoning"):
        assert secret not in serialized.lower()


def test_repository_projection_has_no_raw_payload_or_credentials(db_session):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    repo = PlanRepository(db_session, clock=lambda: now)
    plan = repo.create("subject-private", "1767225600000.00000000-0000-0000-0000-000000000005")
    projection = PlanOutput.from_ref(plan).model_dump()
    assert "traveler_subject" not in projection
    assert "access_token" not in projection and "email" not in projection
    assert "raw_payload" not in projection and "reasoning" not in projection
