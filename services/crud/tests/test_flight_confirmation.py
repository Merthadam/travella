from uuid import uuid4

import jwt
import pytest

from services.agent.canvas_mapping import mapped_components

from .test_api import create, write_headers
from .test_api import system as system


def choice(value, source="user_edit", quote=""):
    return {"operation": "set", "field": "flights", "value": value,
            "source": source, "source_quote": quote}


@pytest.mark.parametrize("need", ["needed", "not-needed"])
def test_explicit_choice_persists_and_canvas_saves_with_optional_flights(system, need):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}"
    read = system.client.get(path + "/research-context")
    assert read.status_code == 200 and read.json()["context"]["flights"] == "undecided"
    headers = write_headers(system, 1)
    response = system.client.patch(path + "/research-context", headers=headers, json={"changes": [choice(need)]})
    assert response.status_code == 200, response.text
    snapshot = response.json()
    assert snapshot["revision"] == 2
    assert snapshot["context"]["provenance"]["flights"]["source"] == "user_edit"
    assert system.client.get(path + "/research-context").json()["context"] == snapshot["context"]
    assert system.client.patch(path + "/research-context", headers=headers, json={"changes": [choice(need)]}).json() == snapshot
    stale = system.client.patch(path + "/research-context", headers=write_headers(system, 1), json={"changes": [choice("undecided")]})
    assert stale.status_code == 409
    components = mapped_components(snapshot["context"])
    assert ("flights" in components) == (need == "needed")
    body = {"context_revision": 2, "snapshot": {"version": 1, "components": components, "evidence": {}}}
    challenge = system.client.post(path + "/canvas/challenge", json=body, headers=write_headers(system, plan["revision"]))
    assert challenge.status_code == 200, challenge.text
    saved = system.client.put(path + "/canvas", json=body, headers=write_headers(system, plan["revision"], challenge.json()["challenge"]))
    assert saved.status_code == 200, saved.text
    assert system.client.get(path + "/canvas").json()["snapshot"] == body["snapshot"]
    assert system.client.get(path + "/research-context").json()["context"]["flights"] == need


def test_agent_cannot_infer_flights_but_explicit_answer_is_persisted(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/research-context"
    event = f"{int(system.current[0].timestamp() * 1000)}.{uuid4()}"
    assert system.client.post(path + "/run", json={"event_id": event, "action": "begin"}).status_code == 200
    payload = {"event_id": event, "action": "complete", "revision": 1, "message": "Yes, I need flights.",
               "changes": [choice("needed", "agent_inferred")]}
    assert system.client.post(path + "/run", json=payload).status_code == 400
    assert system.client.get(path).json()["context"]["flights"] == "undecided"
    payload["changes"] = [choice("needed", "user_explicit", payload["message"])]
    response = system.client.post(path + "/run", json=payload)
    assert response.status_code == 200, response.text
    stored = system.client.get(path).json()
    assert stored["context"]["flights"] == "needed" and not stored["locked"]
    assert stored["context"]["provenance"]["flights"]["source"] == "user_explicit"


def test_flight_confirmation_rejects_invalid_and_unauthorized_edits(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/research-context"
    foreign = jwt.encode(system.claims | {"sub": "another-traveler"}, system.private, algorithm="RS256")
    for auth, status in [("", 401), (f"Bearer {foreign}", 404)]:
        response = system.client.patch(path, headers={**write_headers(system, 1), "Authorization": auth}, json={"changes": [choice("needed")]})
        assert response.status_code == status
    assert system.client.patch(path, headers=write_headers(system, 1), json={"changes": [choice("maybe")]}).status_code == 400
    assert system.client.patch(f"/v1/plans/{uuid4()}/research-context", headers=write_headers(system, 1), json={"changes": [choice("needed")]}).status_code == 404
    assert system.client.get(path).json()["context"]["flights"] == "undecided"
