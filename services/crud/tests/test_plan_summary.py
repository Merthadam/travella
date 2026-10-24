"""Journal projection through real authenticated HTTP handlers and persisted data."""
from uuid import UUID, uuid4

import jwt

from services.crud.models import Plan
from .test_api import create, mutate, system as system, write_headers


def context(system, plan, changes, revision=1):
    response = system.client.patch(f"/v1/plans/{plan['plan_id']}/research-context",
        json={"changes": changes}, headers=write_headers(system, revision))
    assert response.status_code == 200, response.text
    return response.json()


def test_journal_names_progress_and_manual_name_survive_lifecycle(system):
    plan = create(system)
    client = system.client
    path = f"/v1/plans/{plan['plan_id']}"
    assert plan["planning_stage"] == "research" and plan["saved_places_count"] == 0
    changes = [dict(operation="add_candidate", field="candidates", value="Yakushima", source="user_edit")]
    ctx = context(system, plan, changes)
    assert client.get(path).json()["title"] == "Exploring Yakushima"
    ctx = context(system, plan, [dict(operation="set", field=field, value=value, source="user_edit") for field, value in
        [("finalDestination", "Yakushima"), ("dateStart", "2027-04-01"), ("dateEnd", "2027-04-07")]], ctx["revision"])
    research = client.get(path).json()
    assert research["title"] == "7 days in Yakushima"
    assert research["destination_summary"] == "Yakushima"
    assert research["planning_stage"] == "research"
    assert research["revision"] == plan["revision"]
    assert client.get("/v1/plans").json()["plans"] == [research]
    assert client.get(path).json() == research  # reads never mutate timestamps/revisions
    with system.factory() as db:
        assert db.get(Plan, UUID(plan["plan_id"])).title == "Untitled plan"
    payload = {"context_revision": ctx["revision"], "snapshot": {"version": 1, "components": {
        "map": {"status": "ready", "destination": "Yakushima", "final": True, "pins": [
            {"id": "forest", "name": "Forest walk", "category": "activity", "position": {"lat": 30.3, "lng": 130.5}, "description": "A walk"}]},
        "essentials": {"status": "ready", "dates": {"start": "2027-04-01", "end": "2027-04-07", "note": "", "flexible": False}, "travelers": 2, "budget": {"label": "", "noFixedBudget": True}},
    }, "evidence": {}}}
    challenge = client.post(path + "/canvas/challenge", json=payload, headers=write_headers(system, research["revision"]))
    assert challenge.status_code == 200, challenge.text
    saved = client.put(path + "/canvas", json=payload, headers=write_headers(system, research["revision"], challenge.json()["challenge"]))
    assert saved.status_code == 200, saved.text
    generated = client.get(path).json()
    assert generated["planning_stage"] == "canvas" and generated["saved_places_count"] == 1
    assert generated["date_start"] == "2027-04-01"
    renamed = mutate(system, generated, "rename", "Our forest escape").json()
    assert renamed["title_source"] == "manual"
    # Further research must neither rename a manual title nor relabel saved canvas facts.
    ctx = client.get(path + "/research-context").json()
    context(system, plan, [dict(operation="set", field="dateEnd", value="2027-04-09", source="user_edit")], ctx["revision"])
    latest = client.get(path).json()
    assert latest["title"] == "Our forest escape" and latest["date_end"] == "2027-04-07"
    deleted = mutate(system, latest, "delete").json()
    assert client.get(path).status_code == 404
    assert client.get("/v1/plans?view=deleted").json()["plans"] == [deleted]
    restored = mutate(system, deleted, "restore").json()
    assert restored["title"] == "Our forest escape" and restored["planning_stage"] == "canvas"
    assert client.get(path).json() == restored


def test_journal_projection_remains_owner_scoped(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}"
    other = jwt.encode(system.claims | {"sub": "another-traveler"}, system.private, algorithm="RS256")
    assert system.client.get(path, headers={"Authorization": ""}).status_code == 401
    assert system.client.get(path, headers={"Authorization": "Bearer " + other}).status_code == 404
    assert system.client.get("/v1/plans", headers={"Authorization": "Bearer " + other}).json()["plans"] == []
    assert system.client.get(f"/v1/plans/{uuid4()}").status_code == 404
    assert system.client.get(path).json() == plan
