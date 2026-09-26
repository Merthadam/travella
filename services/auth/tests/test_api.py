import hashlib
import json
import time
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from services.auth.api import MAX_AGE, RECOVERY_MESSAGE, create_app
from services.auth.contracts import ValidatedIdentity
from services.auth.session_store import SessionStore
from services.auth.token_validator import TokenValidationError

ORIGIN = "https://travella.test"
HEADERS = {"origin": ORIGIN, "x-travella-request": "1"}
CREDENTIALS = {"email": "ada@example.com", "password": "a-secret-password"}


def error(code="NotAuthorizedException"):
    return ClientError({"Error": {"Code": code, "Message": "sensitive-provider-details"}}, "Auth")


@pytest.fixture
def system(tmp_path):
    now = [time.time()]
    provider = Mock()
    provider.sign_in.return_value = {
        "AuthenticationResult": {
            "AccessToken": "secret-access",
            "RefreshToken": "secret-refresh",
        }
    }
    provider.get_user.return_value = {
        "UserAttributes": [
            {"Name": "sub", "Value": "traveler-one"},
            {"Name": "email_verified", "Value": "true"},
        ]
    }
    verifier = Mock(
        return_value=ValidatedIdentity(
            "traveler-one", "client", frozenset(), int(now[0]), int(now[0]) + 300
        )
    )
    store = SessionStore(str(tmp_path / "session.db"), Fernet.generate_key().decode())
    app = create_app(provider, verifier, store, origin=ORIGIN, clock=lambda: now[0])
    with TestClient(app, base_url=ORIGIN, headers=HEADERS) as client:
        yield client, provider, verifier, store, now
    store.close()


def test_unconfigured_service_is_honest():
    with TestClient(create_app(origin=ORIGIN), headers=HEADERS) as client:
        assert client.get("/health").json()["auth_configured"] is False
        assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 503


def test_login_cookie_is_opaque_and_tokens_are_encrypted(system):
    client, provider, verifier, store, now = system
    response = client.post("/auth/sign-in", json=CREDENTIALS)
    assert response.status_code == 200
    assert response.json()["state"] == "signed_in"
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=strict" in cookie
    assert "secret-access" not in cookie + response.text
    assert "secret-refresh" not in cookie + response.text
    assert "IdToken" not in response.text
    stored = store.db.execute("SELECT id, payload FROM sessions").fetchone()
    assert stored[0] != client.cookies.get("__Host-travella")
    assert b"secret-refresh" not in stored[1]
    assert client.get("/auth/session").status_code == 200


@pytest.mark.parametrize("case", ["signature", "email", "subject", "credentials"])
def test_untrusted_login_cannot_create_session(system, case):
    client, provider, verifier, store, now = system
    if case == "signature":
        verifier.side_effect = TokenValidationError("wrong signature")
    elif case == "email":
        provider.get_user.return_value["UserAttributes"][1]["Value"] = "false"
    elif case == "subject":
        provider.get_user.return_value["UserAttributes"][0]["Value"] = "someone-else"
    else:
        provider.sign_in.side_effect = error()
    response = client.post("/auth/sign-in", json=CREDENTIALS)
    assert response.status_code == 401
    assert "sensitive-provider-details" not in response.text
    assert store.db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0


def test_mfa_challenge_does_not_grant_private_access_and_is_one_use(system):
    client, provider, verifier, store, now = system
    provider.sign_in.return_value = {
        "ChallengeName": "SOFTWARE_TOKEN_MFA",
        "Session": "aws-secret-session",
    }
    response = client.post("/auth/sign-in", json=CREDENTIALS)
    assert response.json() == {"state": "mfa_challenge"}
    assert "aws-secret-session" not in response.text
    sid = client.cookies.get("__Host-travella")
    provider.answer_challenge.return_value = {
        "AuthenticationResult": {
            "AccessToken": "secret-access",
            "RefreshToken": "secret-refresh",
        }
    }
    assert client.post("/auth/mfa/challenge", json={"code": "123456"}).status_code == 200
    with store.transaction():
        assert store.get(sid, now[0]) is None
    assert client.get("/auth/session").status_code == 200


def test_incomplete_challenge_cannot_open_session(system):
    client, provider, *_ = system
    provider.sign_in.return_value = {"ChallengeName": "SOFTWARE_TOKEN_MFA", "Session": "challenge"}
    client.post("/auth/sign-in", json=CREDENTIALS)
    assert client.get("/auth/session").status_code == 401


