import time
from types import SimpleNamespace
from unittest.mock import Mock

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from services.auth.config import CognitoConfig
from services.auth.jwt_verifier import CognitoJwtVerifier
from services.auth.session_policy import sanitize_internal_return
from services.auth.token_validator import TokenValidationError


@pytest.fixture
def jwt_system():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    config = CognitoConfig(
        "eu-central-1", "pool", "client", "https://issuer", "https://issuer/jwks"
    )
    verifier = CognitoJwtVerifier(config)
    verifier.keys = Mock()
    verifier.keys.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private.public_key())
    now = int(time.time())
    claims = {
        "iss": config.issuer,
        "sub": "traveler",
        "client_id": "client",
        "token_use": "access",
        "iat": now,
        "exp": now + 300,
        "scope": "aws.cognito.signin.user.admin",
    }
    return private, verifier, claims


def test_actual_signature_verification(jwt_system):
    private, verifier, claims = jwt_system
    assert verifier(jwt.encode(claims, private, algorithm="RS256")).subject == "traveler"
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(TokenValidationError):
        verifier(jwt.encode(claims, other, algorithm="RS256"))


@pytest.mark.parametrize(
    "claim,value",
    [
        ("iss", "https://wrong"),
        ("exp", 1),
        ("token_use", "id"),
        ("client_id", "other"),
        ("iat", 9999999999),
        ("sub", ""),
    ],
)
def test_invalid_signed_claims(jwt_system, claim, value):
    private, verifier, claims = jwt_system
    claims[claim] = value
    with pytest.raises(TokenValidationError):
        verifier(jwt.encode(claims, private, algorithm="RS256"))


@pytest.mark.parametrize(
    "path",
    [
        "//evil.test",
        "/\\evil.test",
        "/%2f%2fevil.test",
        "/plans?email=x",
        "/plans#secret",
        "/plans/ada@example.com",
        "/plans\r\nX: bad",
    ],
)
def test_return_route_allowlist(path):
    assert sanitize_internal_return(path) == "/plans"
