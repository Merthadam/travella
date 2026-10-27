"""Actual FastAPI handlers and persistent SQLite database, with signed local JWTs."""
from datetime import timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from sqlalchemy import select

from services.crud.models import ConversationMessage, TravelTopicRun, TravelTopicState
from services.crud.repository import PlanRepository
from services.travel_topics import issue_comparison_proof
from .test_api import create, mutate, system, write_headers


def url(plan, topic="stays"):
    return f"/v1/plans/{plan['plan_id']}/travel/{topic}"


def begin(system, plan, topic="stays", message="A quiet apartment with a kitchen", event=None):
    data = {"action": "begin", "event_id": event or str(uuid4()), "message": message, "generation": 1}
    response = system.client.post(url(plan, topic) + "/run", json=data)
    assert response.status_code == 200, response.text
    return data, response.json()


def complete(system, plan, data, snapshot, topic="stays", **extra):
    return system.client.post(url(plan, topic) + "/run", json={**data, "action": "complete",
        "brief_digest": snapshot["brief"]["digest"], "assistant_text": "I will prioritize quiet stays and check kitchen evidence.", **extra})


def option(system, identifier="provider-room-1"):
    return {"id": identifier, "title": "Quiet courtyard apartment", "summary": "Kitchen confirmed in room amenities",
            "price_label": "EUR 420 total, observed", "facts": ["Kitchen in room amenities"], "unknowns": ["Street noise not verified"],
            "observed_at": system.current[0].isoformat(), "provider": "liteapi-sandbox", "criteria": {"destination": "Rome"}}


def researched(system, plan, monkeypatch, topic="stays", identifier="provider-room-1"):
    monkeypatch.setenv("CANVAS_EVIDENCE_SIGNING_KEY", "test-only-signing-key-that-is-over-32-characters")
    data, snapshot = begin(system, plan, topic)
    comparison = {"options": [option(system, identifier)]}
    proof = issue_comparison_proof("traveler-one", plan["plan_id"], topic, data["event_id"], snapshot["brief"]["digest"], comparison)
    response = complete(system, plan, data, snapshot, topic, comparison=comparison, comparison_proof=proof)
    assert response.status_code == 200, response.text
    return response.json()


def choose(system, plan, snapshot, action, evidence_id, topic="stays"):
    body = {"action": action, "evidence_id": evidence_id}
    response = system.client.post(url(plan, topic) + "/choices/challenge", headers=write_headers(system, snapshot["revision"]), json=body)
    assert response.status_code == 200, response.text
    headers = write_headers(system, snapshot["revision"], response.json()["challenge"])
    response = system.client.post(url(plan, topic) + "/choices", headers=headers, json=body)
    assert response.status_code == 200, response.text
    return response.json(), headers, body


def test_topic_history_persistence_and_trip_generation_isolation(system):
    plan = create(system)
    before = system.client.get(f"/v1/plans/{plan['plan_id']}/research-context").json()
    data, snapshot = begin(system, plan)
    assert snapshot["messages"][0]["status"] == "pending"
    assert "saved_canvas" in snapshot
    assert complete(system, plan, data, snapshot).status_code == 200
    readback = system.client.get(url(plan)).json()
    assert [m["role"] for m in readback["messages"]] == ["user", "assistant"]
    assert all(m["topic"] == "stays" and m["status"] == "complete" for m in readback["messages"])
    assert system.client.get(url(plan, "flights")).json()["messages"] == []
    assert system.client.get(f"/v1/plans/{plan['plan_id']}/conversation/messages").json() == []
    assert system.client.get(f"/v1/plans/{plan['plan_id']}/generation-context").json()["messages"] == []
    assert system.client.get(f"/v1/plans/{plan['plan_id']}/conversation/messages?topic=stays").json() == readback["messages"]
    assert system.client.get(f"/v1/plans/{plan['plan_id']}/research-context").json() == before
    with system.factory() as db:
        assert db.scalar(select(TravelTopicRun)).status == "complete"
        assert len(db.scalars(select(ConversationMessage)).all()) == 2


