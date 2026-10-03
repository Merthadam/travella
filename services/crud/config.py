"""Configuration and database engine construction for the CRUD service."""

from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


@dataclass(frozen=True)
class CrudSettings:
    database_url: str

    @classmethod
    def from_env(cls) -> "CrudSettings":
        value = os.environ.get("CRUD_DATABASE_URL")
        if not value:
            raise RuntimeError("CRUD_DATABASE_URL is required")
        return cls(database_url=value)


def create_crud_engine(database_url: str | None = None) -> Engine:
    """Create a CRUD engine.

    The serving path rejects SQLite; retaining its lightweight engine support keeps
    repository and auth-client unit tests isolated while PostgreSQL integration tests
    exercise the real deployment boundary.
    """

    url = database_url or CrudSettings.from_env().database_url
    kwargs: dict[str, object] = {"future": True, "pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    elif not url.startswith("postgresql+psycopg://"):
        raise RuntimeError("CRUD_DATABASE_URL must use the postgresql+psycopg scheme")
    return create_engine(url, **kwargs)
