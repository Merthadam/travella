"""Account tracer: real cookie gateway, independent CRUD JWT validation and SQL."""

from uuid import uuid4
from unittest.mock import Mock

import httpx
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from services.auth.api import create_app
from services.auth.agent_client import AgentClient
from services.auth.tests.test_crud_client import gateway, login, HEADERS, ORIGIN, CREDENTIALS  # noqa: F401
from services.crud.models import Base, TravelerProfile
from services.crud.tests.test_api import create, system  # noqa: F401

PATH = "/v1/traveler-profile"


def mutation(revision=0, **values):
    return {"section": "needs", "values": {"food_needs": "  Vegetarian  ",
            "accessibility_needs": " Step-free ", **values},
            "expected_revision": revision, "event_id": str(uuid4())}


HOME = {"home_city": {"name": "Vienna", "country_code": "AT", "source": "manual",
                       "address": "Private home address"}, "default_airport": "VIE"}


def section_write(client, section, values, revision):
    return client.patch(PATH + "/sections", json={"section": section, "values": values,
                        "expected_revision": revision, "event_id": str(uuid4())})


def saved_profile(response):
    value = response.json()
    value.pop("memory_sync", None)
    return value


def test_account_home_and_citizenship_round_trips_preserve_onboarding(gateway):
    login(gateway)
    client = gateway.client
    initial = client.put(PATH, json={"food_needs": "Vegetarian", "onboarding_complete": True,
                                    "citizenships": ["Legacy country"]}).json()
    saved = initial
    for section, values in [("home", HOME), ("citizenship", {"citizenships": ["AT", "HU", "Legacy country"]}),
                            ("home", HOME | {"default_airport": None}),
                            ("citizenship", {"citizenships": []})]:
        response = section_write(client, section, values, saved["revision"])
        assert response.status_code == 200, response.text
        saved = saved_profile(response)
        assert client.get(PATH).json() == saved
        assert saved["onboarding"] == initial["onboarding"]
        assert saved["onboarding_complete"] is True
        assert saved["food_needs"] == "Vegetarian"
        with gateway.system.factory() as db:
            payload = db.get(TravelerProfile, "traveler-one").payload
            assert all(payload[key] == value for key, value in values.items()
                       if key != "home_city")
            assert payload["home_city"]["address"] == HOME["home_city"]["address"]
    assert saved["default_airport"] is None
    assert saved["departure_base"] == "Vienna"
    assert saved["citizenships"] == []
    for section, values in [("home", HOME | {"default_airport": "XXX"}),
                            ("home", HOME | {"home_city": None}),
                            ("citizenship", {"citizenships": ["New free text"]}),
                            ("citizenship", {"citizenships": ["Legacy country"]})]:
        assert section_write(client, section, values, saved["revision"]).status_code == 422
        assert client.get(PATH).json() == saved


def test_account_needs_save_replay_clear_and_sql_persistence(gateway):
    login(gateway)
    client = gateway.client
    initial = client.put(PATH, json={"departure_base": "Vienna", "citizenships": ["AT"],
                         "onboarding_complete": True}).json()
    plan = create(gateway.system)
    body = mutation(initial["revision"])
    response = client.patch(PATH + "/sections", json=body)
    assert response.status_code == 200, response.text
    saved = saved_profile(response)
    assert saved["food_needs"] == "Vegetarian"
    assert saved["accessibility_needs"] == "Step-free"
    assert saved["revision"] == initial["revision"] + 1
    assert saved["onboarding"] == initial["onboarding"]
    assert saved["onboarding_complete"] is True
    assert saved["departure_base"] == "Vienna" and saved["citizenships"] == ["AT"]
    assert client.get(PATH).json() == saved
    assert saved_profile(client.patch(PATH + "/sections", json=body)) == saved
    assert client.patch(PATH + "/sections", json=body | {
        "values": body["values"] | {"food_needs": "Vegan"}}).json()["code"] == "request_reused"
    assert client.patch(PATH + "/sections", json=mutation(initial["revision"])).json()["code"] == "revision_conflict"
    with gateway.system.factory() as db:
        row = db.get(TravelerProfile, "traveler-one")
        assert row.payload["food_needs"] == "Vegetarian"
        assert len(row.payload["_account_events"]) == 1
        assert row.payload["revision"] == saved["revision"]
    cleared = saved_profile(client.patch(PATH + "/sections", json=mutation(saved["revision"],
                           food_needs="", accessibility_needs="")))
    assert cleared["food_needs"] == cleared["accessibility_needs"] == ""
    assert client.get(PATH).json() == cleared
    assert gateway.system.client.get(f"/v1/plans/{plan['plan_id']}").json() == plan
    assert "_account_events" not in cleared and "traveler_subject" not in cleared