def test_shared_lease_cancel_and_event_topic_replay(system):
    plan = create(system)
    data, snapshot = begin(system, plan)
    assert system.client.post(url(plan, "flights") + "/run", json=data).status_code == 409
    assert system.client.post(url(plan, "flights") + "/run", json={**data, "event_id": str(uuid4())}).status_code == 409
    assert system.client.post(url(plan, "flights") + "/run", json={"action": "cancel", "event_id": data["event_id"]}).status_code == 409
    canceled = system.client.post(url(plan) + "/run", json={"action": "cancel", "event_id": data["event_id"]})
    assert canceled.status_code == 200
    assert canceled.json()["messages"][0]["status"] == "interrupted"
    assert canceled.json()["locked"] is False
    assert complete(system, plan, data, snapshot).status_code == 409
    assert system.client.post(url(plan) + "/run", json=data).status_code == 409
    next_data, next_snapshot = begin(system, plan, "flights")
    assert complete(system, plan, next_data, next_snapshot, "flights").status_code == 200


def test_invalid_input_missing_and_ownership(system):
    plan = create(system)
    assert system.client.get(url(plan, "buses")).status_code == 422
    assert system.client.get(url(plan), headers={"Authorization": ""}).status_code == 401
    outsider = jwt.encode({**system.claims, "sub": "other-traveler"}, system.private, algorithm="RS256")
    assert system.client.get(url(plan), headers={"Authorization": f"Bearer {outsider}"}).status_code == 404
    assert system.client.post(url(plan) + "/run", headers={"Authorization": f"Bearer {outsider}"}, json={"action": "begin", "event_id": "other", "message": "hello"}).status_code == 404
    assert system.client.get(url({"plan_id": str(uuid4())})).status_code == 404
    assert system.client.post(url(plan) + "/run", json={"action": "begin", "event_id": "empty", "message": ""}).status_code == 400
    assert system.client.post(url(plan) + "/run", json={"action": "begin", "event_id": "unknown", "message": "x", "changes": []}).status_code == 422


def test_title_only_does_not_invalidate_and_payload_replay_denied(system):
    plan = create(system)
    data, snapshot = begin(system, plan)
    renamed = mutate(system, plan, "rename", "New trip title")
    assert renamed.status_code == 200
    assert system.client.get(url(plan)).json()["brief"]["digest"] == snapshot["brief"]["digest"]
    assert complete(system, plan, {**data, "message": "different"}, snapshot).status_code == 409
    assert complete(system, plan, data, snapshot).status_code == 200


def test_expired_run_cannot_commit_after_trip_change(system):
    plan = create(system)
    data, snapshot = begin(system, plan)
    system.current[0] += timedelta(minutes=11)
    response = system.client.patch(f"/v1/plans/{plan['plan_id']}/research-context", headers=write_headers(system, 1),
        json={"changes": [{"operation": "set", "field": "travelers", "value": 3, "source": "user_edit", "source_quote": ""}]})
    assert response.status_code == 200
    assert complete(system, plan, data, snapshot).status_code == 409
    assert system.client.get(url(plan)).json()["brief"]["digest"] != snapshot["brief"]["digest"]


def test_notes_are_attributed_isolated_and_cancel_safe(system):
    plan = create(system)
    data, snapshot = begin(system, plan)
    message = snapshot["messages"][0]
    notes = {"items": [{"text": "Quiet apartment with kitchen", "kind": "user_preference", "source_message_ids": [message["message_id"]]}],
             "covered_through_sequence": message["sequence"], "incomplete": False}
    assert complete(system, plan, data, snapshot, notes=notes).status_code == 200
    assert system.client.get(url(plan)).json()["notes"] == notes
    assert system.client.get(url(plan, "flights")).json()["notes"]["items"] == []
    flight, other = begin(system, plan, "flights")
    assert complete(system, plan, flight, other, "flights", notes=notes).status_code == 400
    assert system.client.post(url(plan, "flights") + "/run", json={"action": "cancel", "event_id": flight["event_id"]}).status_code == 200
    assert system.client.get(url(plan)).json()["notes"] == notes


