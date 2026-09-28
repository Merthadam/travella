from datetime import datetime, timedelta, timezone

from services.crud.models import Plan, PlanLifecycle
from services.crud.purge import purge_expired
from services.crud.repository import PlanRepository


def test_purge_uses_database_time_is_idempotent_and_cascades(db_session):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    repo = PlanRepository(db_session, clock=lambda: now)
    plan = repo.create(
        "private-subject", f"{int(now.timestamp() * 1000)}.00000000-0000-0000-0000-000000000001"
    )
    repo.delete(
        "private-subject",
        plan.plan_id,
        f"{int(now.timestamp() * 1000)}.00000000-0000-0000-0000-000000000002",
        1,
    )
    assert purge_expired(db_session, database_now=now + timedelta(days=7)).purged_count == 1
    assert purge_expired(db_session, database_now=now + timedelta(days=8)).purged_count == 0
    assert db_session.get(Plan, plan.plan_id) is None


def test_purge_metrics_contain_no_identifiers(db_session):
    metrics = purge_expired(db_session, database_now=datetime.now(timezone.utc))
    assert metrics.__dict__ == {"purged_count": 0}


def test_restore_and_purge_have_one_terminal_outcome(db_session):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    repo = PlanRepository(db_session, clock=lambda: now)
    plan = repo.create(
        "private-subject", f"{int(now.timestamp() * 1000)}.00000000-0000-0000-0000-000000000003"
    )
    deleted = repo.delete(
        "private-subject",
        plan.plan_id,
        f"{int(now.timestamp() * 1000)}.00000000-0000-0000-0000-000000000004",
        1,
    )
    assert (
        purge_expired(db_session, database_now=now + timedelta(days=7, seconds=1)).purged_count == 1
    )
    assert db_session.get(Plan, plan.plan_id) is None
    assert deleted.lifecycle is PlanLifecycle.DELETED
