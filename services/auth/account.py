"""Canonical identity projection and journaled, session-bound account operations."""

import hashlib
import json
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
    def __init__(self, code, status=503):
        self.code, self.status = code, status


MESSAGES = {
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


class AccountService:
    def __init__(self, provider, verifier, store, current_session, ready, clock, capability_reader):
        self.provider, self.verifier, self.store = provider, verifier, store
        self.current_session, self.ready, self.clock = current_session, ready, clock
        self.capability_reader = capability_reader or (provider.account_configuration if provider else None)
        self.config_cache, self.config_until, self.config_lock = None, 0, Lock()

    def context(self, request):
        self.ready()
        return self.current_session(request)

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
        methods = user.get("UserMFASettingList")
        mfa = ("on" if "SOFTWARE_TOKEN_MFA" in methods else "off") if isinstance(methods, list) else "unavailable"
        count = self.store.recovery_count(session["subject"])
        unavailable = {"available": False, "reason": "capability_unavailable"}
        return {"identity": {"first_name": attrs.get("given_name", ""), "last_name": attrs.get("family_name", ""),
                             "email": attrs["email"], "email_verified": True},
                "capabilities": {"email_change": {"available": self.email_available(), "reason": None if self.email_available() else "capability_unavailable"},
                    "password_change": unavailable,
                    "authenticator": {"setup": False, "replace": False, "disable": False, "reason": "capability_unavailable"},
                    "recovery_codes": {"rotate": False, "reason": "capability_unavailable"}},
                "password_policy": None, "mfa": {"status": mfa},
                "recovery_codes": {"status": "available" if count else "empty", "remaining": count},
                "pending_email": None if pending is None else {
                    "operation_id": pending['id'] if pending['owner_sid_hash'] == self.store.digest(sid) else None,
                    "new_email": pending['new_email'] if pending['owner_sid_hash'] == self.store.digest(sid) else None,
                    "state": 'awaiting_verification' if pending['status'] == 'awaiting_verification' else 'reconciliation_required',
                    "resumable": pending['owner_sid_hash'] == self.store.digest(sid)}}

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

    def start_email(self, sid, session, data):
        with self.store.account_guard(session['subject']):
            if not self.email_available(fresh=True):
                raise AccountError('capability_unavailable')
            digest = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
            prior = self.receipt(session, data.event_id, digest)
            if prior:
                self.owned_record(sid, session, prior['id'], purpose='email_change')
                output = self.output(sid, session)
                return {'state': 'complete' if prior['status'] == 'complete' else 'awaiting_verification', 'operation_id': prior['id'], 'account': output}
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
        return JSONResponse({"code": exc.code, "message": MESSAGES.get(exc.code, MESSAGES["provider_unavailable"])}, status_code=exc.status)

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

    return service