def test_notes_correction_after_more_than_twelve_turns(system):
    plan = create(system)
    first = None
    for index in range(14):
        data, snap = begin(system, plan, message="Budget is 500" if index == 0 else "Actually budget is 800" if index == 13 else f"Follow up {index}")
        msg = snap["messages"][-1]
        if index == 0:
            first = msg["message_id"]
        notes = {"items": [{"text": "Budget 800" if index == 13 else "Budget 500", "kind": "user_preference",
                    "source_message_ids": [msg["message_id"] if index == 13 else first]}],
                 "covered_through_sequence": msg["sequence"], "incomplete": False}
        assert complete(system, plan, data, snap, notes=notes).status_code == 200
    readback = system.client.get(url(plan)).json()
    assert len(readback["messages"]) == 12
    assert readback["notes"]["items"][0]["text"] == "Budget 800"
    assert readback["brief"]["budget"] == ""


def test_comparison_requires_server_proof_and_rejects_raw_provider_fields(system, monkeypatch):
    plan = create(system)
    monkeypatch.setenv("CANVAS_EVIDENCE_SIGNING_KEY", "test-key-longer-than-thirty-two-characters")
    data, snapshot = begin(system, plan)
    comparison = {"options": [option(system)]}
    assert complete(system, plan, data, snapshot, comparison=comparison).status_code == 422
    comparison["options"][0]["checkout_token"] = "must-never-persist"
    assert complete(system, plan, data, snapshot, comparison=comparison).status_code == 422
    assert system.client.get(url(plan)).json()["comparison"] is None


def test_choice_review_shortlist_prefer_replace_remove_and_replay(system, monkeypatch):
    plan = create(system)
    snap = researched(system, plan, monkeypatch)
    option_id = snap["comparison"]["options"][0]["id"]
    assert option_id != "provider-room-1"
    snap, _, _ = choose(system, plan, snap, "shortlist", option_id)
    assert snap["readiness"] == "researching" and snap["preferred"] is None
    assert snap["shortlist"][0]["unbooked"] is True
    snap, headers, body = choose(system, plan, snap, "prefer", option_id)
    assert snap["readiness"] == "ready" and snap["preferred"]["id"] == option_id
    replay = system.client.post(url(plan) + "/choices", headers=headers, json=body)
    assert replay.status_code == 200 and replay.json() == snap
    assert system.client.get(url(plan)).json() == snap
    trip = system.client.get(f"/v1/plans/{plan['plan_id']}/agent-context").json()
    assert trip["messages"] == []
    assert trip["accepted_travel_choices"] == snap["brief"]["accepted_choices"]
    assert trip["accepted_travel_choices"][0]["unbooked"] is True
    accepted = trip["accepted_travel_choices"][0]
    assert accepted["facts"] == ["Kitchen in room amenities"]
    assert accepted["criteria"] == {"destination": "Rome"}
    assert accepted["observed_at"] == system.current[0].isoformat()
    assert accepted["source"] == "traveler_confirmed_choice"
    assert "id" not in accepted and "evidence_id" not in accepted and "provider" not in accepted
    flight_brief = system.client.get(url(plan, "flights")).json()["brief"]
    assert flight_brief["accepted_choices"][0]["topic"] == "stays"
    newer = researched(system, plan, monkeypatch, identifier="provider-room-2")
    other_id = newer["comparison"]["options"][0]["id"]
    newer, _, _ = choose(system, plan, newer, "prefer", other_id)
    assert newer["preferred"]["id"] == other_id
    newer, _, _ = choose(system, plan, newer, "remove", other_id)
    assert newer["preferred"] is None and newer["readiness"] == "researching"
    assert len(newer["shortlist"]) == 1
    with system.factory() as db:
        assert db.get(TravelTopicState, (UUID(plan["plan_id"]), "stays")).payload["preferred_id"] is None


