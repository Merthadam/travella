"""Maintenance-only retention purge with aggregate, privacy-safe metrics."""

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Plan, PlanLifecycle
from .repository import as_utc


@dataclass(frozen=True)
class PurgeMetrics:
    """The only emitted result: an aggregate count, with no resource identifiers."""

    purged_count: int


def purge_expired(session: Session, *, database_now: datetime) -> PurgeMetrics:
    """Delete only deleted Plans whose deadline has passed according to database time.

    The caller must run this inside a trusted maintenance transaction. Row locks and
    the lifecycle recheck make restore/purge a single winner on transactional stores.
    """

    now = database_now.astimezone(timezone.utc)
    plans = session.scalars(
        select(Plan)
        .where(
            Plan.lifecycle == PlanLifecycle.DELETED,
            Plan.recovery_deadline <= now,
        )
        .with_for_update()
    ).all()
    eligible = []
    for plan in plans:
        if (
            plan.lifecycle is PlanLifecycle.DELETED
            and plan.recovery_deadline
            and as_utc(plan.recovery_deadline) <= now
        ):
            eligible.append(plan)
    for plan in eligible:
        session.delete(plan)
    session.commit()
    return PurgeMetrics(len(eligible))
