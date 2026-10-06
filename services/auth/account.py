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
                "recovery_codes": {"status": "available" if count else "empty", "remaining": count}, "pending_email": None}

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
        service.context(request)
        if not service.email_available(fresh=True):
            raise AccountError("capability_unavailable")
        raise AccountError("verification_required", 403)

    return service
