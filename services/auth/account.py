"""Canonical identity projection and journaled, session-bound account operations."""

import hashlib
import secrets
from threading import Lock
from typing import Literal
from uuid import UUID

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator
from sqlalchemy.exc import SQLAlchemyError
from .token_validator import TokenValidationError


class AccountError(Exception):
    def __init__(self, code, status=503, account=None):
        self.code, self.status = code, status
        self.account = account


MESSAGES = {
    "current_password_incorrect": "Your current password is incorrect.",
    "password_policy": "Your new password doesn't meet the password policy. Choose another password.",
    "disclosure_unavailable": "This secret can only be shown once. Check account status before starting a new change.",
    "capability_unavailable": "This setting is currently unavailable. Check availability later.",
    "provider_unavailable": "We couldn't load this setting. Try again.",
    "result_unknown": "We couldn't confirm the result. Check saved details before trying again.",
    "account_conflict": "These details changed in another session. Review the latest details.",
    "request_reused": "This request changed. Review the saved details before trying again.",
    "verification_required": "Confirm it's you again to continue.",
    "verification_failed": "We couldn't verify those details. Try again.",
    "invalid_code": "This code couldn't be verified. Check it or request another code.",
    "obsolete_operation": "This change has expired or is no longer available. Check saved details.",
    "operation_pending": "An account change is already pending. Complete it before starting another.",
    "rate_limited": "Please wait a minute and try again.",
}


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Names(Input):
    first_name: str = Field(max_length=128)
    last_name: str = Field(max_length=128)


class NameInput(Names):
    expected_names: Names
    event_id: UUID

    @field_validator("first_name", "last_name")
    @classmethod
    def name(cls, value):
        if not value.strip():
            raise ValueError("Name required")
        return value.strip()


class EmailStart(Input):
    new_email: EmailStr
    verification_id: str = Field(min_length=1, max_length=128)
    event_id: UUID


class VerificationInput(Input):
    purpose: Literal['email_change', 'password_change', 'mfa_setup', 'mfa_replace', 'mfa_disable', 'recovery_rotate']
    password: SecretStr = Field(min_length=1, max_length=256)


class VerificationComplete(Input):
    verification_id: str = Field(min_length=1, max_length=128)
    code: SecretStr = Field(min_length=6, max_length=64)


class OperationInput(Input):
    operation_id: str = Field(min_length=1, max_length=128)


class EmailVerify(OperationInput):
    code: SecretStr = Field(min_length=1, max_length=64)


class EventInput(Input):
    event_id: UUID


class SecurityInput(EventInput):
    verification_id: str = Field(min_length=1, max_length=128)


class PasswordInput(SecurityInput):
    current_password: SecretStr = Field(min_length=1, max_length=256)
    new_password: SecretStr = Field(min_length=1, max_length=256)


class AuthenticatorStart(SecurityInput):
    mode: Literal['setup', 'replace']


class AuthenticatorVerify(OperationInput):
    code: SecretStr = Field(min_length=6, max_length=6)


def observed_mfa_status(user):
    # Only use after a successful, subject-validated GetUser response.
    methods = user.get('UserMFASettingList', [])
    if not isinstance(methods, list) or any(not isinstance(item, str) for item in methods):
        return 'unavailable'
    return 'on' if 'SOFTWARE_TOKEN_MFA' in methods else 'off'


