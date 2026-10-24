from uuid import uuid4

import jwt
import pytest

from services.agent.canvas_contracts import CanvasPin
from .test_api import create, mutate, system as system, write_headers
from .test_place_websites import draft, save


def details(summary='Original Google description — unchanged.'):
    return {'summary': summary, 'language': 'en', 'placeId': 'exact-google-place-id'}


def test_google_details_persist_with_pin_updates_removal_and_plan_recovery(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = draft()
    pin = payload['snapshot']['components']['map']['pins'][0]
    pin['googleDetails'] = details()
    assert CanvasPin.model_validate(pin).googleDetails.summary == details()['summary']
    revision = save(system, path, payload, plan['revision'])
    pin['category'] = 'food'
    revision = save(system, path, payload, revision)
    payload['snapshot']['components']['map']['pins'] = []
    revision = save(system, path, payload, revision)
    assert system.client.get(path).json()['snapshot']['components']['map']['pins'] == []
    payload['snapshot']['components']['map']['pins'] = [pin]
    save(system, path, payload, revision)
    latest = system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    deleted = mutate(system, latest, 'delete').json()
    assert system.client.get(path).status_code == 404
    mutate(system, deleted, 'restore')
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']


def test_successful_lookup_without_description_is_remembered_and_old_pins_remain_valid(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = draft()
    revision = save(system, path, payload, plan['revision'])
    payload['snapshot']['components']['map']['pins'][0]['googleDetails'] = details(None)
    save(system, path, payload, revision)


@pytest.mark.parametrize('bad', [
    {'summary': 'x' * 10001, 'placeId': 'id'},
    {'summary': 'Original', 'placeId': ''},
    {'summary': 'Original', 'placeId': 'id', 'language': 'x' * 81},
    {'summary': ['invalid'], 'placeId': 'id'},
    {'summary': 'Original', 'placeId': 'id', 'unexpected': True},
])
def test_invalid_google_details_do_not_mutate_the_draft(system, bad):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    before = system.client.get(path).json()
    payload = draft()
    payload['snapshot']['components']['map']['pins'][0]['googleDetails'] = bad
    assert system.client.post(path + '/challenge', json=payload, headers=write_headers(system, plan['revision'])).status_code == 422
    assert system.client.get(path).json() == before


def test_saved_google_details_remain_private(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = draft()
    payload['snapshot']['components']['map']['pins'][0]['googleDetails'] = details()
    revision = save(system, path, payload, plan['revision'])
    for auth, status in [('', 401), ('Bearer ' + jwt.encode(system.claims | {'sub': 'other'}, system.private, algorithm='RS256'), 404)]:
        headers = {**write_headers(system, revision, 'invalid'), 'Authorization': auth}
        assert system.client.get(path, headers=headers).status_code == status
        assert system.client.post(path + '/challenge', json=payload, headers=headers).status_code == status
        assert system.client.put(path, json=payload, headers=headers).status_code == status
    assert system.client.get(f'/v1/plans/{uuid4()}/canvas').status_code == 404
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
