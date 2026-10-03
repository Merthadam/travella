"""Live PostgreSQL constraint checks for the migrated CRUD schema."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.crud.models import Conversation, DestinationPin, Plan, PlanningBrief


def _plan() -> Plan:
    now = datetime.now(timezone.utc)
    return Plan(
        traveler_subject="constraint-traveler",
        title="Constraint plan",
        last_activity_at=now,
        created_at=now,
        updated_at=now,
    )


def test_postgres_schema_enforces_json_objects_coordinates_lengths_and_relationships(postgres_engine):
    with Session(postgres_engine) as db:
        plan = _plan()
        db.add(plan)
        db.flush()
        db.add(Conversation(plan_id=plan.id, created_at=plan.created_at))
        db.commit()

        db.add(
            PlanningBrief(
                plan_id=plan.id,
                payload={"travelers": 2},
                updated_at=plan.updated_at,
            )
        )
        db.commit()
        assert db.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == plan.id)).payload == {"travelers": 2}

        with pytest.raises(IntegrityError):
            db.add(
                DestinationPin(
                    plan_id=plan.id,
                    place_id="invalid-latitude",
                    name="Invalid",
                    address="",
                    latitude=91,
                    longitude=0,
                    granularity="city",
                    created_at=plan.created_at,
                )
            )
            db.commit()
        db.rollback()

        with pytest.raises(IntegrityError):
            db.add(
                DestinationPin(
                    plan_id=plan.id,
                    place_id="x" * 256,
                    name="Too long",
                    address="",
                    latitude=1,
                    longitude=1,
                    granularity="city",
                    created_at=plan.created_at,
                )
            )
            db.commit()
        db.rollback()

        with pytest.raises(IntegrityError):
            other_plan = _plan()
            other_plan.traveler_subject = "constraint-traveler-two"
            db.add(other_plan)
            db.flush()
            db.execute(
                text("INSERT INTO planning_briefs (id, plan_id, payload, updated_at) VALUES (:id, :plan_id, '[]'::jsonb, :updated_at)"),
                {"id": uuid4(), "plan_id": other_plan.id, "updated_at": other_plan.updated_at},
            )
            db.commit()
        db.rollback()

        with pytest.raises(IntegrityError):
            db.add(
                Conversation(plan_id=plan.id, created_at=plan.created_at)
            )
            db.commit()
        db.rollback()
