from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from services.auth.api import create_app
from services.auth.contracts import ValidatedIdentity
from services.auth.session_store import SessionStore

ORIGIN = 'https://travella.test'
PATH = '/auth/account'


@pytest.fixture
def account(tmp_path):
    now = [1000.0]
    attrs = {'sub': 'one', 'email': 'old@example.com', 'email_verified': 'true',
             'given_name': 'Ada', 'family_name': 'Traveler'}
    provider = Mock()
    provider.get_user.side_effect = lambda access: {'Username': 'canonical-user', 'UserAttributes': [
        {'Name': k, 'Value': v} for k, v in attrs.items()], 'UserMFASettingList': []}
    provider.sign_in.return_value = {'AuthenticationResult': {'AccessToken': 'access', 'RefreshToken': 'temporary'}}
    provider.update_names.side_effect = lambda access, first, last: attrs.update(given_name=first, family_name=last)
    provider.account_configuration.return_value = {'pool': {'UserAttributeUpdateSettings': {
        'AttributesRequireVerificationBeforeUpdate': []}, 'AutoVerifiedAttributes': ['email']}, 'client': {}, 'mfa': {}}
    verifier = Mock(return_value=ValidatedIdentity('one', 'client', frozenset(), 900, 9000))
    store = SessionStore(str(tmp_path / 'account.db'), Fernet.generate_key().decode())
    sid = store.create({'kind': 'session', 'subject': 'one', 'email': attrs['email'], 'access': 'access',
                        'refresh': 'original', 'started': 900, 'access_expires': 9000}, 10000, now[0])
    app = create_app(provider, verifier, store, origin=ORIGIN, clock=lambda: now[0])
    with TestClient(app, base_url=ORIGIN, headers={'origin': ORIGIN, 'x-travella-request': '1'}) as client:
        client.cookies.set('__Host-travella', sid)
        yield SimpleNamespace(client=client, provider=provider, store=store, attrs=attrs, now=now, sid=sid, verifier=verifier)
    store.close()


def test_canonical_account_and_name_readback(account):
    a = account
    result = a.client.get(PATH)
    assert result.status_code == 200
    assert result.json()['identity'] == {'first_name': 'Ada', 'last_name': 'Traveler', 'email': 'old@example.com', 'email_verified': True}
    assert result.json()['capabilities']['email_change']['available'] is False
    assert result.headers['cache-control'] == 'no-store'
    assert 'canonical-user' not in result.text and 'access' not in result.text
    data = {'first_name': ' Grace ', 'last_name': 'Hopper', 'expected_names': {'first_name': 'Ada', 'last_name': 'Traveler'}, 'event_id': str(uuid4())}
    saved = a.client.patch(PATH + '/name', json=data)
    assert saved.status_code == 200
    assert saved.json()['identity']['first_name'] == 'Grace'
    assert a.client.get(PATH).json()['identity']['last_name'] == 'Hopper'
    assert a.client.patch(PATH + '/name', json=data).status_code == 200
    a.provider.update_names.assert_called_once_with('access', 'Grace', 'Hopper')
    assert a.client.patch(PATH + '/name', json=data | {'last_name': 'Changed'}).json()['code'] == 'request_reused'


def test_name_conflict_and_false_readback(account):
    a = account
    data = {'first_name': 'Grace', 'last_name': 'Hopper', 'expected_names': {'first_name': 'Old', 'last_name': 'Traveler'}, 'event_id': str(uuid4())}
    assert a.client.patch(PATH + '/name', json=data).status_code == 409
    a.provider.update_names.assert_not_called()
    data['expected_names']['first_name'] = 'Ada'
    a.provider.update_names.side_effect = None
    assert a.client.patch(PATH + '/name', json=data).json()['code'] == 'result_unknown'


def test_unsafe_email_cannot_write_and_validation_is_private(account):
    a = account
    response = a.client.post(PATH + '/email/start', json={'new_email': 'new@example.com', 'verification_id': 'bad', 'event_id': str(uuid4())})
    assert response.status_code == 503
    assert response.json()['code'] == 'capability_unavailable'
    a.provider.update_email.assert_not_called()
    response = a.client.patch(PATH + '/name', json={'first_name': 'secret-in-extra', 'subject': 'other'})
    assert response.status_code == 422 and 'secret-in-extra' not in response.text