def test_choices_require_exact_confirmation_and_fresh_revision(system, monkeypatch):
    plan = create(system)
    snap = researched(system, plan, monkeypatch)
    option_id = snap["comparison"]["options"][0]["id"]
    body = {"action": "shortlist", "evidence_id": option_id}
    challenge = system.client.post(url(plan) + "/choices/challenge", headers=write_headers(system, 1), json=body).json()["challenge"]
    assert system.client.post(url(plan) + "/choices", headers=write_headers(system, 1), json=body).status_code == 422
    assert system.client.post(url(plan) + "/choices", headers=write_headers(system, 1, challenge), json={**body, "action": "prefer"}).status_code == 409
    assert system.client.post(url(plan, "flights") + "/choices/challenge", headers=write_headers(system, 1), json=body).status_code == 404
    mutate(system, plan, "rename", "Renamed")
    assert system.client.post(url(plan) + "/choices", headers=write_headers(system, 1, challenge), json=body).status_code == 409
    assert system.client.get(url(plan)).json()["shortlist"] == []


def test_relevant_change_retains_choice_needs_review(system, monkeypatch):
    plan = create(system)
    snap = researched(system, plan, monkeypatch)
    snap, _, _ = choose(system, plan, snap, "prefer", snap["comparison"]["options"][0]["id"])
    response = system.client.patch(f"/v1/plans/{plan['plan_id']}/research-context", headers=write_headers(system, 1),
        json={"changes": [{"operation": "set", "field": "travelers", "value": 4, "source": "user_edit", "source_quote": ""}]})
    assert response.status_code == 200
    updated = system.client.get(url(plan)).json()
    assert updated["readiness"] == "needs_review" and updated["preferred"]["id"] == snap["preferred"]["id"]
    body = {"action": "prefer", "evidence_id": snap["preferred"]["id"]}
    assert system.client.post(url(plan) + "/choices/challenge", headers=write_headers(system, updated["revision"]), json=body).status_code == 409


def test_soft_delete_restore_and_purge_cascade(system, monkeypatch):
    plan = create(system)
    snap = researched(system, plan, monkeypatch)
    snap, _, _ = choose(system, plan, snap, "prefer", snap["comparison"]["options"][0]["id"])
    current = system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    deleted = mutate(system, current, "delete").json()
    assert system.client.get(url(plan)).status_code == 404
    restored = mutate(system, deleted, "restore").json()
    assert system.client.get(url(plan)).json()["preferred"]["id"] == snap["preferred"]["id"]
    mutate(system, restored, "delete")
    system.current[0] += timedelta(days=8)
    with system.factory() as db:
        assert PlanRepository(db, clock=lambda: system.current[0]).purge_expired() == 1
        assert db.scalars(select(TravelTopicState)).all() == []
        assert db.scalars(select(TravelTopicRun)).all() == []
        assert db.scalars(select(ConversationMessage)).all() == []


