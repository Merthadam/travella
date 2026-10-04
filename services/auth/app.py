"""uv run uvicorn services.auth.app:app --port 8000 --no-access-log"""

import os

import boto3
from botocore import UNSIGNED
from botocore.config import Config

from services.crud.config import create_crud_engine
from services.crud.migration import assert_database_at_head

from .agent_client import AgentClient
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
    database_url = os.environ.get("SESSION_DATABASE_URL", "")
    if not database_url.startswith("postgresql+psycopg://"):
        raise RuntimeError("SESSION_DATABASE_URL must use the postgresql+psycopg scheme")
    database_engine = create_crud_engine(database_url)
    assert_database_at_head(database_engine)
    database_engine.dispose()
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
    store = SessionStore(database_url, key)
    return create_app(
        CognitoAdapter(client, config.user_pool_id, config.app_client_id),
        CognitoJwtVerifier(config),
        store,
        origin=origin,
        secure_cookies=secure,
        crud_client=CrudClient(os.environ["CRUD_BASE_URL"]) if os.getenv("CRUD_BASE_URL") else None,
        agent_client=(
            AgentClient(
                os.getenv("AGENT_BASE_URL", "http://agent:8002"),
                runtime_arn=os.getenv("AGENTCORE_RUNTIME_ARN"),
                runtime_region=os.getenv("AGENTCORE_RUNTIME_REGION") or config.region,
            )
            if os.getenv("AGENT_BASE_URL") or os.getenv("AGENTCORE_RUNTIME_ARN")
            else None
        ),
    )


app = configured_app()
