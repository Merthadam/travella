"""uv run uvicorn services.auth.app:app --port 8000 --no-access-log"""

import os
from pathlib import Path

import boto3
from botocore import UNSIGNED
from botocore.config import Config

from .api import create_app
from .cognito_adapter import CognitoAdapter
from .config import CognitoConfig
from .crud_client import CrudClient
from .jwt_verifier import CognitoJwtVerifier
from .session_store import SessionStore


def configured_app():
    # This local implementation deliberately refuses production mode until
    # distributed sessions, account-wide revocation and abuse controls are ready.
    if os.getenv("APP_ENV", "development") != "development":
        raise RuntimeError("Production auth deployment is not ready")
    origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    secure = not origin.startswith("http://localhost:")
    if not os.getenv("COGNITO_USER_POOL_ID"):
        return create_app(origin=origin, secure_cookies=secure)
    config = CognitoConfig.from_env()
    key = os.environ["SESSION_ENCRYPTION_KEY"]
    path = Path(os.getenv("SESSION_DB_PATH", ".runtime/auth.sqlite3"))
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # End-user operations use tokens/client IDs, not AWS IAM credentials.
    client = boto3.client(
        "cognito-idp",
        region_name=config.region,
        config=Config(
            signature_version=UNSIGNED,
            connect_timeout=3,
            read_timeout=5,
            retries={"max_attempts": 1},
        ),
    )
    store = SessionStore(str(path), key)
    path.chmod(0o600)
    return create_app(
        CognitoAdapter(client, config.user_pool_id, config.app_client_id),
        CognitoJwtVerifier(config),
        store,
        origin=origin,
        secure_cookies=secure,
        crud_client=CrudClient(os.environ["CRUD_BASE_URL"]) if os.getenv("CRUD_BASE_URL") else None,
    )


app = configured_app()