class AccountService:
    def __init__(self, provider, verifier, store, current_session, ready, clock, capability_reader):
        self.provider, self.verifier, self.store = provider, verifier, store
        self.current_session, self.ready, self.clock = current_session, ready, clock
        self.capability_reader = capability_reader or (provider.account_configuration if provider else None)
        self.config_cache, self.config_until, self.config_lock = None, 0, Lock()

    def context(self, request):
        self.ready()
        try:
            return self.current_session(request)
        except TokenValidationError:
            from fastapi import HTTPException
            raise HTTPException(401, 'Sign-in required.') from None
        except ClientError as exc:
            if exc.response.get('Error', {}).get('Code') == 'NotAuthorizedException':
                from fastapi import HTTPException
                raise HTTPException(401, 'Sign-in required.') from None
            raise AccountError('provider_unavailable') from None

    def user(self, session):
        try:
            user = self.provider.get_user(session["access"])
            attrs = {a["Name"]: a["Value"] for a in user["UserAttributes"]}
            if attrs.get("sub") != session["subject"] or attrs.get("email_verified") != "true" or not attrs.get("email"):
                raise AccountError("provider_unavailable")
            return user, attrs
        except (ClientError, BotoCoreError, KeyError, TypeError):
            raise AccountError("provider_unavailable") from None

    def configuration(self, fresh=False):
        with self.config_lock:
            if not fresh and self.config_until > self.clock():
                return self.config_cache
            try:
                value = self.capability_reader()
                if not isinstance(value, dict) or not all(isinstance(value.get(k), dict) for k in ("pool", "client", "mfa")):
                    value = None
            except Exception:
                value = None
            self.config_cache, self.config_until = value, self.clock() + 30
            return value

    def email_available(self, fresh=False):
        config = self.configuration(fresh)
        if not config:
            return False
        pool, client = config["pool"], config["client"]
        settings = pool.get("UserAttributeUpdateSettings")
        if not isinstance(settings, dict):
            return False
        before, verified = settings.get("AttributesRequireVerificationBeforeUpdate"), pool.get("AutoVerifiedAttributes")
        # Omitted WriteAttributes means the documented standard mutable attributes.
        writable = client.get("WriteAttributes", ["email"])
        return all(isinstance(v, list) and all(isinstance(item, str) for item in v) and "email" in v for v in (before, verified, writable))

    def output(self, sid, session):
        user, attrs = self.user(session)
        pending = self.pending_email(session)
        if pending and attrs['email'] == pending['new_email']:
            self.reconcile(pending, attrs)
            pending = None
        mfa = observed_mfa_status(user)
        observed_mfa = mfa
        for record in self.store.account_records(session['subject'], self.clock()):
            expected = 'off' if record.get('purpose') == 'mfa_disable' else 'on'
            if record.get('record_type') == 'security' and record.get('stage') == 'preference_acknowledged' and mfa == expected:
                record['status'] = 'complete'
                self.store.update(record['id'], record)
        if any(r.get('purpose', '').startswith('mfa_') and r.get('record_type') == 'security'
               and r.get('status') == 'result_unknown' and not r.get('superseded') for r in self.store.account_records(session['subject'], self.clock())):
            mfa = 'unavailable'
        count = self.store.recovery_count(session["subject"])
        return {"identity": {"first_name": attrs.get("given_name", ""), "last_name": attrs.get("family_name", ""),
                             "email": attrs["email"], "email_verified": True},
                "capabilities": {"email_change": {"available": self.email_available(), "reason": None if self.email_available() else "capability_unavailable"},
                    "password_change": {"available": True, "reason": None},
                    "authenticator": self.authenticator_capabilities(observed_mfa),
                    "recovery_codes": {"rotate": mfa == 'on', "reason": None if mfa == 'on' else 'capability_unavailable'}},
                "password_policy": self.password_policy(), "mfa": {"status": mfa},
                "recovery_codes": {"status": "available" if count else "empty", "remaining": count},
                "pending_email": None if pending is None else {
                    "operation_id": pending['id'] if pending['owner_sid_hash'] == self.store.digest(sid) else None,
                    "new_email": pending['new_email'] if pending['owner_sid_hash'] == self.store.digest(sid) else None,
                    "state": 'awaiting_verification' if pending['status'] == 'awaiting_verification' else 'reconciliation_required',
                    "resumable": pending['owner_sid_hash'] == self.store.digest(sid)}}

    def password_policy(self):
        config = self.configuration()
        policy = config['pool'].get('Policies', {}).get('PasswordPolicy', {}) if config else {}
        fields = {'MinimumLength': 'minimum_length', 'RequireUppercase': 'require_uppercase',
                  'RequireLowercase': 'require_lowercase', 'RequireNumbers': 'require_numbers', 'RequireSymbols': 'require_symbols'}
        return {label: policy[key] for key, label in fields.items()
                if key in policy and type(policy[key]) is (int if key == 'MinimumLength' else bool)} or None

    def authenticator_capabilities(self, status, fresh=False):
        config = self.configuration(fresh)
        policy = config['mfa'] if config else {}
        enabled = policy.get('SoftwareTokenMfaConfiguration', {}).get('Enabled') is True
        known = enabled and policy.get('MfaConfiguration') in ('OPTIONAL', 'ON')
        return {'setup': known and status == 'off', 'replace': known and status == 'on',
                'disable': known and status == 'on' and policy.get('MfaConfiguration') == 'OPTIONAL',
                'reason': None if known and status != 'unavailable' else 'capability_unavailable'}

    def security_receipt(self, sid, session, data, purpose):
        # Deliberately no input digest: passwords and password-derived values never persist.
        prior = self.receipt(session, data.event_id, purpose)
        if prior:
            self.owned_record(sid, session, prior['id'], purpose=purpose)
        return prior

    def security_result(self, sid, session, record):
        if record.get('error'):
            raise AccountError(record['error'], record.get('error_status', 400))
        return {'state': 'complete' if record['status'] == 'complete' else 'result_unknown',
                'account': self.output(sid, session)}

    def security_intent(self, sid, session, data, purpose):
        with self.store.transaction():
            self.consume_proof(sid, session, data.verification_id, purpose)
            return self.store.create_account_record(dict(subject=session['subject'], owner_sid_hash=self.store.digest(sid),
                purpose=purpose, record_type='security', event_id=str(data.event_id), request_digest=purpose,
                status='result_unknown', operation_expires=min(self.clock() + 300, self.store.expiry(sid))), self.store.expiry(sid), self.clock())

    def mfa_status(self, session):
        user, _ = self.user(session)
        return observed_mfa_status(user)

    def start_authenticator(self, sid, session, data):
        purpose = 'mfa_' + data.mode
        with self.store.account_guard(session['subject']):
            if self.security_receipt(sid, session, data, purpose):
                raise AccountError('disclosure_unavailable', 409)
            if not self.authenticator_capabilities(self.mfa_status(session), fresh=True)[data.mode]:
                raise AccountError('capability_unavailable')
            pending = [r for r in self.store.account_records(session['subject'], self.clock())
                       if r.get('record_type') == 'security' and r.get('purpose', '').startswith('mfa_')
                       and r.get('status') not in ('complete', 'failed') and not r.get('superseded')]
            if any(r.get('operation_expires', r.get('enrollment_expires', 0)) > self.clock() for r in pending):
                raise AccountError('operation_pending', 409)
            record = self.security_intent(sid, session, data, purpose)
            for prior in pending:
                prior['superseded'] = True
                self.store.update(prior['id'], prior)
            record['stage'] = 'associating'
            record['enrollment_expires'] = min(self.clock() + 300, self.store.expiry(sid))
            self.store.update(record['id'], record)
            try:
                result = self.provider.associate_software_token(access_token=session['access'])
                secret = result.get('SecretCode')
                if not isinstance(secret, str) or not secret:
                    raise AccountError('result_unknown')
                record.update(status='enrollment_required', stage='associated')
                self.store.update(record['id'], record)
                return {'state': 'enrollment_required', 'operation_id': record['id'], 'secret_code': secret,
                        'expires_in': max(0, int(record['enrollment_expires'] - self.clock()))}
            except (ClientError, BotoCoreError):
                raise AccountError('result_unknown') from None

    def finish_authenticator(self, sid, session, record):
        expected = 'off' if record['purpose'] == 'mfa_disable' else 'on'
        if record.get('stage') == 'preference_acknowledged' and self.mfa_status(session) == expected:
            record['status'] = 'complete'
            self.store.update(record['id'], record)
        return self.security_result(sid, session, record)

    def activate_authenticator(self, sid, session, record, enabled):
        record.update(status='result_unknown', stage='activating')
        self.store.update(record['id'], record)
        try:
            self.provider.set_software_token_preference(session['access'], enabled)
            record['stage'] = 'preference_acknowledged'
            self.store.update(record['id'], record)
            result = self.finish_authenticator(sid, session, record)
            if result['state'] != 'complete':
                raise AccountError('result_unknown')
            return result
        except (ClientError, BotoCoreError, SQLAlchemyError, AccountError):
            raise AccountError('result_unknown') from None

    def verify_authenticator(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            record = self.owned_record(sid, session, data.operation_id)
            if record.get('record_type') != 'security' or record.get('purpose') not in ('mfa_setup', 'mfa_replace'):
                raise AccountError('verification_required', 403)
            if record.get('superseded'):
                raise AccountError('obsolete_operation', 400)
            if record['status'] != 'enrollment_required':
                return self.finish_authenticator(sid, session, record)
            if record.get('enrollment_expires', 0) <= self.clock():
                record['status'] = 'failed'
                self.store.update(record['id'], record)
                raise AccountError('obsolete_operation', 400)
            record.update(status='result_unknown', stage='verifying')
            self.store.update(record['id'], record)
            try:
                result = self.provider.verify_software_token(data.code.get_secret_value(), access_token=session['access'])
            except ClientError as exc:
                if exc.response.get('Error', {}).get('Code') in ('CodeMismatchException', 'EnableSoftwareTokenMFAException', 'ExpiredCodeException'):
                    record.update(status='enrollment_required', stage='associated')
                    self.store.update(record['id'], record)
                    raise AccountError('invalid_code', 400) from None
                raise AccountError('result_unknown') from None
            except BotoCoreError:
                raise AccountError('result_unknown') from None
            if result.get('Status') != 'SUCCESS':
                record.update(status='enrollment_required', stage='associated')
                self.store.update(record['id'], record)
                raise AccountError('invalid_code', 400)
            return self.activate_authenticator(sid, session, record, True)

    def disable_authenticator(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            prior = self.security_receipt(sid, session, data, 'mfa_disable')
            if prior:
                return self.finish_authenticator(sid, session, prior)
            if any(r.get('record_type') == 'security' and r.get('purpose', '').startswith('mfa_')
                   and r.get('status') == 'enrollment_required' and r.get('enrollment_expires', 0) > self.clock()
                   for r in self.store.account_records(session['subject'], self.clock())):
                raise AccountError('operation_pending', 409)
            if not self.authenticator_capabilities(self.mfa_status(session), fresh=True)['disable']:
                raise AccountError('capability_unavailable')
            record = self.security_intent(sid, session, data, 'mfa_disable')
            for previous in self.store.account_records(session['subject'], self.clock()):
                if previous['id'] != record['id'] and previous.get('record_type') == 'security' and previous.get('purpose', '').startswith('mfa_') and previous['status'] not in ('complete', 'failed'):
                    previous['superseded'] = True
                    self.store.update(previous['id'], previous)
            return self.activate_authenticator(sid, session, record, False)

    def change_password(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            prior = self.security_receipt(sid, session, data, 'password_change')
            if prior:
                return self.security_result(sid, session, prior)
            self.user(session)
            record = self.security_intent(sid, session, data, 'password_change')
            try:
                self.provider.change_password(session['access'], data.current_password.get_secret_value(), data.new_password.get_secret_value())
            except ClientError as exc:
                code = exc.response.get('Error', {}).get('Code')
                errors = {'NotAuthorizedException': ('current_password_incorrect', 400),
                          'InvalidPasswordException': ('password_policy', 400),
                          'PasswordHistoryPolicyViolationException': ('password_policy', 400),
                          'TooManyRequestsException': ('rate_limited', 429), 'LimitExceededException': ('rate_limited', 429)}
                if code in errors:
                    record['error'], record['error_status'] = errors[code]
                    record['status'] = 'failed'
                    self.store.update(record['id'], record)
                    raise AccountError(record['error'], record['error_status']) from None
                raise AccountError('result_unknown') from None
            except BotoCoreError:
                raise AccountError('result_unknown') from None
            record['status'] = 'complete'
            self.store.update(record['id'], record)
            return self.security_result(sid, session, record)

    def operation_status(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            record = next((r for r in self.store.account_records(session['subject'], self.clock())
                           if r.get('event_id') == str(data.event_id) and r.get('owner_sid_hash') == self.store.digest(sid)
                           and r.get('record_type') == 'security'), None)
            if record and record.get('stage') == 'preference_acknowledged':
                return self.finish_authenticator(sid, session, record)
            state = 'not_found' if not record else 'complete' if record['status'] == 'complete' else 'result_unknown'
            return {'state': state, 'account': self.output(sid, session)}

    def rotate_recovery_codes(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            if self.security_receipt(sid, session, data, 'recovery_rotate'):
                raise AccountError('disclosure_unavailable', 409, self.output(sid, session))
            output = self.output(sid, session)
            if not output['capabilities']['recovery_codes']['rotate']:
                raise AccountError('capability_unavailable')
            codes = [secrets.token_hex(16).upper() for _ in range(10)]
            try:
                with self.store.transaction():
                    record = self.security_intent(sid, session, data, 'recovery_rotate')
                    self.store.put_recovery_codes(session['subject'], output['identity']['email'],
                                                  [self.store.digest(code) for code in codes], self.clock())
                    record['status'] = 'complete'
                    self.store.update(record['id'], record)
            except SQLAlchemyError:
                raise AccountError('result_unknown') from None
            # No plaintext is retained. Only the initiating response can disclose it, after commit.
            return {'state': 'codes_generated', 'codes': codes, 'account': self.output(sid, session)}

    def record(self, sid, session, purpose, **values):
        return self.store.create_account_record(dict(subject=session["subject"], owner_sid_hash=self.store.digest(sid),
            purpose=purpose, **values), min(self.store.expiry(sid), self.clock() + 1800), self.clock())

    def receipt(self, session, event_id, digest):
        for record in self.store.account_records(session["subject"], self.clock()):
            if record.get("event_id") == str(event_id):
                if record.get("request_digest") != digest:
                    raise AccountError("request_reused", 409)
                return record

    def save_name(self, sid, session, data):
        digest = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
        with self.store.account_guard(session["subject"]):
            prior = self.receipt(session, data.event_id, digest)
            output = self.output(sid, session)
            expected = data.expected_names.model_dump()
            wanted = {"first_name": data.first_name, "last_name": data.last_name}
            actual = {k: output["identity"][k] for k in wanted}
            if prior:
                if prior["status"] != "complete" and actual != wanted:
                    raise AccountError("result_unknown")
                return output
            if actual != expected:
                raise AccountError("account_conflict", 409)
            record = self.record(sid, session, "name", event_id=str(data.event_id), request_digest=digest, status="writing")
            try:
                self.provider.update_names(session["access"], data.first_name, data.last_name)
                output = self.output(sid, session)
                if any(output["identity"][k] != v for k, v in wanted.items()):
                    raise AccountError("result_unknown")
                record["status"] = "complete"
                self.store.update(record["id"], record)
                return output
            except (ClientError, BotoCoreError):
                raise AccountError("result_unknown") from None

    def provider_failure(self, exc, code='verification_failed'):
        if isinstance(exc, ClientError) and exc.response.get('Error', {}).get('Code') in ('TooManyRequestsException', 'LimitExceededException'):
            raise AccountError('rate_limited', 429) from None
        if isinstance(exc, BotoCoreError):
            raise AccountError('provider_unavailable') from None
        raise AccountError(code, 400) from None

    def verify_tokens(self, result, subject):
        tokens = result.get('AuthenticationResult', {})
        try:
            identity = self.verifier(tokens['AccessToken'])
            if identity.subject != subject or identity.expires_at <= self.clock():
                raise AccountError('verification_failed', 400)
            self.user({'subject': subject, 'access': tokens['AccessToken']})
        except (KeyError, TokenValidationError, AccountError):
            raise AccountError('verification_failed', 400) from None
        finally:
            if tokens.get('RefreshToken'):
                try:
                    self.provider.revoke(tokens['RefreshToken'])
                except (ClientError, BotoCoreError):
                    # No temporary credential is retained even if revocation is unavailable.
                    pass

    def begin_verification(self, sid, session, data):
        user, _ = self.user(session)
        status = observed_mfa_status(user)
        if status == 'unavailable':
            raise AccountError('provider_unavailable')
        if not isinstance(user.get('Username'), str) or not user['Username']:
            raise AccountError('provider_unavailable')
        try:
            result = self.provider.sign_in(user['Username'], data.password.get_secret_value())
            values = {'status': 'verified'}
            if result.get('ChallengeName') == 'SOFTWARE_TOKEN_MFA':
                username = result.get('ChallengeParameters', {}).get('USER_ID_FOR_SRP') or result.get('ChallengeParameters', {}).get('USERNAME')
                if not isinstance(username, str) or not result.get('Session'):
                    raise AccountError('verification_failed', 400)
                values = {'status': 'mfa_required', 'challenge': result['Session'], 'username': username}
            else:
                if status == 'on':
                    # Validate/revoke any minted credentials, but require the current factor.
                    self.verify_tokens(result, session['subject'])
                    raise AccountError('verification_failed', 400)
                self.verify_tokens(result, session['subject'])
            expiry = min(self.clock() + 300, self.store.expiry(sid))
            record = self.store.create_account_record(dict(subject=session['subject'], owner_sid_hash=self.store.digest(sid),
                purpose=data.purpose, record_type='proof', **values), expiry, self.clock())
            return {'state': record['status'], 'verification_id': record['id'], 'expires_in': max(0, int(expiry - self.clock()))}
        except (ClientError, BotoCoreError, TokenValidationError, KeyError) as exc:
            self.provider_failure(exc)

    def owned_record(self, sid, session, token, *, purpose=None, status=None):
        record = self.store.get(token, self.clock())
        if not record or record.get('kind') != 'account_operation' or record.get('subject') != session['subject'] or record.get('owner_sid_hash') != self.store.digest(sid):
            raise AccountError('verification_required', 403)
        if (purpose and record.get('purpose') != purpose) or (status and record.get('status') != status):
            raise AccountError('verification_required', 403)
        return record

    def consume_proof(self, sid, session, token, purpose):
        # Call under account_guard so proof consumption and intent creation serialize.
        record = self.owned_record(sid, session, token, purpose=purpose, status='verified')
        if record.get('record_type') != 'proof':
            raise AccountError('verification_required', 403)
        # A proof minted while MFA was off cannot authorize operations after it turns on.
        status = self.mfa_status(session)
        if status == 'unavailable' or (status == 'on' and not record.get('factor_verified')):
            raise AccountError('verification_required', 403)
        record['status'] = 'consumed'
        self.store.update(token, record)

    def complete_verification(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            record = self.owned_record(sid, session, data.verification_id, status='mfa_required')
            challenge, username = record.pop('challenge'), record.pop('username')
            record['status'] = 'failed'
            self.store.update(record['id'], record)
            try:
                result = self.provider.answer_challenge(challenge, 'SOFTWARE_TOKEN_MFA', {
                    'USERNAME': username, 'SOFTWARE_TOKEN_MFA_CODE': data.code.get_secret_value()})
                self.verify_tokens(result, session['subject'])
            except (ClientError, BotoCoreError, TokenValidationError, KeyError) as exc:
                self.provider_failure(exc)
            record['status'] = 'verified'
            record['factor_verified'] = True
            self.store.update(record['id'], record)
            return {'state': 'verified', 'verification_id': record['id'],
                    'expires_in': max(0, int(self.store.expiry(record['id']) - self.clock()))}

    def pending_email(self, session):
        return next((r for r in self.store.account_records(session['subject'], self.clock())
                     if r.get('purpose') == 'email_change' and r.get('record_type') == 'email'
                     and r['status'] not in ('complete', 'failed')), None)

    def reconcile(self, record, attrs):
        if attrs.get('sub') != record['subject'] or attrs.get('email_verified') != 'true' or attrs.get('email') != record['new_email']:
            raise AccountError('result_unknown')
        try:
            with self.store.transaction():
                self.store.reconcile_email(record['subject'], record['new_email'])
                record['status'] = 'complete'
                self.store.update(record['id'], record)
        except SQLAlchemyError:
            raise AccountError('result_unknown') from None

    def reconcile_before_reset(self, email):
        """Repair a persisted pending intent before reset invalidation uses its index."""
        records = self.store.live_records(self.clock())
        intents = [r for r in records if r.get('kind') == 'account_operation' and r.get('record_type') == 'email'
                   and r.get('status') not in ('complete', 'failed') and email in (r.get('new_email'), r.get('old_email'))]
        for record in intents:
            with self.store.account_guard(record['subject']):
                sessions = [s for s in records if s.get('kind') == 'session' and s.get('subject') == record['subject']
                            and s.get('access_expires', 0) > self.clock()]
                for session in sessions:
                    try:
                        principal = self.verifier(session['access'])
                        if principal.subject != record['subject']:
                            continue
                        _, attrs = self.user(session)
                    except (AccountError, ClientError, BotoCoreError, TokenValidationError):
                        continue
                    if attrs['email'] == record['new_email']:
                        self.reconcile(record, attrs)
                    break
                else:
                    # Never acknowledge reset while knowingly retaining stale local indexes.
                    raise AccountError('provider_unavailable')

    def start_email(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            if not self.email_available(fresh=True):
                raise AccountError('capability_unavailable')
            digest = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
            prior = self.receipt(session, data.event_id, digest)
            if prior:
                self.owned_record(sid, session, prior['id'], purpose='email_change')
                output = self.output(sid, session)
                current = self.store.get(prior['id'], self.clock())
                state = current['status']
                if state not in ('complete', 'awaiting_verification'):
                    raise AccountError('result_unknown')
                return {'state': state, 'operation_id': prior['id'], 'account': output}
            if self.pending_email(session):
                raise AccountError('operation_pending', 409)
            self.consume_proof(sid, session, data.verification_id, 'email_change')
            _, attrs = self.user(session)
            if attrs['email'] == str(data.new_email):
                raise AccountError('account_conflict', 409)
            record = self.record(sid, session, 'email_change', record_type='email', status='reconciliation_required',
                new_email=str(data.new_email), old_email=attrs['email'], event_id=str(data.event_id), request_digest=digest)
            try:
                self.provider.update_email(session['access'], str(data.new_email))
                _, after = self.user(session)
                if after['email'] != attrs['email']:
                    raise AccountError('result_unknown')
                record['status'] = 'awaiting_verification'
                self.store.update(record['id'], record)
            except (ClientError, BotoCoreError):
                raise AccountError('result_unknown') from None
            return {'state': 'awaiting_verification', 'operation_id': record['id'], 'account': self.output(sid, session)}

    def email_operation(self, sid, session, token):
        record = self.owned_record(sid, session, token, purpose='email_change')
        if record.get('record_type') != 'email' or record['status'] == 'failed':
            raise AccountError('obsolete_operation', 409)
        return record

    def resend_email(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            record = self.email_operation(sid, session, data.operation_id)
            if record['status'] not in ('awaiting_verification', 'reconciliation_required'):
                raise AccountError('obsolete_operation', 409)
            try:
                self.provider.resend_email(session['access'])
            except (ClientError, BotoCoreError) as exc:
                self.provider_failure(exc, 'invalid_code')
            return {'state': 'awaiting_verification'}

    def verify_email(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            record = self.email_operation(sid, session, data.operation_id)
            _, attrs = self.user(session)
            if attrs['email'] != record['new_email']:
                if record['status'] == 'complete':
                    raise AccountError('obsolete_operation', 409)
                record['status'] = 'reconciliation_required'
                self.store.update(record['id'], record)
                try:
                    self.provider.verify_email(session['access'], data.code.get_secret_value())
                except (ClientError, BotoCoreError) as exc:
                    self.provider_failure(exc, 'invalid_code')
                _, attrs = self.user(session)
            self.reconcile(record, attrs)
            return {'state': 'complete', 'account': self.output(sid, session)}


def register_account_routes(app, provider, verifier, store, current_session, ready, clock, capability_reader=None):
    service = AccountService(provider, verifier, store, current_session, ready, clock, capability_reader)
    app.state.account = service

    @app.exception_handler(AccountError)
    async def account_error(request, exc):
        return JSONResponse({"code": exc.code, "message": MESSAGES.get(exc.code, MESSAGES["provider_unavailable"]),
                             **({'account': exc.account} if exc.account else {})}, status_code=exc.status)

    @app.get("/auth/account")
    def account(request: Request):
        sid, session, _ = service.context(request)
        with store.account_guard(session["subject"]):
            return service.output(sid, session)

    @app.patch("/auth/account/name")
    def name(data: NameInput, request: Request):
        sid, session, _ = service.context(request)
        return service.save_name(sid, session, data)

    @app.post("/auth/account/email/start")
    def email_start(data: EmailStart, request: Request):
        sid, session, _ = service.context(request)
        return service.start_email(sid, session, data)

    @app.post('/auth/account/verification')
    def verification(data: VerificationInput, request: Request):
        sid, session, _ = service.context(request)
        return service.begin_verification(sid, session, data)

    @app.post('/auth/account/verification/complete')
    def verification_complete(data: VerificationComplete, request: Request):
        sid, session, _ = service.context(request)
        return service.complete_verification(sid, session, data)

    @app.post('/auth/account/email/resend')
    def email_resend(data: OperationInput, request: Request):
        sid, session, _ = service.context(request)
        return service.resend_email(sid, session, data)

    @app.post('/auth/account/email/verify')
    def email_verify(data: EmailVerify, request: Request):
        sid, session, _ = service.context(request)
        return service.verify_email(sid, session, data)

    @app.post('/auth/account/password')
    def password(data: PasswordInput, request: Request):
        sid, session, _ = service.context(request)
        return service.change_password(sid, session, data)

    @app.post('/auth/account/operation-status')
    def operation_status(data: EventInput, request: Request):
        sid, session, _ = service.context(request)
        return service.operation_status(sid, session, data)

    @app.post('/auth/account/authenticator/start')
    @app.post('/auth/mfa/enrollment/start')
    def authenticator_start(data: AuthenticatorStart, request: Request):
        sid, session, _ = service.context(request)
        return service.start_authenticator(sid, session, data)

    @app.post('/auth/account/authenticator/verify')
    @app.post('/auth/mfa/enrollment/verify')
    def authenticator_verify(data: AuthenticatorVerify, request: Request):
        sid, session, _ = service.context(request)
        return service.verify_authenticator(sid, session, data)

    @app.post('/auth/account/authenticator/disable')
    def authenticator_disable(data: SecurityInput, request: Request):
        sid, session, _ = service.context(request)
        return service.disable_authenticator(sid, session, data)

    @app.post('/auth/account/recovery-codes/rotate')
    def recovery_rotate(data: SecurityInput, request: Request):
        sid, session, _ = service.context(request)
        return service.rotate_recovery_codes(sid, session, data)

    return service