def test_refresh_rotation_preserves_original_maximum_age(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    start = now[0]
    now[0] += 120
    provider.refresh.return_value = {
        "AuthenticationResult": {
            "AccessToken": "rotated-access",
            "RefreshToken": "rotated-refresh",
        }
    }
    response = client.post("/auth/refresh", json={})
    assert response.status_code == 200
    assert "set-cookie" not in response.headers
    assert store.db.execute("SELECT expires FROM sessions").fetchone()[0] == start + MAX_AGE
    now[0] = start + MAX_AGE
    assert client.post("/auth/refresh", json={}).status_code == 401
    assert provider.refresh.call_count == 1


def test_refresh_failure_destroys_session(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    sid = client.cookies.get("__Host-travella")
    provider.refresh.side_effect = error()
    assert client.post("/auth/refresh", json={}).status_code == 401
    with store.transaction():
        assert store.get(sid, now[0]) is None
    assert client.get("/auth/session").status_code == 401


def test_password_reset_invalidates_all_matching_browser_sessions(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    first = client.cookies.get("__Host-travella")
    client.cookies.clear()
    client.post("/auth/sign-in", json=CREDENTIALS)
    second = client.cookies.get("__Host-travella")
    provider.reset_password.return_value = {}
    response = client.post(
        "/auth/reset-password",
        json={"email": CREDENTIALS["email"], "code": "123456", "new_password": "new-password"},
    )
    assert response.status_code == 200
    assert response.json()["state"] == "sign_in"
    assert provider.global_sign_out.call_count == 2
    with store.transaction():
        assert store.get(first, now[0]) is None
        assert store.get(second, now[0]) is None


def test_mfa_enrollment_verifies_once_and_returns_recovery_codes(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    provider.associate_software_token.return_value = {
        "Session": "enrollment-session",
        "SecretCode": "JBSWY3DPEHPK3PXP",
    }
    provider.verify_software_token.return_value = {"Status": "SUCCESS"}
    start = client.post("/auth/mfa/enrollment/start", json={})
    assert start.status_code == 200
    assert start.json()["state"] == "mfa_enrollment"
    assert start.json()["secret_code"] == "JBSWY3DPEHPK3PXP"
    assert "ada@example.com" not in start.json()["otpauth_uri"]
    verify = client.post("/auth/mfa/enrollment/verify", json={"code": "123456"})
    assert verify.status_code == 200
    codes = verify.json()["codes"]
    assert len(codes) == 10 and len(set(codes)) == 10
    stored = store.db.execute("SELECT payload FROM recovery_codes").fetchone()[0]
    assert codes[0].encode() not in stored
    digest = hashlib.sha256(codes[0].encode()).hexdigest()
    with store.transaction():
        assert store.consume_recovery_code("traveler-one", digest) is True
        assert store.consume_recovery_code("traveler-one", digest) is False


def test_mfa_enrollment_rejects_code_and_discards_pending_setup(system):
    client, provider, *_ = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    provider.associate_software_token.return_value = {
        "Session": "enrollment-session",
        "SecretCode": "JBSWY3DPEHPK3PXP",
    }
    provider.verify_software_token.return_value = {"Status": "ERROR"}
    client.post("/auth/mfa/enrollment/start", json={})
    response = client.post("/auth/mfa/enrollment/verify", json={"code": "123456"})
    assert response.status_code == 400
    provider.verify_software_token.assert_called_once()


def test_recovery_code_requires_replacement_authenticator_before_session(system):
    client, provider, verifier, store, now = system
    provider.sign_in.return_value = {
        "ChallengeName": "SOFTWARE_TOKEN_MFA",
        "Session": "old-mfa-session",
    }
    client.post("/auth/sign-in", json=CREDENTIALS)
    recovery = "ABCD1234"
    with store.transaction():
        store.put_recovery_codes(
            "traveler-one",
            CREDENTIALS["email"],
            [hashlib.sha256(recovery.encode()).hexdigest()],
            now[0],
        )
    provider.associate_software_token.return_value = {
        "Session": "replacement-session",
        "SecretCode": "NEWSECRET",
    }
    response = client.post("/auth/mfa/recovery", json={"code": recovery})
    assert response.status_code == 200
    assert response.json()["state"] == "mfa_recovery_enrollment"
    provider.verify_software_token.return_value = {"Status": "SUCCESS"}
    provider.answer_challenge.return_value = {
        "AuthenticationResult": {
            "AccessToken": "secret-access",
            "RefreshToken": "secret-refresh",
        }
    }
    response = client.post("/auth/mfa/recovery/verify", json={"code": "654321"})
    assert response.status_code == 200
    assert response.json()["state"] == "signed_in"
    provider.associate_software_token.assert_called_once_with(session="old-mfa-session")
    provider.verify_software_token.assert_called_once_with("654321", session="replacement-session")
    provider.answer_challenge.assert_called_once()


def test_invalid_recovery_code_cannot_start_replacement(system):
    client, provider, *_ = system
    provider.sign_in.return_value = {
        "ChallengeName": "SOFTWARE_TOKEN_MFA",
        "Session": "old-mfa-session",
    }
    client.post("/auth/sign-in", json=CREDENTIALS)
    response = client.post("/auth/mfa/recovery", json={"code": "ABCD1234"})
    assert response.status_code == 401
    provider.associate_software_token.assert_not_called()


def test_failed_password_reset_preserves_existing_sessions(system):
    client, provider, *_ = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    provider.reset_password.side_effect = error("CodeMismatchException")
    response = client.post(
        "/auth/reset-password",
        json={"email": CREDENTIALS["email"], "code": "bad", "new_password": "new-password"},
    )
    assert response.status_code == 400
    assert client.get("/auth/session").status_code == 200


def test_provider_revocation_rejects_an_unexpired_access_token(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    sid = client.cookies.get("__Host-travella")
    provider.get_user.side_effect = error()
    assert client.get("/auth/session").status_code == 401
    with store.transaction():
        assert store.get(sid, now[0]) is None


def test_challenge_expires_without_calling_cognito(system):
    client, provider, verifier, store, now = system
    provider.sign_in.return_value = {"ChallengeName": "SOFTWARE_TOKEN_MFA", "Session": "challenge"}
    client.post("/auth/sign-in", json=CREDENTIALS)
    now[0] += 180
    assert client.post("/auth/mfa/challenge", json={"code": "123456"}).status_code == 401
    provider.answer_challenge.assert_not_called()


def test_signout_ends_only_current_browser_even_when_revoke_fails(system):
    client, provider, verifier, store, now = system
    client.post("/auth/sign-in", json=CREDENTIALS)
    first = client.cookies.get("__Host-travella")
    client.cookies.clear()
    client.post("/auth/sign-in", json=CREDENTIALS)
    second = client.cookies.get("__Host-travella")
    provider.revoke.side_effect = error()
    assert client.post("/auth/sign-out", json={}).status_code == 200
    with store.transaction():
        assert store.get(first, now[0]) is not None
        assert store.get(second, now[0]) is None
    assert client.get("/auth/session").status_code == 401


@pytest.mark.parametrize("code", [None, "UserNotFoundException", "InvalidParameterException"])
def test_recovery_responses_are_neutral(system, code):
    client, provider, *_ = system
    if code:
        provider.forgot_password.side_effect = error(code)
        provider.resend_confirmation.side_effect = error(code)
    response = client.post("/auth/forgot-password", json={"email": "ada@example.com"})
    assert response.status_code == 200
    assert response.json()["message"] == RECOVERY_MESSAGE


def test_csrf_and_validation_errors_do_not_echo_secrets(system):
    client, *_ = system
    response = client.post(
        "/auth/sign-in", json=CREDENTIALS, headers={"origin": "https://evil.test"}
    )
    assert response.status_code == 403
    response = client.post(
        "/auth/sign-in", json={**CREDENTIALS, "password": {"secret": "do-not-echo"}}
    )
    assert response.status_code == 422
    assert "do-not-echo" not in response.text
    assert response.json()["fields"] == ["password"]
    assert response.headers["cache-control"] == "no-store"


def test_body_limit_and_throttling(system):
    client, provider, *_ = system
    assert (
        client.post(
            "/auth/sign-in",
            content=json.dumps({"data": "x" * 17000}),
            headers={"content-type": "application/json"},
        ).status_code
        == 413
    )
    provider.sign_in.side_effect = error()
    for _ in range(30):
        assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 401
    assert client.post("/auth/sign-in", json=CREDENTIALS).status_code == 429
