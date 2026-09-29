"""Alembic migration guards used before the CRUD app starts serving."""

from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy.engine import Engine


def alembic_config() -> Config:
    root = Path(__file__).resolve().parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return config


def migration_heads() -> set[str]:
    return set(ScriptDirectory.from_config(alembic_config()).get_heads())


def assert_database_at_head(engine: Engine) -> None:
    expected = migration_heads()
    if not expected:
        raise RuntimeError("CRUD migration scripts have no head")
    try:
        with engine.connect() as connection:
            current = set(MigrationContext.configure(connection).get_current_heads())
    except Exception as exc:
        raise RuntimeError("CRUD database migration check failed") from exc
    if current != expected:
        raise RuntimeError("CRUD database is not at the required migration head")
