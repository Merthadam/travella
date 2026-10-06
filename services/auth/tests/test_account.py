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