@pytest.mark.parametrize("change", [
    {"subject": "another-traveler"}, {"expected_revision": True},
    {"section": "home"}, {"values": {"food_needs": "x", "accessibility_needs": "", "extra": "x"}},
    {"values": {"food_needs": "x" * 1001, "accessibility_needs": ""}},
])
def test_account_invalid_input_never_creates_profile(gateway, change):
    login(gateway)
    response = gateway.client.patch(PATH + "/sections", json=mutation() | change)
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_profile"
    assert gateway.client.get(PATH).json()["exists"] is False


def test_account_token_ownership_and_cross_origin(gateway):
    client = gateway.client
    assert client.patch(PATH + "/sections", json=mutation()).status_code == 401
    login(gateway)
    assert client.patch(PATH + "/sections", json=mutation(),
                        headers={"Origin": "https://foreign.test"}).status_code == 403
    assert client.get(PATH).json()["exists"] is False
    assert gateway.system.client.patch(PATH + "/sections", json=mutation(),
              headers={"Authorization": "Bearer invalid"}).status_code == 401
    foreign = jwt.encode(gateway.system.claims | {"sub": "another-traveler"},
                         gateway.system.private, algorithm="RS256")
    response = gateway.system.client.patch(PATH + "/sections", json=mutation(),
                                           headers={"Authorization": f"Bearer {foreign}"})
    assert response.status_code == 200
    assert response.json()["onboarding_complete"] is False
    assert client.get(PATH).json()["exists"] is False
    with gateway.system.factory() as db:
        assert db.get(TravelerProfile, "traveler-one") is None
        assert db.get(TravelerProfile, "another-traveler").payload["food_needs"] == "Vegetarian"


def test_account_interests_allow_zero_and_one_while_onboarding_requires_five(gateway):
    from services.shared.traveler_profile import reference_catalog
    login(gateway)
    client = gateway.client
    catalog = reference_catalog("interests")
    initial = client.put(PATH, json={"travel_interests": "Legacy interests", "onboarding_complete": True}).json()
    # A different section must not discard legacy text.
    unchanged = section_write(client, "needs", {"food_needs": "", "accessibility_needs": ""}, initial["revision"]).json()
    assert unchanged["travel_interests"] == "Legacy interests"
    saved = unchanged
    for values in [{"interest_ids": [catalog[0]["id"]], "custom_interests": []},
                   {"interest_ids": [catalog[0]["id"], catalog[0]["id"]],
                    "custom_interests": [catalog[0]["label"].upper(), "  Quiet   walks ", "quiet walks"]},
                   {"interest_ids": [], "custom_interests": []}]:
        response = section_write(client, "interests", values, saved["revision"])
        assert response.status_code == 200, response.text
        saved = saved_profile(response)
        assert saved["onboarding"] == initial["onboarding"] and saved["onboarding_complete"]
        assert client.get(PATH).json() == saved
        assert len(saved["interest_ids"]) <= 1
        assert saved["custom_interests"] in ([], ["Quiet walks"])
        with gateway.system.factory() as db:
            payload = db.get(TravelerProfile, "traveler-one").payload
            assert all(payload[key] == saved[key] for key in ["interest_ids", "custom_interests", "travel_interests"])
    assert saved["travel_interests"] == ""
    for values in [{"interest_ids": [], "custom_interests": []},
                   {"interest_ids": [catalog[0]["id"]], "custom_interests": []}]:
        response = client.patch(PATH + "/onboarding", json={"step": "interests", "action": "continue", "values": values,
                                "expected_revision": saved["revision"], "event_id": str(uuid4())})
        assert response.status_code == 422
    for values in [{"interest_ids": ["invalid"], "custom_interests": []},
                   {"interest_ids": [], "custom_interests": ["x" * 81]},
                   {"interest_ids": [], "custom_interests": [f"{i} " + "x" * 75 for i in range(20)]},
                   {"interest_ids": [], "custom_interests": [f"Interest {i}" for i in range(21)]}]:
        assert section_write(client, "interests", values, saved["revision"]).status_code == 422
        assert client.get(PATH).json() == saved


