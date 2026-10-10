"""Test-only canvas booking state through actual CRUD HTTP handlers and storage."""
from copy import deepcopy
from uuid import uuid4

import jwt
import pytest

from .test_api import create, system as system, write_headers


def body():
    card = {"status": "ready", "need": "undecided", "bookingStatus": "not-booked",
            "title": "Destination not set", "subtitle": "Travelers not set",
            "detail": "Dates not set", "availability": "ready"}
    stay = {**card, "bookingStatus": "mock-booked", "mockBooking": {
        "reference": "TEST123", "hotelName": "Ski stay",
        "checkIn": "2027-02-03", "checkOut": "2027-02-07"}}
    return {"context_revision": 1, "snapshot": {"version": 1, "components": {
        "flights": card, "accommodation": stay}, "evidence": {}}}


def test_explicit_mock_booking_save_read_update_and_idempotency(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = body()
    assert system.client.get(path).json()["snapshot"] is None
    assert system.client.put(path, json=payload, headers=write_headers(system, plan["revision"])).status_code == 422
    response = system.client.post(path + "/challenge", json=payload, headers=write_headers(system, plan["revision"]))
    assert response.status_code == 200, response.text
    headers = write_headers(system, plan["revision"], response.json()["challenge"])
    saved = system.client.put(path, json=payload, headers=headers)
    assert saved.status_code == 200, saved.text
    assert system.client.put(path, json=payload, headers=headers).json() == saved.json()
    assert system.client.get(path).json()["snapshot"] == payload["snapshot"]
    changed = deepcopy(payload)
    changed["snapshot"]["components"]["accommodation"]["mockBooking"]["hotelName"] = "Another ski stay"
    stale = system.client.post(path + "/challenge", json=changed, headers=write_headers(system, plan["revision"]))
    assert stale.status_code == 409
    revision = saved.json()["revision"]
    challenge = system.client.post(path + "/challenge", json=changed, headers=write_headers(system, revision))
    assert challenge.status_code == 200
    updated = system.client.put(path, json=changed, headers=write_headers(system, revision, challenge.json()["challenge"]))
    assert updated.status_code == 200, updated.text
    assert system.client.get(path).json()["snapshot"] == changed["snapshot"]


@pytest.mark.parametrize("invalid", ["real", "missing", "flight", "token", "dates", "null"])
def test_invalid_booking_state_rejected_without_persistence(system, invalid):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = body()
    stay = payload["snapshot"]["components"]["accommodation"]
    if invalid == "real": stay["bookingStatus"] = "booked"
    if invalid == "missing": del stay["mockBooking"]
    if invalid == "flight": payload["snapshot"]["components"]["flights"] = stay
    if invalid == "token": stay["mockBooking"]["token"] = "private-checkout-handle"
    if invalid == "dates": stay["mockBooking"]["checkOut"] = "2027-02-01"
    if invalid == "null": stay["mockBooking"] = None
    assert system.client.post(path + "/challenge", json=payload, headers=write_headers(system, plan["revision"])).status_code == 422
    assert system.client.get(path).json()["snapshot"] is None


def test_mock_booking_canvas_access_boundaries(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    for auth, status in [("", 401), ("Bearer " + jwt.encode(system.claims | {"sub": "another-traveler"}, system.private, algorithm="RS256"), 404)]:
        headers = {**write_headers(system, plan["revision"], "test-challenge"), "Authorization": auth}
        assert system.client.get(path, headers=headers).status_code == status
        assert system.client.post(path + "/challenge", json=body(), headers=headers).status_code == status
        assert system.client.put(path, json=body(), headers=headers).status_code == status
    assert system.client.get(f"/v1/plans/{uuid4()}/canvas").status_code == 404


def test_flight_booking_explicit_save_reload_update_and_scope(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = body()
    flight = payload['snapshot']['components']['flights']
    flight.update(bookingStatus='mock-booked', mockBooking={'reference':'TEST_FLIGHT', 'origin':'BUD', 'destination':'FCO', 'departureDate':'2027-02-03', 'returnDate':'2027-02-07'})
    response = system.client.post(path+'/challenge', json=payload, headers=write_headers(system, plan['revision']))
    assert response.status_code == 200, response.text
    headers = write_headers(system, plan['revision'], response.json()['challenge'])
    saved = system.client.put(path,json=payload,headers=headers)
    assert saved.status_code == 200, saved.text
    assert system.client.put(path,json=payload,headers=headers).json() == saved.json()
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    flight['bookingStatus'] = 'not-booked'; del flight['mockBooking']
    assert system.client.post(path+'/challenge',json=payload,headers=write_headers(system,plan['revision'])).status_code == 409
    revision = saved.json()['revision']
    challenge = system.client.post(path+'/challenge',json=payload,headers=write_headers(system,revision)).json()['challenge']
    assert system.client.put(path,json=payload,headers=write_headers(system,revision,challenge)).status_code == 200
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
