"""CRUD FastAPI application factory. Run services.crud.server:app locally."""

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .api import create_router
from .auth import DEFAULT_SCOPE
from .contracts import PROBLEMS, LifecycleProblem


def create_app(verifier, session_factory, *, required_scope=DEFAULT_SCOPE, clock=None) -> FastAPI:
    app = FastAPI(title="Travella plan service", docs_url=None, redoc_url=None)

    @app.middleware("http")
    async def protection(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(LifecycleProblem)
    async def lifecycle_error(request, exc):
        status, message = PROBLEMS.get(exc.code, (404, "Plan unavailable."))
        code = exc.code if exc.code in PROBLEMS else "not_found"
        return JSONResponse({"code": code, "message": message}, status_code=status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(
            {"code": "invalid_request", "message": "Check the request fields."}, status_code=422
        )

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse(
            {
                "code": "unauthenticated" if exc.status_code == 401 else "unavailable",
                "message": "Sign-in required." if exc.status_code == 401 else "Plan unavailable.",
            },
            status_code=exc.status_code,
        )

    @app.exception_handler(IntegrityError)
    async def concurrent_request(request, exc):
        return JSONResponse(
            {"code": "request_pending", "message": "Retry the same request."}, status_code=409
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        return JSONResponse(
            {"code": "unavailable", "message": "Plans are temporarily unavailable."},
            status_code=503,
        )

    @app.get("/health")
    def health():
        return {"status": "ok", "auth_configured": verifier is not None}

    @app.get("/ready")
    def ready():
        with session_factory() as session:
            session.execute(text("SELECT 1 FROM plans LIMIT 1"))
        return {"status": "ok", "auth_configured": verifier is not None}

    app.include_router(
        create_router(session_factory, verifier, required_scope=required_scope, clock=clock)
    )
    return app