@pytest.mark.parametrize("failure", [False, True])
def test_incomplete_account_edits_mirror_canonical_clears_without_changing_plans(gateway, failure):
    import json
    from datetime import datetime, timezone
    from uuid import UUID
    from services.crud.models import DestinationPin, PlanningBrief
    from services.shared.traveler_profile import profile_context

    captured = []
    def mirror(request):
        captured.append(json.loads(request.content))
        assert request.extensions["timeout"]["read"] == 10
        if failure:
            raise httpx.ReadTimeout("isolated timeout", request=request)
        return httpx.Response(200, json={"status": "synced"})

    provider = Mock()
    provider.sign_in.return_value = {"AuthenticationResult": {"AccessToken": gateway.system.token, "RefreshToken": "isolated-refresh"}}
    provider.get_user.return_value = {"UserAttributes": [{"Name": "sub", "Value": "traveler-one"}, {"Name": "email_verified", "Value": "true"}]}
    app = create_app(provider, gateway.system.verifier, gateway.store, origin=ORIGIN,
                     clock=lambda: gateway.now[0], crud_client=gateway.adapter,
                     agent_client=AgentClient("http://agent.test", transport=httpx.MockTransport(mirror)))
    plan = create(gateway.system)
    # Populate existing Plan-owned rows, so equality is not an empty-table check.
    with gateway.system.factory() as db:
        db.add(PlanningBrief(plan_id=UUID(plan["plan_id"]), payload={"interests": "Confirmed museums"},
                             provenance={"interests": "traveler"}, inactive={}, updated_at=datetime.now(timezone.utc)))
        db.add(DestinationPin(plan_id=UUID(plan["plan_id"]), place_id="confirmed-lisbon", name="Lisbon",
                              address="Lisbon", latitude=38.7223, longitude=-9.1393, created_at=datetime.now(timezone.utc)))
        db.commit()
    def snapshot():
        with gateway.system.factory() as db:
            return {table.name: [dict(row) for row in db.execute(select(table)).mappings()]
                    for table in Base.metadata.sorted_tables if table.name != "traveler_profiles"}
    before = snapshot()
    with TestClient(app, base_url=ORIGIN, headers=HEADERS) as client:
        assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 200
        saved = client.get(PATH).json()
        for section, values in [("home", HOME), ("citizenship", {"citizenships": ["AT"]}),
                                ("needs", {"food_needs": "Vegetarian", "accessibility_needs": "Step-free"}),
                                ("interests", {"interest_ids": ["hiking"], "custom_interests": ["Quiet walks"]}),
                                ("home", HOME | {"default_airport": None}), ("citizenship", {"citizenships": []}),
                                ("needs", {"food_needs": "", "accessibility_needs": ""}),
                                ("interests", {"interest_ids": [], "custom_interests": []})]:
            response = section_write(client, section, values, saved["revision"])
            assert response.status_code == 200
            acknowledged = response.json()
            saved = client.get(PATH).json()
            assert captured, "Every account write must mirror even an incomplete profile"
            assert acknowledged.pop("memory_sync") == ("unavailable" if failure else "synced")
            assert acknowledged == saved
            assert saved["onboarding_complete"] is False
            assert saved["onboarding"]["completed_version"] == 0
            assert captured[-1] == profile_context(saved) | {"updated_at": saved["updated_at"]}
            assert "address" not in captured[-1]["home_city"]
            with gateway.system.factory() as db:
                assert db.get(TravelerProfile, "traveler-one").payload["revision"] == saved["revision"]
        assert len(captured) == 8
        assert captured[-1]["default_airport"] is None
        assert captured[-1]["food_needs"] == captured[-1]["accessibility_needs"] == captured[-1]["travel_interests"] == ""
        assert captured[-1]["citizenships"] == captured[-1]["interest_ids"] == captured[-1]["custom_interests"] == []
    assert snapshot() == before
