"""Cognito RS256 verification with cached keys fetched only from configured JWKS."""

import time

import jwt

from .config import CognitoConfig
from .contracts import ValidatedIdentity
from .token_validator import TokenValidationError, validate_claims


class CognitoJwtVerifier:
    def __init__(self, config: CognitoConfig):
        self.config = config
        self.keys = jwt.PyJWKClient(config.jwks_url, timeout=5, cache_jwk_set=True)

    def __call__(self, token: str) -> ValidatedIdentity:
        try:
            key = self.keys.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                key.key,
                algorithms=["RS256"],
                issuer=self.config.issuer,
                options={"require": ["exp", "iat", "iss", "sub"], "verify_aud": False},
            )
            # Cognito access tokens bind the app client via client_id, not aud.
            return validate_claims(
                claims,
                issuer=self.config.issuer,
                client_id=self.config.app_client_id,
                now=int(time.time()),
            )
        except jwt.PyJWTError as exc:
            raise TokenValidationError("Invalid access token") from exc
