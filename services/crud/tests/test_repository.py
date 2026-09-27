from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from services.crud.models import (
    Conversation,
    Plan,
    PlanActionReceipt,
    PlanChallenge,
    PlanLifecycle,
    TitleSource,
)
from services.crud.repository import PlanRepository


def request_id(now: datetime) -> str:
    return f"{int(now.timestamp() * 1000)}.{uuid4()}"


def test_model_defaults_and_enums(db_session):
    now = datetime.now(timezone.utc)
    plan = Plan(traveler_subject="traveler-1", last_activity_at=now, created_at=now, updated_at=now)
    db_session.add(plan)
    db_session.flush()
    db_session.add(Conversation(plan_id=plan.id, created_at=now))
    db_session.commit()
    assert plan.lifecycle is PlanLifecycle.ACTIVE
    assert plan.title_source is TitleSource.AUTOMATIC
    assert plan.revision == 1
    assert plan.recovery_deadline is None


def test_conversation_is_one_to_one(db_session):
    now = datetime.now(timezone.utc)
    plan = Plan(traveler_subject="traveler-1", last_activity_at=now, created_at=now, updated_at=now)
    db_session.add(plan)
    db_session.flush()
    db_session.add_all(
        [
            Conversation(plan_id=plan.id, created_at=now),
            Conversation(plan_id=plan.id, created_at=now),
        ]
    )
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_receipts_and_challenges_store_only_digests(db_session):
    now = datetime.now(timezone.utc)
    plan = Plan(traveler_subject="traveler-1", last_activity_at=now, created_at=now, updated_at=now)
    db_session.add(plan)
    db_session.flush()
    db_session.add(
        PlanActionReceipt(
            traveler_subject="traveler-1",
            request_id="1.abc",
            operation="create",
            payload_digest="a" * 64,
            plan_id=plan.id,
            result_status="succeeded",
            result_json="{}",
            created_at=now,
            expires_at=now,
        )
    )
    db_session.add(
        PlanChallenge(
            token_hash=b"hash",
            traveler_subject="traveler-1",
            plan_id=plan.id,
            operation="rename",
            expected_revision=1,
            change_digest="b" * 64,
            expires_at=now,
        )
    )
    db_session.commit()
    assert db_session.query(PlanActionReceipt).count() == 1
    assert db_session.query(PlanChallenge).count() == 1


def test_create_is_idempotent_and_activity_reorders(db_session):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    repo = PlanRepository(db_session, clock=lambda: now)
    rid = request_id(now)
    first = repo.create("traveler-1", rid)
    again = repo.create("traveler-1", rid)
    assert first.plan_id == again.plan_id
    assert len(repo.list("traveler-1")) == 1
    activity = repo.record_activity("traveler-1", first.plan_id, request_id(now))
    assert activity.revision == first.revision + 1


def test_rename_delete_restore_and_purge(db_session):
    current = [datetime(2026, 1, 1, tzinfo=timezone.utc)]
    repo = PlanRepository(db_session, clock=lambda: current[0])
    plan = repo.create("traveler-1", request_id(current[0]))
    renamed = repo.rename("traveler-1", plan.plan_id, request_id(current[0]), 1, "  Summer 2026 ")
    assert renamed.title == "Summer 2026"
    assert renamed.title_source is TitleSource.MANUAL
    deleted = repo.delete("traveler-1", plan.plan_id, request_id(current[0]), renamed.revision)
    assert deleted.recovery_deadline.replace(tzinfo=timezone.utc) == current[0] + timedelta(days=7)
    with pytest.raises(Exception):
        repo.get("traveler-1", plan.plan_id)
    current[0] += timedelta(days=1)
    restored = repo.restore("traveler-1", plan.plan_id, request_id(current[0]))
    assert restored.lifecycle is PlanLifecycle.ACTIVE
    deleted = repo.delete("traveler-1", plan.plan_id, request_id(current[0]), restored.revision)
    current[0] = deleted.recovery_deadline + timedelta(seconds=1)
    assert repo.purge_expired() == 1
    with pytest.raises(Exception):
        repo.get("traveler-1", plan.plan_id, include_deleted=True)


def test_revision_and_subject_conflicts_are_rejected(db_session):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    repo = PlanRepository(db_session, clock=lambda: now)
    plan = repo.create("traveler-1", request_id(now))
    with pytest.raises(Exception) as conflict:
        repo.rename("traveler-1", plan.plan_id, request_id(now), 99, "New")
    assert conflict.value.code == "revision_conflict"
    with pytest.raises(Exception) as foreign:
        repo.get("traveler-2", plan.plan_id)
    assert foreign.value.code == "not_found"
