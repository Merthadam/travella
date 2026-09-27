"""CRUD FastAPI application factory."""

from collections.abc import Callable

from fastapi import FastAPI

from services.auth.contracts import ValidatedIdentity

from .api import create_router
from .repository import PlanRepository


def create_app(verifier: Callable[[str], ValidatedIdentity], session_factory) -> FastAPI:
    app = FastAPI(title="Travella plan service", docs_url=None, redoc_url=None)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    session = session_factory()
    app.include_router(create_router(PlanRepository(session), verifier))
    return app
