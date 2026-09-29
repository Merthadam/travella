"""PostgreSQL migration and serving-boundary integration checks."""

from __future__ import annotations

import os
import time
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
    os.environ["CRUD_DATABASE_URL"] = url
    command.upgrade(config, "head")
    assert_database_at_head(engine)
    yield engine
    with engine.begin() as connection:
        for table in ("planning_briefs", "destination_pins", "plan_challenges", "plan_action_receipts", "conversations", "plans"):
            connection.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
    engine.dispose()


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
    assert migration_heads() == {"0003"}


def test_unmigrated_database_is_rejected(tmp_path):
    engine = create_engine("sqlite:///:memory:")
    with pytest.raises(RuntimeError):
        assert_database_at_head(engine)
    engine.dispose()