@pytest.mark.parametrize('configuration', [None, {}, {'pool': {}, 'client': {}, 'mfa': {}},
    {'pool': {'UserAttributeUpdateSettings': {'AttributesRequireVerificationBeforeUpdate': 'email'}, 'AutoVerifiedAttributes': ['email']}, 'client': {}, 'mfa': {}}])
def test_unknown_or_malformed_capability_fails_closed(account, configuration):
    account.provider.account_configuration.return_value = configuration
    result = account.client.get(PATH)
    assert result.status_code == 200
    assert result.json()['capabilities']['email_change']['available'] is False


def test_provider_permission_error_does_not_hide_names(account):
    from botocore.exceptions import ClientError
    account.provider.account_configuration.side_effect = ClientError({'Error': {'Code': 'AccessDeniedException', 'Message': 'private'}}, 'Read')
    assert account.client.get(PATH).json()['identity']['first_name'] == 'Ada'


def safe_email(a):
    a.provider.account_configuration.return_value['pool']['UserAttributeUpdateSettings']['AttributesRequireVerificationBeforeUpdate'] = ['email']


def proof(a, purpose='email_change'):
    result = a.client.post(PATH + '/verification', json={'purpose': purpose, 'password': 'fixture-password'})
    assert result.status_code == 200
    return result.json()['verification_id']


def start_email(a, verification_id=None):
    return a.client.post(PATH + '/email/start', json={'new_email': 'new@example.com',
        'verification_id': verification_id or proof(a), 'event_id': str(uuid4())})


def test_session_bound_email_journey_preserves_old_email_until_verified(account):
    a = account
    safe_email(a)
    a.store.put_recovery_codes('one', 'old@example.com', ['hash-one'], a.now[0])
    expiry = a.store.expiry(a.sid)
    verified = proof(a)
    a.provider.sign_in.assert_called_with('canonical-user', 'fixture-password')
    a.provider.revoke.assert_called_once_with('temporary')
    result = start_email(a, verified)
    assert result.status_code == 200
    operation = result.json()['operation_id']
    assert result.json()['account']['identity']['email'] == 'old@example.com'
    assert a.client.get(PATH).json()['pending_email']['operation_id'] == operation
    assert a.client.post(PATH + '/email/resend', json={'operation_id': operation}).json()['state'] == 'awaiting_verification'
    a.provider.verify_email.side_effect = lambda access, code: a.attrs.update(email='new@example.com')
    result = a.client.post(PATH + '/email/verify', json={'operation_id': operation, 'code': '123456'})
    assert result.status_code == 200 and result.json()['state'] == 'complete'
    assert a.store.get(a.sid, a.now[0])['email'] == 'new@example.com'
    assert a.store.expiry(a.sid) == expiry
    assert a.store.recovery_count('one') == 1
    assert a.client.cookies.get('__Host-travella') == a.sid
    assert start_email(a, verified).status_code == 403


def test_verification_requires_same_subject_and_purpose(account):
    a = account
    safe_email(a)
    wrong = proof(a, 'password_change')
    assert start_email(a, wrong).status_code == 403
    a.verifier.side_effect = lambda access: ValidatedIdentity('other' if access == 'fresh-other' else 'one', 'client', frozenset(), 900, 9000)
    a.provider.sign_in.return_value['AuthenticationResult']['AccessToken'] = 'fresh-other'
    result = a.client.post(PATH + '/verification', json={'purpose': 'email_change', 'password': 'fixture-password'})
    assert result.status_code == 400 and result.json()['code'] == 'verification_failed'
    assert 'set-cookie' not in result.headers
    a.provider.update_email.assert_not_called()


