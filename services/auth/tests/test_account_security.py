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


def mfa_provider(a, enabled=False, required=False):
    state = {'enabled': enabled}
    original = a.provider.get_user.side_effect
    a.provider.get_user.side_effect = lambda access: original(access) | {'UserMFASettingList': ['SOFTWARE_TOKEN_MFA'] if state['enabled'] else []}
    a.provider.account_configuration.return_value['mfa'] = {'MfaConfiguration': 'ON' if required else 'OPTIONAL', 'SoftwareTokenMfaConfiguration': {'Enabled': True}}
    a.provider.associate_software_token.return_value = {'SecretCode': 'FIXTURESETUPKEY'}
    a.provider.verify_software_token.return_value = {'Status': 'SUCCESS'}
    a.provider.set_software_token_preference.side_effect = lambda access, enabled: state.update(enabled=enabled)
    if enabled:
        a.provider.sign_in.return_value = {'ChallengeName': 'SOFTWARE_TOKEN_MFA', 'Session': 'private-challenge', 'ChallengeParameters': {'USERNAME': 'canonical-user'}}
        a.provider.answer_challenge.return_value = {'AuthenticationResult': {'AccessToken': 'access', 'RefreshToken': 'temporary'}}
    return state


def security_proof(a, purpose):
    response = a.client.post(PATH + '/verification', json={'purpose': purpose, 'password': 'fixture-password'}).json()
    if response['state'] == 'mfa_required':
        assert a.client.post(PATH + '/verification/complete', json={'verification_id': response['verification_id'], 'code': '123456'}).json()['state'] == 'verified'
    return response['verification_id']


def start_mfa(a, mode='setup'):
    body = {'mode': mode, 'verification_id': security_proof(a, 'mfa_' + mode), 'event_id': str(uuid4())}
    return body, a.client.post(PATH + '/authenticator/start', json=body)


@pytest.mark.parametrize('mode', ['setup', 'replace'])
def test_authenticator_requires_verify_preference_and_readback(account, mode):
    a = account
    mfa_provider(a, mode == 'replace')
    body, result = start_mfa(a, mode)
    assert result.status_code == 200
    assert result.json()['secret_code'] == 'FIXTURESETUPKEY'
    operation = result.json()['operation_id']
    assert a.client.post(PATH + '/authenticator/start', json=body).status_code == 409
    assert 'FIXTURESETUPKEY' not in a.client.get(PATH).text
    result = a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'})
    assert result.status_code == 200 and result.json()['account']['mfa']['status'] == 'on'
    a.provider.verify_software_token.assert_called_once_with('123456', access_token='access')
    a.provider.set_software_token_preference.assert_called_once_with('access', True)
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'}).json()['state'] == 'complete'
    a.provider.verify_software_token.assert_called_once()
    for row in a.store.db.execute('SELECT payload FROM auth_sessions').fetchall():
        assert 'FIXTURESETUPKEY' not in a.store.cipher.decrypt(row[0]).decode()


def test_authenticator_partial_activation_and_wrong_code_never_claim_success(account):
    a = account
    mfa_provider(a)
    body, result = start_mfa(a)
    assert result.status_code == 200
    operation = result.json()['operation_id']
    a.provider.verify_software_token.return_value = {'Status': 'ERROR'}
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '111111'}).status_code == 400
    a.provider.set_software_token_preference.assert_not_called()
    a.provider.verify_software_token.return_value = {'Status': 'SUCCESS'}
    a.provider.set_software_token_preference.side_effect = EndpointConnectionError(endpoint_url='https://private.test')
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'}).json()['code'] == 'result_unknown'
    assert a.client.get(PATH).json()['mfa']['status'] == 'unavailable'
    status = a.client.post(PATH + '/operation-status', json={'event_id': body['event_id']}).json()
    assert status['state'] == 'result_unknown'
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'}).json()['state'] == 'result_unknown'
    assert a.provider.verify_software_token.call_count == 2
    a.provider.set_software_token_preference.assert_called_once()


def test_enrollment_expiry_other_session_and_legacy_routes_cannot_bypass(account):
    a = account
    mfa_provider(a)
    assert a.client.post('/auth/mfa/enrollment/start', json={}).status_code == 422
    assert a.client.post('/auth/mfa/enrollment/verify', json={'code': '123456'}).status_code == 422
    a.provider.associate_software_token.assert_not_called()
    body, result = start_mfa(a)
    assert result.status_code == 200
    operation = result.json()['operation_id']
    a.now[0] += 301
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'}).status_code == 400
    a.provider.verify_software_token.assert_not_called()


@pytest.mark.parametrize('required', [False, True])
def test_disable_is_proof_and_policy_guarded(account, required):
    a = account
    mfa_provider(a, True, required)
    body = {'verification_id': security_proof(a, 'mfa_disable'), 'event_id': str(uuid4())}
    result = a.client.post(PATH + '/authenticator/disable', json=body)
    assert result.status_code == (503 if required else 200)
    if required: a.provider.set_software_token_preference.assert_not_called()
    else:
        assert result.json()['account']['mfa']['status'] == 'off'
        a.provider.set_software_token_preference.assert_called_once_with('access', False)


def test_acknowledged_activation_with_failed_readback_reconciles_without_repeating(account):
    a = account
    state = mfa_provider(a)
    body, result = start_mfa(a)
    operation = result.json()['operation_id']
    original = a.provider.get_user.side_effect
    def read(access):
        if state['enabled']:
            raise EndpointConnectionError(endpoint_url='https://fixture.test')
        return original(access)
    a.provider.get_user.side_effect = read
    assert a.client.post(PATH + '/authenticator/verify', json={'operation_id': operation, 'code': '123456'}).json()['code'] == 'result_unknown'
    a.provider.get_user.side_effect = original
    result = a.client.post(PATH + '/operation-status', json={'event_id': body['event_id']})
    assert result.json()['state'] == 'complete'
    assert result.json()['account']['mfa']['status'] == 'on'
    a.provider.verify_software_token.assert_called_once()
    a.provider.set_software_token_preference.assert_called_once()


def test_bound_legacy_aliases_work_and_other_session_cannot_verify(account):
    a = account
    mfa_provider(a)
    body = {'mode': 'setup', 'verification_id': security_proof(a, 'mfa_setup'), 'event_id': str(uuid4())}
    started = a.client.post('/auth/mfa/enrollment/start', json=body)
    assert started.status_code == 200
    operation = started.json()['operation_id']
    another = a.store.create(a.store.get(a.sid, a.now[0]), 10000, a.now[0])
    a.client.cookies.set('__Host-travella', another)
    assert a.client.post('/auth/mfa/enrollment/verify', json={'operation_id': operation, 'code': '123456'}).status_code == 403
    a.provider.verify_software_token.assert_not_called()
    a.client.cookies.set('__Host-travella', a.sid)
    assert a.client.post('/auth/mfa/enrollment/verify', json={'operation_id': operation, 'code': '123456'}).json()['state'] == 'complete'


def test_active_replacement_cannot_be_overlapped_or_disabled(account):
    a = account
    mfa_provider(a, True)
    assert start_mfa(a, 'replace')[1].status_code == 200
    assert start_mfa(a, 'replace')[1].json()['code'] == 'operation_pending'
    data = {'verification_id': security_proof(a, 'mfa_disable'), 'event_id': str(uuid4())}
    assert a.client.post(PATH + '/authenticator/disable', json=data).json()['code'] == 'operation_pending'
    a.provider.set_software_token_preference.assert_not_called()
