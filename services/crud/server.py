"""Explicit local-only CRUD startup; production migration/deployment remains gated."""

import os
from pathlib import Path

from sqlalchemy.orm import sessionmaker

from services.auth.config import CognitoConfig
from services.auth.jwt_verifier import CognitoJwtVerifier

from .app import create_app
from .auth import DEFAULT_SCOPE
from .config import create_crud_engine
from .models import Base


def configured_app():
    if os.getenv("APP_ENV", "development") != "development":
        raise RuntimeError("Production CRUD deployment requires managed migrations and validation")
    url = os.environ["CRUD_DATABASE_URL"]
    if url.startswith("sqlite:///"):
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_crud_engine(url)
    Base.metadata.create_all(engine)
    verifier = (
        CognitoJwtVerifier(CognitoConfig.from_env()) if os.getenv("COGNITO_USER_POOL_ID") else None
    )
    return create_app(
        verifier,
        sessionmaker(engine, expire_on_commit=False),
        required_scope=os.getenv("CRUD_REQUIRED_SCOPE", DEFAULT_SCOPE),
    )


app = configured_app()