def test_totp_required_before_proof_and_challenge_is_single_use(account):
    a = account
    safe_email(a)
    a.provider.sign_in.return_value = {'ChallengeName': 'SOFTWARE_TOKEN_MFA', 'Session': 'secret-challenge', 'ChallengeParameters': {'USER_ID_FOR_SRP': 'canonical-user'}}
    a.provider.answer_challenge.return_value = {'AuthenticationResult': {'AccessToken': 'access', 'RefreshToken': 'temporary'}}
    result = a.client.post(PATH + '/verification', json={'purpose': 'email_change', 'password': 'fixture-password'})
    assert result.json()['state'] == 'mfa_required'
    verification = result.json()['verification_id']
    assert start_email(a, verification).status_code == 403
    result = a.client.post(PATH + '/verification/complete', json={'verification_id': verification, 'code': '123456'})
    assert result.json()['state'] == 'verified'
    assert a.client.post(PATH + '/verification/complete', json={'verification_id': verification, 'code': '123456'}).status_code == 403
    assert start_email(a, verification).status_code == 200


def test_expired_proof_and_other_session_cannot_start_or_resume(account):
    a = account
    safe_email(a)
    verification = proof(a)
    a.now[0] += 301
    assert start_email(a, verification).status_code == 403
    result = start_email(a)
    assert result.status_code == 200
    operation = result.json()['operation_id']
    another = a.store.create(a.store.get(a.sid, a.now[0]), 10000, a.now[0])
    a.client.cookies.set('__Host-travella', another)
    pending = a.client.get(PATH).json()['pending_email']
    assert pending == {'operation_id': None, 'new_email': None, 'state': 'awaiting_verification', 'resumable': False}
    assert a.client.post(PATH + '/email/verify', json={'operation_id': operation, 'code': '123456'}).status_code == 403
    assert start_email(a).json()['code'] == 'operation_pending'


def test_future_login_uses_canonical_email_not_submitted_alias(account):
    a = account
    a.attrs['email'] = 'canonical@example.com'
    result = a.client.post('/auth/sign-in', json={'email': 'alias@example.com', 'password': 'fixture-password'})
    assert result.status_code == 200
    assert a.store.get(result.cookies.get('__Host-travella'), a.now[0])['email'] == 'canonical@example.com'


def test_sql_failure_after_provider_success_repairs_on_read_without_repeat(account, monkeypatch):
    from sqlalchemy.exc import OperationalError
    a = account
    safe_email(a)
    other = a.store.create({'kind': 'session', 'subject': 'other', 'email': 'unrelated@example.com'}, 5000, a.now[0])
    sibling = a.store.create(a.store.get(a.sid, a.now[0]), 6000, a.now[0])
    a.store.put_recovery_codes('one', 'old@example.com', ['hash-one', 'hash-two'], a.now[0])
    operation = start_email(a).json()['operation_id']
    original = a.store.reconcile_email
    monkeypatch.setattr(a.store, 'reconcile_email', Mock(side_effect=OperationalError('fixture', {}, Exception('private'))))
    a.provider.verify_email.side_effect = lambda access, code: a.attrs.update(email='new@example.com')
    result = a.client.post(PATH + '/email/verify', json={'operation_id': operation, 'code': '123456'})
    assert result.status_code == 503 and result.json()['code'] == 'result_unknown'
    assert a.store.get(sibling, a.now[0])['email'] == 'old@example.com'
    monkeypatch.setattr(a.store, 'reconcile_email', original)
    readback = a.client.get(PATH)
    assert readback.status_code == 200 and readback.json()['pending_email'] is None
    assert a.store.get(sibling, a.now[0])['email'] == 'new@example.com'
    assert a.store.expiry(sibling) == 6000
    assert a.store.get(other, a.now[0])['email'] == 'unrelated@example.com'
    import json
    row = a.store.db.execute('SELECT email, payload FROM auth_recovery_codes WHERE subject="one"').fetchone()
    assert row[0] == 'new@example.com'
    assert json.loads(a.store.cipher.decrypt(row[1])) == {'email': 'new@example.com', 'hashes': ['hash-one', 'hash-two']}
    a.provider.update_email.assert_called_once()
    a.provider.verify_email.assert_called_once()


def test_reset_repairs_pending_canonical_email_before_invalidating_sessions(account):
    a = account
    safe_email(a)
    start_email(a)
    a.attrs['email'] = 'new@example.com'  # provider completed before process/local receipt
    result = a.client.post('/auth/reset-password', json={'email': 'new@example.com', 'code': 'fixture-code', 'new_password': 'fixture-password'})
    assert result.status_code == 200
    assert a.store.get(a.sid, a.now[0]) is None
    a.provider.global_sign_out.assert_called_once_with('access')
