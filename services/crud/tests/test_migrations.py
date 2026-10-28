"""PostgreSQL migration and serving-boundary integration checks."""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import UUID, uuid4

import jwt
import pytest
from alembic import command
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from services.auth.config import CognitoConfig
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.app import create_app
from services.crud.migration import alembic_config, assert_database_at_head, migration_heads

SCOPE = "aws.cognito.signin.user.admin"


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


@pytest.fixture
def migrated_database():
    url = _test_database_url()
    engine = create_engine(url, future=True, pool_pre_ping=True)
    config = alembic_config()
    previous_url = os.environ.get("CRUD_DATABASE_URL")
    os.environ["CRUD_DATABASE_URL"] = url
    command.upgrade(config, "head")
    assert_database_at_head(engine)
    yield engine
    with engine.begin() as connection:
        for table in (
            "auth_enrollments",
            "auth_recovery_codes",
            "auth_sessions",
            "traveler_profiles",
            "travel_topic_runs", "travel_topic_states", "research_draft_offers",
            "research_contexts",
            "planning_canvases",
            "planning_briefs",
            "conversation_messages",
            "destination_pins",
            "plan_challenges",
            "plan_action_receipts",
            "conversations",
            "plans",
            "alembic_version",
        ):
            connection.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
    engine.dispose()
    if previous_url is None:
        os.environ.pop("CRUD_DATABASE_URL", None)
    else:
        os.environ["CRUD_DATABASE_URL"] = previous_url


def test_fresh_postgres_plan_http_round_trip(migrated_database):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    config = CognitoConfig("eu-central-1", "pool", "client", "https://issuer", "https://issuer/jwks")
    verifier = CognitoJwtVerifier(config)
    verifier.keys = Mock()
    verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private.public_key())
    token = jwt.encode(
        {"iss": config.issuer, "sub": "migration-traveler", "client_id": "client", "token_use": "access", "iat": int(time.time()), "exp": int(time.time()) + 300, "scope": SCOPE},
        private,
        algorithm="RS256",
    )
    factory = sessionmaker(migrated_database, expire_on_commit=False)
    app = create_app(verifier, factory, required_scope=SCOPE)
    request_id = f"{int(time.time() * 1000)}.{uuid4()}"
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        created = client.post("/v1/plans", headers={"Idempotency-Key": request_id})
        assert created.status_code == 200, created.text
        plan_id = created.json()["plan_id"]
        fetched = client.get(f"/v1/plans/{plan_id}")
        assert fetched.status_code == 200
        assert UUID(fetched.json()["plan_id"]) == UUID(plan_id)
        assert fetched.json()["title"] == "Untitled plan"


def test_migration_script_has_single_head():
    assert migration_heads() == {"0012"}


def test_unmigrated_database_is_rejected(tmp_path):
    engine = create_engine("sqlite:///:memory:")
    with pytest.raises(RuntimeError):
        assert_database_at_head(engine)
    engine.dispose()


def test_postgres_specialist_http_persistence_choices_notes_and_purge(migrated_database, monkeypatch):
    """Run the topic CRUD contract against the migrated PostgreSQL schema too."""
    from .test_topic_conversations import (
        test_choice_review_shortlist_prefer_replace_remove_and_replay,
        test_notes_correction_after_more_than_twelve_turns,
        test_soft_delete_restore_and_purge_cascade,
        test_topic_history_persistence_and_trip_generation_isolation,
    )
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    config = CognitoConfig("eu-central-1", "pool", "client", "https://issuer", "https://issuer/jwks")
    verifier = CognitoJwtVerifier(config)
    verifier.keys = Mock()
    verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private.public_key())
    claims = {"iss": config.issuer, "sub": "traveler-one", "client_id": "client", "token_use": "access",
              "iat": int(time.time()), "exp": int(time.time()) + 300, "scope": SCOPE}
    token = jwt.encode(claims, private, algorithm="RS256")
    current = [datetime.now(timezone.utc)]
    factory = sessionmaker(migrated_database, expire_on_commit=False)
    app = create_app(verifier, factory, clock=lambda: current[0], required_scope=SCOPE)
    # Each flow owns a fresh Plan. Clean those test-created rows between flows so
    # cascade assertions can distinguish orphans from other test fixtures.
    from services.crud.models import Plan
    from sqlalchemy import select
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        system = SimpleNamespace(client=client, factory=factory, current=current, private=private, claims=claims)
        for flow in (test_topic_history_persistence_and_trip_generation_isolation,
                     test_notes_correction_after_more_than_twelve_turns,
                     test_choice_review_shortlist_prefer_replace_remove_and_replay,
                     test_soft_delete_restore_and_purge_cascade):
            if "monkeypatch" in flow.__code__.co_varnames[:flow.__code__.co_argcount]:
                flow(system, monkeypatch)
            else:
                flow(system)
            with factory() as session:
                for plan in session.scalars(select(Plan)).all():
                    session.delete(plan)
                session.commit()


def test_topic_migration_backfills_legacy_history(migrated_database):
    config = alembic_config()
    command.downgrade(config, "0011")
    plan_id, conversation_id, message_id = uuid4(), uuid4(), uuid4()
    now = datetime.now(timezone.utc)
    with migrated_database.begin() as connection:
        connection.execute(text("""INSERT INTO plans
            (id, traveler_subject, lifecycle, revision, title, title_source, last_working_view,
             last_activity_at, created_at, updated_at)
            VALUES (:id, 'legacy-test', 'active', 1, 'Legacy trip', 'automatic', 'conversation', :now, :now, :now)"""),
            {"id": plan_id, "now": now})
        connection.execute(text("INSERT INTO conversations (id, plan_id, created_at) VALUES (:id, :plan, :now)"),
                           {"id": conversation_id, "plan": plan_id, "now": now})
        connection.execute(text("""INSERT INTO conversation_messages
            (id, conversation_id, event_id, role, content, status, generation, sequence, created_at)
            VALUES (:id, :conversation, 'legacy-message', 'user', 'Keep my original trip discussion', 'complete', 0, 1, :now)"""),
            {"id": message_id, "conversation": conversation_id, "now": now})
    command.upgrade(config, "head")
    with migrated_database.connect() as connection:
        row = connection.execute(text("SELECT topic, content FROM conversation_messages WHERE id=:id"), {"id": message_id}).one()
        assert row == ("trip", "Keep my original trip discussion")
