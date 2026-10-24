from uuid import uuid4

import jwt
import pytest

from .test_api import create, mutate, system as system, write_headers


def draft(website='https://example.org/garden'):
    return {'context_revision': 1, 'snapshot': {'version': 1, 'components': {
        'map': {'status': 'ready', 'destination': 'Milan', 'final': False, 'pins': [
            {'id': 'garden', 'name': 'Garden', 'category': 'activity', 'position': {'lat': 45.4, 'lng': 9.2}, 'description': 'Morning walk', 'website': website}]},
        'links': {'status': 'ready', 'items': [{'id': 'garden-site', 'placeId': 'garden', 'title': 'Garden', 'url': website, 'purpose': 'Opening hours', 'category': 'official'}]},
    }, 'evidence': {}}}


def save(system, path, payload, revision):
    challenge = system.client.post(path + '/challenge', json=payload, headers=write_headers(system, revision))
    assert challenge.status_code == 200, challenge.text
    headers = write_headers(system, revision, challenge.json()['challenge'])
    result = system.client.put(path, json=payload, headers=headers)
    assert result.status_code == 200, result.text
    assert system.client.put(path, json=payload, headers=headers).json() == result.json()
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    return result.json()['revision']


@pytest.mark.parametrize('website', ['https://example.org/garden', 'http://example.org/'])
def test_website_persists_updates_and_recovers_with_its_plan(system, website):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = draft(website)
    revision = save(system, path, payload, plan['revision'])
    payload['snapshot']['components']['map']['pins'][0]['description'] = 'Updated note'
    revision = save(system, path, payload, revision)
    latest = system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    deleted = mutate(system, latest, 'delete').json()
    assert system.client.get(path).status_code == 404
    mutate(system, deleted, 'restore')
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']


@pytest.mark.parametrize('website', ['javascript:alert(1)', 'https://user:secret@example.org', 'https://127.0.0.1', 'http://test.local', 'https://example.org:99', 'https://example.org\\@evil.org', 'https://example.org/\n'])
def test_unsafe_websites_rejected_without_mutation(system, website):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    before = system.client.get(path).json()
    for field in ['pin', 'link']:
        payload = draft()
        if field == 'pin': payload['snapshot']['components']['map']['pins'][0]['website'] = website
        else: payload['snapshot']['components']['links']['items'][0]['url'] = website
        assert system.client.post(path + '/challenge', json=payload, headers=write_headers(system, plan['revision'])).status_code == 422
    assert system.client.get(path).json() == before


def test_websites_keep_authorization_and_old_snapshots_work(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = draft()
    for auth, status in [('', 401), ('Bearer ' + jwt.encode(system.claims | {'sub': 'other'}, system.private, algorithm='RS256'), 404)]:
        headers = {**write_headers(system, plan['revision'], 'invalid'), 'Authorization': auth}
        assert system.client.get(path, headers=headers).status_code == status
        assert system.client.post(path + '/challenge', json=payload, headers=headers).status_code == status
        assert system.client.put(path, json=payload, headers=headers).status_code == status
    assert system.client.get(f'/v1/plans/{uuid4()}/canvas').status_code == 404
    del payload['snapshot']['components']['map']['pins'][0]['website']
    payload['snapshot']['components']['links']['items'] = []
    save(system, path, payload, plan['revision'])
