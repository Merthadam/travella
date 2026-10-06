"""Real HTTP/encrypted SQL; provider fixtures never mutate a live account."""
import json
from uuid import uuid4

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError
from services.auth.tests.test_account import account, proof, PATH


def password_body(a, **changes):
    return dict(current_password='fixture-current', new_password='fixture-new-password',
                verification_id=proof(a, 'password_change'), event_id=str(uuid4()), **changes)


def test_password_acknowledgement_is_journaled_without_secrets(account):
    a = account
    data = password_body(a)
    result = a.client.post(PATH + '/password', json=data)
    assert result.status_code == 200
    assert result.json()['state'] == 'complete'
    assert a.client.post(PATH + '/password', json=data).json()['state'] == 'complete'
    a.provider.change_password.assert_called_once_with('access', 'fixture-current', 'fixture-new-password')
    assert a.client.post(PATH + '/operation-status', json={'event_id': data['event_id']}).json()['state'] == 'complete'
    for row in a.store.db.execute('SELECT payload FROM auth_sessions').fetchall():
        decrypted = a.store.cipher.decrypt(row[0]).decode()
        assert 'fixture-current' not in decrypted and 'fixture-new-password' not in decrypted
    assert a.store.get(a.sid, a.now[0]) is not None


def test_password_unknown_is_never_resubmitted(account):
    a = account
    a.provider.change_password.side_effect = EndpointConnectionError(endpoint_url='https://private.test')
    data = password_body(a)
    result = a.client.post(PATH + '/password', json=data)
    assert result.status_code == 503 and result.json()['code'] == 'result_unknown'
    again = a.client.post(PATH + '/password', json=data)
    assert again.json()['state'] == 'result_unknown'
    assert a.client.post(PATH + '/operation-status', json={'event_id': data['event_id']}).json()['state'] == 'result_unknown'
    a.provider.change_password.assert_called_once()


@pytest.mark.parametrize('code, expected', [('NotAuthorizedException', 'current_password_incorrect'), ('InvalidPasswordException', 'password_policy'), ('PasswordHistoryPolicyViolationException', 'password_policy')])
def test_password_rejections_preserve_session_and_sanitize(account, caplog, code, expected):
    a = account
    a.provider.change_password.side_effect = ClientError({'Error': {'Code': code, 'Message': 'provider-secret'}}, 'ChangePassword')
    result = a.client.post(PATH + '/password', json=password_body(a))
    assert result.status_code == 400 and result.json()['code'] == expected
    assert 'provider-secret' not in result.text + caplog.text
    assert a.store.get(a.sid, a.now[0]) is not None


@pytest.mark.parametrize('kind', ['wrong-purpose', 'expired', 'other-session', 'missing'])
def test_password_rejects_unusable_proof(account, kind):
    a = account
    data = password_body(a)
    if kind == 'wrong-purpose': data['verification_id'] = proof(a, 'email_change')
    if kind == 'expired': a.now[0] += 301
    if kind == 'other-session':
        another = a.store.create(a.store.get(a.sid, a.now[0]), 10000, a.now[0])
        a.client.cookies.set('__Host-travella', another)
    if kind == 'missing': data['verification_id'] = 'missing'
    assert a.client.post(PATH + '/password', json=data).status_code == 403
    a.provider.change_password.assert_not_called()


def test_password_status_is_session_bound_and_payload_validation_private(account):
    a = account
    data = password_body(a)
    assert a.client.post(PATH + '/password', json=data).status_code == 200
    another = a.store.create(a.store.get(a.sid, a.now[0]), 10000, a.now[0])
    a.client.cookies.set('__Host-travella', another)
    assert a.client.post(PATH + '/operation-status', json={'event_id': data['event_id']}).json()['state'] == 'not_found'
    invalid = a.client.post(PATH + '/password', json=data | {'subject': 'victim-secret'})
    assert invalid.status_code == 422 and 'fixture-current' not in invalid.text and 'victim-secret' not in invalid.text
    a.client.cookies.clear()
    assert a.client.post(PATH + '/password', json=data).status_code == 401
