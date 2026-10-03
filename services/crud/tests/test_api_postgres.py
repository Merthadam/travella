"""Full CRUD HTTP contract checks against the migrated PostgreSQL schema."""

import time
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import UUID, uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from services.auth.config import CognitoConfig
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.app import create_app
from services.crud.models import DestinationPin, Plan, PlanningBrief

SCOPE = "aws.cognito.signin.user.admin"


def _request_id() -> str:
    return f"{int(time.time() * 1000)}.{uuid4()}"


def _headers(*, revision: int | None = None, challenge: str | None = None) -> dict[str, str]:
    result = {"Idempotency-Key": _request_id()}
    if revision is not None:
        result["If-Match"] = str(revision)
    if challenge is not None:
        result["X-Plan-Challenge"] = challenge
    return result


def _challenge(client: TestClient, plan_id: str, revision: int, operation: str, title: str | None = None) -> str:
    payload = {"operation": operation}
    if title is not None:
        payload["title"] = title
    response = client.post(
        f"/v1/plans/{plan_id}/challenges",
        headers=_headers(revision=revision),
        json=payload,
    )
    assert response.status_code == 200, response.text
    return response.json()["challenge"]


def _build_system(postgres_engine):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    config = CognitoConfig(
        "eu-central-1", "pool", "client", "https://issuer", "https://issuer/jwks"
    )
    verifier = CognitoJwtVerifier(config)
    verifier.keys = Mock()
    verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private.public_key())
    claims = {
        "iss": config.issuer,
        "sub": "postgres-traveler",
        "client_id": "client",
        "token_use": "access",
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,
        "scope": SCOPE,
    }
    token = jwt.encode(claims, private, algorithm="RS256")
    factory = sessionmaker(postgres_engine, expire_on_commit=False)
    app = create_app(verifier, factory, required_scope=SCOPE)
    return SimpleNamespace(
        client=TestClient(app, headers={"Authorization": f"Bearer {token}"}),
        factory=factory,
        private=private,
        claims=claims,
    )


def test_postgres_http_crud_persists_jsonb_numeric_and_recovery(postgres_engine):
    system = _build_system(postgres_engine)
    with system.client as client:
        created = client.post("/v1/plans", headers=_headers())
        assert created.status_code == 200, created.text
        plan = created.json()
        plan_id = plan["plan_id"]

        brief = {
            "interests": "food, museums",
            "start_date": "2027-05-01",
            "end_date": "2027-05-08",
            "travelers": 2,
            "budget": "EUR 2000",
            "transport_tolerance": "walkable",
            "accessibility_needs": "",
        }
        saved_brief = client.patch(
            f"/v1/plans/{plan_id}/brief",
            headers=_headers(revision=1),
            json=brief,
        )
        assert saved_brief.status_code == 200
        assert client.get(f"/v1/plans/{plan_id}/brief").json()["interests"] == brief["interests"]

        destination = {
            "place_id": "google:paris",
            "name": "Paris",
            "address": "Paris, France",
            "latitude": 48.856613,
            "longitude": 2.352222,
            "granularity": "city",
        }
        saved_destination = client.post(
            f"/v1/plans/{plan_id}/destinations",
            headers=_headers(revision=2),
            json=destination,
        )
        assert saved_destination.status_code == 200
        destination_id = saved_destination.json()["destination"]["destination_id"]
        assert client.get(f"/v1/plans/{plan_id}/destinations").json()[0]["place_id"] == destination["place_id"]

        with Session(postgres_engine) as db:
            stored_plan = db.get(Plan, UUID(plan_id))
            stored_brief = db.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == UUID(plan_id)))
            stored_pin = db.get(DestinationPin, UUID(destination_id))
            assert stored_plan is not None and stored_plan.traveler_subject == "postgres-traveler"
            assert stored_brief is not None and stored_brief.payload == brief
            assert isinstance(stored_brief.payload, dict)
            assert stored_pin is not None
            assert isinstance(stored_pin.latitude, Decimal)
            assert isinstance(stored_pin.longitude, Decimal)
            assert isinstance(stored_pin.id, UUID)
            assert stored_pin.created_at.tzinfo is not None

        removed = client.delete(
            f"/v1/plans/{plan_id}/destinations/{destination_id}",
            headers=_headers(revision=3),
        )
        assert removed.status_code == 200 and client.get(f"/v1/plans/{plan_id}/destinations").json() == []

        challenge = _challenge(client, plan_id, 4, "delete")
        deleted = client.delete(
            f"/v1/plans/{plan_id}", headers=_headers(revision=4, challenge=challenge)
        )
        assert deleted.status_code == 200 and deleted.json()["lifecycle"] == "deleted"
        assert client.get(f"/v1/plans/{plan_id}").status_code == 404
        assert client.get(f"/v1/plans/{plan_id}?view=deleted").status_code == 200

        deleted_plan = deleted.json()
        restore_challenge = _challenge(client, plan_id, deleted_plan["revision"], "restore")
        restored = client.post(
            f"/v1/plans/{plan_id}/restore",
            headers=_headers(revision=deleted_plan["revision"], challenge=restore_challenge),
        )
        assert restored.status_code == 200 and restored.json()["lifecycle"] == "active"


def test_postgres_http_rejects_invalid_stale_and_foreign_requests_without_mutation(postgres_engine):
    system = _build_system(postgres_engine)
    with system.client as client:
        created = client.post("/v1/plans", headers=_headers())
        assert created.status_code == 200
        plan = created.json()
        plan_id = plan["plan_id"]

        invalid = client.post(
            f"/v1/plans/{plan_id}/destinations",
            headers=_headers(revision=1),
            json={
                "place_id": "bad",
                "name": "Bad",
                "latitude": 91,
                "longitude": 0,
                "granularity": "city",
            },
        )
        assert invalid.status_code == 422
        assert client.get(f"/v1/plans/{plan_id}/destinations").json() == []

        brief = {"interests": "hiking", "travelers": 1}
        first = client.patch(
            f"/v1/plans/{plan_id}/brief", headers=_headers(revision=1), json=brief
        )
        assert first.status_code == 200
        stale = client.patch(
            f"/v1/plans/{plan_id}/brief", headers=_headers(revision=1), json=brief
        )
        assert stale.status_code == 409

        foreign_token = jwt.encode(
            system.claims | {"sub": "different-traveler"}, system.private, algorithm="RS256"
        )
        client.headers["Authorization"] = f"Bearer {foreign_token}"
        assert client.get(f"/v1/plans/{plan_id}").status_code == 404
        assert client.get("/v1/plans").json()["plans"] == []
        assert client.get(f"/v1/plans/{uuid4()}").status_code == 404

        client.headers.pop("Authorization")
        assert client.get(f"/v1/plans/{plan_id}").status_code == 401
