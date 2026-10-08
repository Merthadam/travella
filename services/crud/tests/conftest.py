import os
import time
from collections.abc import Iterator
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session

from services.crud.migration import alembic_config, assert_database_at_head
from services.crud.models import Base


@pytest.fixture()
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def _test_database_url() -> str:
    value = os.environ.get("TEST_DATABASE_URL", "")
    if not value.startswith("postgresql+psycopg://"):
        pytest.skip("TEST_DATABASE_URL must point to an isolated PostgreSQL database")
    crud_url = os.environ.get("CRUD_DATABASE_URL")
    if crud_url and value == crud_url:
        raise RuntimeError("TEST_DATABASE_URL must not equal CRUD_DATABASE_URL")
    parsed = make_url(value)
    if not parsed.database or parsed.database in {"postgres", "travella"}:
        raise RuntimeError("TEST_DATABASE_URL must name a dedicated test database")
    return value


@pytest.fixture()
def postgres_engine() -> Iterator[Engine]:
    """Yield a migrated, disposable PostgreSQL database for integration tests.

    The fixture never falls back to a development URL and only performs cleanup
    after the URL has passed the dedicated-database guard.
    """

    url = _test_database_url()
    engine = create_engine(url, future=True, pool_pre_ping=True)
    config: Config = alembic_config()
    previous_crud_url = os.environ.get("CRUD_DATABASE_URL")
    os.environ["CRUD_DATABASE_URL"] = url
    try:
        command.upgrade(config, "head")
        assert_database_at_head(engine)
        yield engine
    finally:
        with engine.begin() as connection:
            for table in (
                "auth_enrollments",
                "auth_recovery_codes",
                "auth_sessions",
                "traveler_profiles",
                "research_contexts",
                "planning_briefs",
                "conversation_messages",
                "destination_pins",
                "plan_challenges",
                "plan_action_receipts",
                "conversations",
                "plans",
            ):
                connection.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            connection.execute(text('DROP TABLE IF EXISTS "alembic_version"'))
        engine.dispose()
        if previous_crud_url is None:
            os.environ.pop("CRUD_DATABASE_URL", None)
        else:
            os.environ["CRUD_DATABASE_URL"] = previous_crud_url


@pytest.fixture()
def postgres_request_id() -> str:
    return f"{int(time.time() * 1000)}.{uuid4()}"