def test_shared_accepted_facts_remain_bounded_with_large_multilingual_trip(system, monkeypatch):
    import json
    from services.crud.models import PlanningCanvas, ResearchContext
    from services.trip_context import TripContext

    plan = create(system)
    destination = "旅" * 100
    with system.factory() as db:
        db.add(ResearchContext(plan_id=UUID(plan["plan_id"]), revision=1, updated_at=system.current[0],
            payload=TripContext(candidates=[destination], finalDestination=destination, budget="旅" * 200, dateNote="旅" * 200).model_dump()))
        db.add(PlanningCanvas(plan_id=UUID(plan["plan_id"]), context_revision=1, updated_at=system.current[0], payload={"components": {
            "themes": {"items": [{"id": f"theme-{i}", "kind": "theme", "text": "旅" * 160} for i in range(20)]},
            "map": {"pins": [{"id": f"place-{i}", "name": "旅" * 120, "category": "activity", "position": {"lat": 1.0, "lng": 1.0}} for i in range(50)]}}}))
        db.commit()
    monkeypatch.setenv("CANVAS_EVIDENCE_SIGNING_KEY", "test-only-key-longer-than-thirty-two-characters")
    for topic in ("stays", "flights"):
        data, snap = begin(system, plan, topic)
        evidence = {**option(system), "title": "旅" * 160, "summary": "旅" * 600,
                    "facts": ["旅" * 240 for _ in range(8)],
                    "criteria": {"check_in": "2027-06-01", "check_out": "2027-06-08", "origin": "FCO", "destination": "MXP", "travelers": 2}}
        comparison = {"options": [evidence]}
        proof = issue_comparison_proof("traveler-one", plan["plan_id"], topic, data["event_id"], snap["brief"]["digest"], comparison)
        response = complete(system, plan, data, snap, topic, comparison=comparison, comparison_proof=proof)
        assert response.status_code == 200, response.text
        snap = response.json()
        choose(system, plan, snap, "prefer", snap["comparison"]["options"][0]["id"], topic)
    response = system.client.get(url(plan))
    assert response.status_code == 200
    brief = response.json()["brief"]
    assert len(json.dumps(brief, ensure_ascii=False).encode()) <= 8192
    assert brief["omitted_places"] > 0
    assert len(brief["accepted_choices"]) == 2
    for accepted in brief["accepted_choices"]:
        assert accepted["criteria"]["check_in"] == "2027-06-01"
        assert accepted["criteria"]["origin"] == "FCO"
        assert len(accepted["facts"]) <= 4 and all(len(fact) <= 160 for fact in accepted["facts"])
        assert accepted["unbooked"] is True
    trip = system.client.get(f"/v1/plans/{plan['plan_id']}/agent-context").json()
    assert trip["accepted_travel_choices"] == brief["accepted_choices"]


def test_reply_comparison_survives_later_reply_and_expires_at_confirmation(system, monkeypatch):
    plan = create(system)
    first = researched(system, plan, monkeypatch)
    earlier = first['messages'][-1]['comparison']['options'][0]
    later = researched(system, plan, monkeypatch, identifier='another-rate')
    assert later['messages'][1]['comparison']['options'][0] == earlier
    assert later['messages'][-1]['comparison']['options'][0]['id'] != earlier['id']
    chosen, _, _ = choose(system, plan, later, 'shortlist', earlier['id'])
    assert chosen['shortlist'][0]['title'] == earlier['title']
    system.current[0] += timedelta(minutes=11)
    body = {'action':'prefer','evidence_id':earlier['id']}
    expired = system.client.post(url(plan)+'/choices/challenge', headers=write_headers(system,chosen['revision']), json=body)
    assert expired.status_code == 409
    assert system.client.get(url(plan)).json()['preferred'] is None


def test_run_idempotency_binds_exact_attached_option(system):
    plan = create(system)
    discussion = {'intent':'discuss','options':[{'search_id':'search-1','option_id':'hotel-1','room_id':'room-1'}]}
    data = {'action':'begin','event_id':str(uuid4()),'message':'Is it refundable?','generation':1,'discussion':discussion}
    started = system.client.post(url(plan)+'/run',json=data)
    assert started.status_code == 200
    changed = {**data,'discussion':{'intent':'discuss','options':[{'search_id':'search-1','option_id':'hotel-1','room_id':'room-2'}]}}
    assert complete(system,plan,changed,started.json()).status_code == 409
    assert complete(system,plan,data,started.json()).status_code == 200
    readback = system.client.get(url(plan)).json()
    assert readback['messages'][0]['content'] == 'Is it refundable?'
    assert readback['messages'][0]['status'] == 'complete' and not readback['locked']
