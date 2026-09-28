"""HTTP integration tests use real SQLAlchemy persistence and signed local JWTs."""

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import UUID, uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from services.auth.config import CognitoConfig
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.crud.app import create_app
from services.crud.config import create_crud_engine
from services.crud.models import Base, Conversation, Plan, PlanChallenge

SCOPE = "aws.cognito.signin.user.admin"


@pytest.fixture
def system(tmp_path):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    config = CognitoConfig(
        "eu-central-1", "pool", "client", "https://issuer", "https://issuer/jwks"
    )
    verifier = CognitoJwtVerifier(config)
    verifier.keys = Mock()
    verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private.public_key())
    current = [datetime.now(timezone.utc)]
    claims = dict(
        iss=config.issuer,
        sub="traveler-one",
        client_id="client",
        token_use="access",
        iat=int(time.time()),
        exp=int(time.time()) + 300,
        scope=SCOPE,
    )
    token = jwt.encode(claims, private, algorithm="RS256")
    engine = create_crud_engine(f"sqlite:///{tmp_path / 'plans.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    app = create_app(verifier, factory, clock=lambda: current[0])
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield SimpleNamespace(
            client=client,
            factory=factory,
            current=current,
            private=private,
            claims=claims,
            verifier=verifier,
            token=token,
            app=app,
        )
    engine.dispose()


def write_headers(system, revision=None, challenge=None, rid=None):
    result = {"Idempotency-Key": rid or f"{int(system.current[0].timestamp() * 1000)}.{uuid4()}"}
    if revision is not None:
        result["If-Match"] = str(revision)
    if challenge:
        result["X-Plan-Challenge"] = challenge
    return result


def create(system):
    response = system.client.post("/v1/plans", headers=write_headers(system))
    assert response.status_code == 200, response.text
    return response.json()


def prepare(system, plan, operation, title=None):
    response = system.client.post(
        f"/v1/plans/{plan['plan_id']}/challenges",
        headers=write_headers(system, plan["revision"]),
        json={"operation": operation, **({"title": title} if title is not None else {})},
    )
    assert response.status_code == 200, response.text
    return response.json()["challenge"]


def mutate(system, plan, operation, title=None, challenge=None, headers=None):
    challenge = challenge or prepare(system, plan, operation, title)
    headers = headers or write_headers(system, plan["revision"], challenge)
    path = f"/v1/plans/{plan['plan_id']}"
    if operation == "rename":
        return system.client.patch(path + "/title", headers=headers, json={"title": title})
    if operation == "restore":
        return system.client.post(path + "/restore", headers=headers)
    return system.client.delete(path, headers=headers)


def test_complete_lifecycle_and_persistence(system):
    client = system.client
    plan = create(system)
    assert plan["title"] == "Untitled plan" and plan["revision"] == 1
    with system.factory() as db:
        stored = db.get(Plan, UUID(plan["plan_id"]))
        assert stored.traveler_subject == "traveler-one"
        assert db.scalar(select(Conversation)).plan_id == stored.id
    path = f"/v1/plans/{plan['plan_id']}"
    before = client.get(path).json()
    assert before == client.get(path).json() == plan  # GET never changes revision/activity.
    system.current[0] += timedelta(seconds=2)
    opened = client.post(path + "/activity", headers=write_headers(system, 1)).json()
    assert opened["revision"] == 2 and opened["last_activity_at"] != before["last_activity_at"]
    renamed = mutate(system, opened, "rename", "  Cafe\u0301 trip  ").json()
    assert renamed["title"] == "Café trip" and renamed["title_source"] == "manual"
    assert client.get(path).json() == renamed
    deleted = mutate(system, renamed, "delete").json()
    assert deleted["lifecycle"] == "deleted"
    deadline = datetime.fromisoformat(deleted["recovery_deadline"].replace("Z", "+00:00"))
    assert deadline == system.current[0] + timedelta(days=7)
    assert client.get(path).status_code == 404
    assert client.get("/v1/plans").json()["plans"] == []
    assert client.get("/v1/plans?view=deleted").json()["plans"] == [deleted]
    restored = mutate(system, deleted, "restore").json()
    assert restored["lifecycle"] == "active" and restored["recovery_deadline"] is None
    assert restored["title"] == "Café trip" and restored["resume_target"] == "conversation"
    assert restored["conversation"] == plan["conversation"]
    assert client.get(path).json() == restored
    assert client.get("/v1/plans?view=deleted").json()["plans"] == []
    assert client.get("/v1/plans").headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "claim,value",
    [
        ("iss", "https://wrong"),
        ("client_id", "wrong"),
        ("token_use", "id"),
        ("exp", 1),
        ("iat", 9999999999),
        ("scope", ""),
        ("sub", ""),
    ],
)
def test_signed_invalid_claims_are_denied(system, claim, value):
    claims = system.claims | {claim: value}
    token = jwt.encode(claims, system.private, algorithm="RS256")
    response = system.client.get("/v1/plans", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401 and token not in response.text


def test_missing_and_bad_signature_rejected(system):
    for authorization in ("", "Bearer nonsense", "Basic abc"):
        assert (
            system.client.get("/v1/plans", headers={"Authorization": authorization}).status_code
            == 401
        )
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(system.claims, other, algorithm="RS256")
    assert (
        system.client.get("/v1/plans", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )


def test_foreign_identity_cannot_enumerate_or_mutate(system):
    plan = create(system)
    token = jwt.encode(
        system.claims | {"sub": "another-traveler"}, system.private, algorithm="RS256"
    )
    system.client.headers["Authorization"] = f"Bearer {token}"
    assert system.client.get("/v1/plans").json()["plans"] == []
    assert system.client.get("/v1/plans?view=deleted").json()["plans"] == []
    missing = system.client.get(f"/v1/plans/{uuid4()}")
    foreign = system.client.get(f"/v1/plans/{plan['plan_id']}")
    assert (foreign.status_code, foreign.json()) == (missing.status_code, missing.json())
    for action in ("rename", "delete", "restore"):
        response = system.client.post(
            f"/v1/plans/{plan['plan_id']}/challenges",
            headers=write_headers(system, 1),
            json={"operation": action, **({"title": "Stolen"} if action == "rename" else {})},
        )
        assert response.status_code == 404
    for method, suffix, body in (
        ("PATCH", "/title", {"title": "Stolen"}),
        ("DELETE", "", {}),
        ("POST", "/restore", {}),
        ("POST", "/activity", {}),
    ):
        response = system.client.request(
            method,
            f"/v1/plans/{plan['plan_id']}{suffix}",
            headers=write_headers(system, 1, "forged"),
            json=body,
        )
        assert response.status_code == 404


def test_create_duplicate_is_atomic_under_concurrent_http_requests(system):
    headers = write_headers(system)
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(lambda _: system.client.post("/v1/plans", headers=headers), range(4))
        )
    assert all(r.status_code == 200 for r in responses)
    assert len({r.json()["plan_id"] for r in responses}) == 1
    assert len(system.client.get("/v1/plans").json()["plans"]) == 1


def test_challenge_binding_expiry_replay_and_revision(system):
    plan = create(system)
    challenge = prepare(system, plan, "rename", "Exact title")
    wrong = mutate(system, plan, "rename", "Different title", challenge=challenge)
    assert wrong.status_code == 409 and wrong.json()["code"] == "challenge_invalid"
    headers = write_headers(system, 1, challenge)
    good = mutate(system, plan, "rename", "Exact title", challenge=challenge, headers=headers)
    assert good.status_code == 200
    assert (
        mutate(system, plan, "rename", "Exact title", challenge=challenge, headers=headers).json()
        == good.json()
    )
    assert (
        mutate(system, plan, "rename", "Another", challenge=challenge, headers=headers).json()[
            "code"
        ]
        == "request_reused"
    )
    latest = good.json()
    # Consumed challenge cannot authorize a fresh revision or a different operation.
    assert (
        mutate(system, latest, "delete", challenge=challenge).json()["code"] == "challenge_invalid"
    )
    assert (
        mutate(system, latest, "rename", "Exact title", challenge=challenge).json()["code"]
        == "challenge_invalid"
    )
    assert (
        mutate(system, plan, "rename", "Exact title", challenge=challenge).json()["code"]
        == "revision_conflict"
    )
    challenge = prepare(system, latest, "rename", "Expired")
    system.current[0] += timedelta(minutes=6)
    assert (
        mutate(system, latest, "rename", "Expired", challenge=challenge).json()["code"]
        == "challenge_invalid"
    )
    assert system.client.get(f"/v1/plans/{plan['plan_id']}").json()["title"] == "Exact title"


def test_recovery_deadline_hides_data_and_refuses_restore(system):
    plan = mutate(system, create(system), "delete").json()
    challenge = prepare(system, plan, "restore")
    system.current[0] += timedelta(days=7)
    assert system.client.get("/v1/plans?view=deleted").json()["plans"] == []
    response = mutate(system, plan, "restore", challenge=challenge)
    assert response.status_code == 410 and plan["title"] not in response.text
    assert system.client.get(f"/v1/plans/{plan['plan_id']}").status_code == 404


@pytest.mark.parametrize("title", ["", "   ", "x" * 121, "new\nname", "bad\x85title"])
def test_invalid_titles_do_not_mutate(system, title):
    plan = create(system)
    response = system.client.post(
        f"/v1/plans/{plan['plan_id']}/challenges",
        headers=write_headers(system, 1),
        json={"operation": "rename", "title": title},
    )
    assert response.status_code == 422
    assert system.client.get(f"/v1/plans/{plan['plan_id']}").json() == plan


def test_unicode_codepoint_limit_and_validation_redaction(system):
    plan = create(system)
    assert mutate(system, plan, "rename", "😀" * 120).status_code == 200
    response = system.client.patch(
        f"/v1/plans/{plan['plan_id']}/title", json={"title": [], "secret": "private-input"}
    )
    assert response.status_code == 422 and "private-input" not in response.text
    assert not {"traveler_subject", "access_token", "email"}.intersection(plan)
    assert "traveler-one" not in system.client.get("/v1/plans").text


def test_pagination_order_and_invalid_cursor(system):
    plans = [create(system) for _ in range(3)]
    expected = sorted([p["plan_id"] for p in plans])
    first = system.client.get("/v1/plans?limit=2").json()
    second = system.client.get(
        "/v1/plans", params={"limit": 2, "cursor": first["next_cursor"]}
    ).json()
    assert [p["plan_id"] for p in first["plans"] + second["plans"]] == expected
    assert second["next_cursor"] is None
    assert system.client.get("/v1/plans?view=unknown").status_code == 422
    assert system.client.get("/v1/plans?cursor=invalid").status_code == 400
    assert (
        system.client.get(
            "/v1/plans", params={"view": "deleted", "cursor": first["next_cursor"]}
        ).status_code
        == 400
    )
    assert system.client.get("/v1/plans?limit=0").status_code == 422


def test_required_write_guards_and_invalid_request_ids(system):
    plan = create(system)
    for request_id in ("bad", f"0000000000000.{uuid4()}", "9999999999999." + str(uuid4())):
        assert (
            system.client.post("/v1/plans", headers={"Idempotency-Key": request_id}).status_code
            == 400
        )
    path = f"/v1/plans/{plan['plan_id']}"
    assert system.client.post(path + "/activity", headers=write_headers(system)).status_code == 422
    assert system.client.delete(path, headers=write_headers(system, 1)).status_code == 422
    assert (
        system.client.post(path + "/restore", headers=write_headers(system, 1)).status_code == 422
    )
    with system.factory() as db:
        assert db.scalar(select(PlanChallenge)) is None


def test_challenge_is_bound_to_one_plan_and_delete_restore_are_idempotent(system):
    first, second = create(system), create(system)
    token = prepare(system, first, "delete")
    assert mutate(system, second, "delete", challenge=token).json()["code"] == "challenge_invalid"
    headers = write_headers(system, first["revision"], token)
    deleted = mutate(system, first, "delete", challenge=token, headers=headers)
    assert deleted.status_code == 200
    assert (
        mutate(system, first, "delete", challenge=token, headers=headers).json() == deleted.json()
    )
    plan = deleted.json()
    token = prepare(system, plan, "restore")
    headers = write_headers(system, plan["revision"], token)
    restored = mutate(system, plan, "restore", challenge=token, headers=headers)
    assert restored.status_code == 200
    assert (
        mutate(system, plan, "restore", challenge=token, headers=headers).json() == restored.json()
    )
    assert len(system.client.get("/v1/plans").json()["plans"]) == 2


def test_expired_and_purged_plans_cannot_be_replayed(system):
    from services.crud.repository import PlanRepository

    plan = create(system)
    token = prepare(system, plan, "delete")
    headers = write_headers(system, plan["revision"], token)
    deleted = mutate(system, plan, "delete", challenge=token, headers=headers).json()
    system.current[0] += timedelta(days=7)
    with system.factory() as db:
        assert PlanRepository(db, clock=lambda: system.current[0]).purge_expired() == 1
    assert system.client.get(f"/v1/plans/{plan['plan_id']}").status_code == 404
    assert (
        mutate(system, plan, "delete", challenge=token, headers=headers).json()["code"]
        == "expired_request"
    )
    assert mutate(system, deleted, "restore", challenge="expired").status_code == 404
    assert system.client.get("/v1/plans?view=deleted").json()["plans"] == []


def test_brief_update_reads_back_and_is_revision_safe(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/brief"
    empty = system.client.get(path)
    assert empty.status_code == 200 and empty.json()["travelers"] == 1 and empty.json()["revision"] == 1
    payload = {"interests": "food, museums", "start_date": "2027-05-01", "end_date": "2027-05-08", "travelers": 2, "budget": "€2000", "transport_tolerance": "walkable", "accessibility_needs": ""}
    saved = system.client.patch(path, headers=write_headers(system, 1), json=payload)
    assert saved.status_code == 200 and saved.json()["interests"] == payload["interests"] and saved.json()["revision"] == 2
    assert system.client.get(path).json() == saved.json()
    conflict = system.client.patch(path, headers=write_headers(system, 1), json=payload)
    assert conflict.status_code == 409
