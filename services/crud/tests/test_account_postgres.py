"""Real HTTP handlers and independent connections to guarded disposable PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import jwt
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from services.auth.api import create_app as auth_app
from services.auth.contracts import ValidatedIdentity
from services.auth.session_store import SessionStore
from services.auth.tests.test_account import ORIGIN, PATH
from services.auth.tests.test_account_security import security_proof
from services.crud.models import TravelerProfile
from services.crud.tests.test_api_postgres import _build_system, _headers


def race(function, values):
    barrier = Barrier(len(values))
    def run(value):
        barrier.wait(timeout=10)
        return function(value)
    with ThreadPoolExecutor(max_workers=len(values)) as pool:
        return list(pool.map(run, values))


def test_postgres_profile_concurrency_replay_and_subject_isolation(postgres_engine):
    system = _build_system(postgres_engine)
    path = '/v1/traveler-profile'
    with system.client as client:
        plan = client.post('/v1/plans', headers=_headers()).json()
        body = {'section': 'needs', 'values': {'food_needs': 'Vegetarian', 'accessibility_needs': ''},
                'expected_revision': 0, 'event_id': str(uuid4())}
        def save(data):
            with TestClient(client.app, headers=dict(client.headers)) as peer:
                return peer.patch(path + '/sections', json=data)
        results = race(save, [body, body | {'event_id': str(uuid4())}])
        assert sorted(r.status_code for r in results) == [200, 409]
        saved = next(r.json() for r in results if r.status_code == 200)
        assert saved['revision'] == 1
        replay = body | {'expected_revision': 1, 'event_id': str(uuid4()),
                         'values': {'food_needs': '', 'accessibility_needs': 'Step-free'}}
        results = race(save, [replay, replay])
        assert [r.status_code for r in results] == [200, 200]
        assert results[0].json() == results[1].json()
        assert client.get(path).json()['revision'] == 2
        foreign_token = jwt.encode(system.claims | {'sub': 'other-traveler'}, system.private, algorithm='RS256')
        with TestClient(client.app, headers={'Authorization': f'Bearer {foreign_token}'}) as foreign:
            assert foreign.patch(path + '/sections', json=body).status_code == 200
            assert foreign.get(path).json()['revision'] == 1
            assert foreign.get(f"/v1/plans/{plan['plan_id']}").status_code == 404
        assert client.get(f"/v1/plans/{plan['plan_id']}").json() == plan
        with system.factory() as db:
            one = db.get(TravelerProfile, 'postgres-traveler').payload
            other = db.get(TravelerProfile, 'other-traveler').payload
            assert one['revision'] == 2 and len(one['_account_events']) == 2
            assert one['food_needs'] == '' and one['accessibility_needs'] == 'Step-free'
            assert other['food_needs'] == 'Vegetarian' and len(other['_account_events']) == 1


def test_postgres_recovery_rotation_across_independent_stores(postgres_engine):
    key = Fernet.generate_key().decode()
    url = postgres_engine.url.render_as_string(hide_password=False)
    stores = [SessionStore(url, key), SessionStore(url, key)]
    now = 1000.0
    provider = Mock()
    provider.get_user.return_value = {'Username': 'fixture-user', 'UserAttributes': [
        {'Name': 'sub', 'Value': 'one'}, {'Name': 'email', 'Value': 'fixture@example.test'},
        {'Name': 'email_verified', 'Value': 'true'}], 'UserMFASettingList': ['SOFTWARE_TOKEN_MFA']}
    provider.account_configuration.return_value = {'pool': {}, 'client': {},
        'mfa': {'MfaConfiguration': 'OPTIONAL', 'SoftwareTokenMfaConfiguration': {'Enabled': True}}}
    provider.sign_in.return_value = {'ChallengeName': 'SOFTWARE_TOKEN_MFA', 'Session': 'fixture-challenge',
                                    'ChallengeParameters': {'USERNAME': 'fixture-user'}}
    provider.answer_challenge.return_value = {'AuthenticationResult': {'AccessToken': 'fixture-access', 'RefreshToken': 'fixture-refresh'}}
    verifier = Mock(return_value=ValidatedIdentity('one', 'client', frozenset(), 900, 9000))
    sid = stores[0].create({'kind': 'session', 'subject': 'one', 'email': 'fixture@example.test',
        'access': 'fixture-access', 'refresh': 'fixture-original', 'started': 900, 'access_expires': 9000}, 10000, now)
    clients = []
    try:
        for store in stores:
            client = TestClient(auth_app(provider, verifier, store, origin=ORIGIN, clock=lambda: now),
                                base_url=ORIGIN, headers={'origin': ORIGIN, 'x-travella-request': '1'})
            client.cookies.set('__Host-travella', sid)
            clients.append(client)
        stores[0].put_recovery_codes('one', 'fixture@example.test', ['old-hash'], now)
        stores[0].put_recovery_codes('other', 'other@example.test', ['untouched'], now)
        data = {'verification_id': security_proof(SimpleNamespace(client=clients[0]), 'recovery_rotate'), 'event_id': str(uuid4())}
        results = race(lambda client: client.post(PATH + '/recovery-codes/rotate', json=data), clients)
        assert sorted(r.status_code for r in results) == [200, 409]
        codes = next(r.json()['codes'] for r in results if r.status_code == 200)
        assert len(codes) == len(set(codes)) == 10
        assert stores[1].recovery_count('one') == 10 and stores[1].recovery_count('other') == 1
        receipts = [r for r in stores[1].account_records('one', now) if r.get('event_id') == data['event_id']]
        assert len(receipts) == 1 and receipts[0]['status'] == 'complete'
        assert not stores[1].consume_recovery_code('one', 'old-hash')
        assert stores[1].consume_recovery_code('one', stores[1].digest(codes[0]))
        assert not stores[0].consume_recovery_code('one', stores[0].digest(codes[0]))
        for table in ('auth_sessions', 'auth_recovery_codes'):
            for row in stores[0].db.execute(f'SELECT payload FROM {table}').fetchall():
                encrypted = bytes(row[0])
                assert b'fixture-access' not in encrypted and b'fixture@example.test' not in encrypted
                plaintext = stores[0].cipher.decrypt(encrypted).decode()
                assert all(code not in plaintext for code in codes)
        # A valid cookie for another subject cannot discover or reuse the original receipt/proof.
        other_sid = stores[0].create({'kind': 'session', 'subject': 'other', 'email': 'other@example.test',
            'access': 'other-access', 'refresh': 'other-refresh', 'started': 900, 'access_expires': 9000}, 10000, now)
        clients[1].cookies.set('__Host-travella', other_sid)
        verifier.return_value = ValidatedIdentity('other', 'client', frozenset(), 900, 9000)
        provider.get_user.return_value['UserAttributes'][0]['Value'] = 'other'
        assert clients[1].post(PATH + '/operation-status', json={'event_id': data['event_id']}).json()['state'] == 'not_found'
        assert clients[1].post(PATH + '/recovery-codes/rotate', json=data).status_code == 403
        assert stores[0].recovery_count('other') == 1
    finally:
        for client in clients: client.close()
        for store in stores: store.close()
