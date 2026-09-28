import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CognitoConfig:
    region: str
    user_pool_id: str
    app_client_id: str
    issuer: str
    jwks_url: str

    @classmethod
    def from_env(cls) -> "CognitoConfig":
        required = {
            "region": "AWS_REGION",
            "user_pool_id": "COGNITO_USER_POOL_ID",
            "app_client_id": "COGNITO_APP_CLIENT_ID",
            "issuer": "COGNITO_ISSUER",
            "jwks_url": "COGNITO_JWKS_URL",
        }
        values = {field: os.getenv(env) for field, env in required.items()}
        missing = [env for field, env in required.items() if not values[field]]
        if missing:
            raise RuntimeError(f"Missing Cognito configuration: {', '.join(missing)}")
        return cls(**values)  # type: ignore[arg-type]
