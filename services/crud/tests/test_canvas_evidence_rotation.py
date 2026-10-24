"""Previously verified draft research survives key rotation without accepting new claims."""
from copy import deepcopy
from uuid import uuid4

import jwt

from services.crud.canvas import issue_canvas_evidence
from .test_api import create, system as system, write_headers


def signed_draft(system, monkeypatch):
    monkeypatch.setenv('CANVAS_EVIDENCE_SIGNING_KEY', 'old-key-' * 8)
    plan = create(system)
    components = {'findings': {'status': 'ready', 'items': [{'id': 'research', 'title': 'Opening hours',
        'summary': 'Check the official site', 'sources': [{'title': 'Official', 'url': 'https://example.org/hours'}],
        'certainty': 'supported'}]}, 'themes': {'status': 'ready', 'items': []}}
    evidence = issue_canvas_evidence(system.claims['sub'], plan['plan_id'], components)
    payload = {'context_revision': 1, 'snapshot': {'version': 1, 'components': components, 'evidence': evidence}}
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    challenge = system.client.post(path + '/challenge', json=payload, headers=write_headers(system, plan['revision']))
    assert challenge.status_code == 200
    saved = system.client.put(path, json=payload, headers=write_headers(system, plan['revision'], challenge.json()['challenge']))
    assert saved.status_code == 200
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    monkeypatch.setenv('CANVAS_EVIDENCE_SIGNING_KEY', 'new-key-' * 8)
    return path, payload, saved.json()['revision']


def test_existing_verified_research_survives_rotation_and_other_draft_updates(system, monkeypatch):
    path, payload, revision = signed_draft(system, monkeypatch)
    payload['snapshot']['components']['themes']['items'] = [{'id': 'walk', 'kind': 'theme', 'text': 'Quiet walks', 'source': 'You'}]
    challenge = system.client.post(path + '/challenge', json=payload, headers=write_headers(system, revision))
    assert challenge.status_code == 200, challenge.text
    headers = write_headers(system, revision, challenge.json()['challenge'])
    saved = system.client.put(path, json=payload, headers=headers)
    assert saved.status_code == 200, saved.text
    assert system.client.put(path, json=payload, headers=headers).json() == saved.json()
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    # A stale writer still cannot replace the newly saved draft.
    assert system.client.post(path + '/challenge', json=payload, headers=write_headers(system, revision)).status_code == 409


def test_rotation_does_not_authorize_modified_claims_or_copied_proofs(system, monkeypatch):
    path, payload, revision = signed_draft(system, monkeypatch)
    before = system.client.get(path).json()
    changed = deepcopy(payload)
    changed['snapshot']['components']['findings']['items'][0]['summary'] = 'Unverified new claim'
    variants = [changed]
    changed = deepcopy(payload)
    changed['snapshot']['evidence']['research'] = '0' * 64
    variants.append(changed)
    changed = deepcopy(payload)
    changed['snapshot']['components']['findings']['items'][0]['certainty'] = 'conflicting'
    variants.append(changed)
    for value in variants:
        rejected = system.client.post(path + '/challenge', json=value, headers=write_headers(system, revision))
        assert rejected.status_code == 422
        assert rejected.json()['code'] == 'canvas_evidence_invalid'
    other = create(system)
    assert system.client.post(f"/v1/plans/{other['plan_id']}/canvas/challenge", json=payload,
        headers=write_headers(system, other['revision'])).status_code == 422
    assert system.client.get(path).json() == before


def test_persisted_proof_still_requires_resource_authorization(system, monkeypatch):
    path, payload, revision = signed_draft(system, monkeypatch)
    for auth, status in [('', 401), ('Bearer ' + jwt.encode(system.claims | {'sub': 'other'}, system.private, algorithm='RS256'), 404)]:
        headers = {**write_headers(system, revision, 'not-a-challenge'), 'Authorization': auth}
        assert system.client.get(path, headers=headers).status_code == status
        assert system.client.post(path + '/challenge', json=payload, headers=headers).status_code == status
        assert system.client.put(path, json=payload, headers=headers).status_code == status
    assert system.client.post(f'/v1/plans/{uuid4()}/canvas/challenge', json=payload, headers=write_headers(system, revision)).status_code == 404
