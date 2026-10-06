"""Encrypted authentication state backed by the shared SQL database."""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

_ACCOUNT_LOCKS = tuple(threading.RLock() for _ in range(128))


def _timestamp(value: float) -> datetime:
    return datetime.fromtimestamp(value, tz=timezone.utc)


def _epoch(value: datetime) -> float:
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.timestamp()


class _BufferedResult:
    """Small compatibility result for existing test-only direct SQL checks."""

    def __init__(self, rows: list[tuple[Any, ...]]):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)


class _DatabaseCompat:
    def __init__(self, engine: Engine):
        self.engine = engine

    def execute(self, statement: str, parameters: dict[str, Any] | tuple[Any, ...] = ()):  # noqa: ANN001
        normalized = " ".join(statement.lower().split())
        if " from sessions" in normalized:
            statement = statement.replace("FROM sessions", "FROM auth_sessions").replace("from sessions", "from auth_sessions")
            if normalized.startswith("select expires from sessions"):
                statement = statement.replace("SELECT expires", "SELECT expires_at").replace("select expires", "select expires_at")
        elif " from recovery_codes" in normalized:
            statement = statement.replace("FROM recovery_codes", "FROM auth_recovery_codes").replace("from recovery_codes", "from auth_recovery_codes")
        with self.engine.connect() as connection:
            result = connection.exec_driver_sql(statement, parameters)
            rows = [tuple(row) for row in result.fetchall()]
            if normalized.startswith("select expires from sessions"):
                rows = [(_epoch(row[0]),) for row in rows]
            return _BufferedResult(rows)


class SessionStore:
    def __init__(self, database_url: str, key: str):
        if not database_url:
            raise RuntimeError("SESSION_DATABASE_URL is required")
        if "://" not in database_url:
            database_url = f"sqlite+pysqlite:///{database_url}"
        self.cipher = Fernet(key.encode())
        self.engine = create_engine(database_url, future=True, pool_pre_ping=True)
        self._sqlite = database_url.startswith("sqlite")
        if self._sqlite:
            with self.engine.begin() as connection:
                connection.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS auth_sessions "
                    "(id VARCHAR(64) PRIMARY KEY, expires_at DATETIME NOT NULL, payload BLOB NOT NULL)"
                )
                connection.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS auth_recovery_codes "
                    "(subject VARCHAR(255) PRIMARY KEY, email VARCHAR(320) NOT NULL, "
                    "created_at DATETIME NOT NULL, payload BLOB NOT NULL)"
                )
                connection.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS auth_enrollments "
                    "(subject VARCHAR(255) PRIMARY KEY, expires_at DATETIME NOT NULL, payload BLOB NOT NULL)"
                )
                connection.exec_driver_sql(
                    "CREATE VIEW IF NOT EXISTS sessions AS "
                    "SELECT id, strftime('%s', expires_at) AS expires, payload FROM auth_sessions"
                )
                connection.exec_driver_sql(
                    "CREATE VIEW IF NOT EXISTS recovery_codes AS "
                    "SELECT subject, strftime('%s', created_at) AS expires, payload FROM auth_recovery_codes"
                )
                connection.exec_driver_sql(
                    "CREATE VIEW IF NOT EXISTS enrollments AS "
                    "SELECT subject, strftime('%s', expires_at) AS expires, payload FROM auth_enrollments"
                )
        self.db = _DatabaseCompat(self.engine)
        self._local = threading.local()

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _current_connection(self) -> Connection | None:
        return getattr(self._local, "connection", None)

    @contextmanager
    def _operation(self):
        current = self._current_connection()
        if current is not None:
            yield current
            return
        with self.engine.begin() as connection:
            yield connection

    @contextmanager
    def transaction(self):
        """Commit or roll back one complete auth operation."""
        if self._current_connection() is not None:
            yield
            return
        with self.engine.begin() as connection:
            self._local.connection = connection
            try:
                yield
            finally:
                self._local.connection = None

    def create(self, payload: dict, expires: float, now: float) -> str:
        token = secrets.token_urlsafe(32)
        with self._operation() as connection:
            connection.execute(
                text("DELETE FROM auth_sessions WHERE expires_at <= :now"),
                {"now": _timestamp(now)},
            )
            connection.execute(
                text(
                    "INSERT INTO auth_sessions (id, expires_at, payload) "
                    "VALUES (:id, :expires_at, :payload)"
                ),
                {
                    "id": self.digest(token),
                    "expires_at": _timestamp(expires),
                    "payload": self.cipher.encrypt(json.dumps(payload).encode()),
                },
            )
        return token

    def get(self, token: str | None, now: float) -> dict | None:
        if not token:
            return None
        with self._operation() as connection:
            row = connection.execute(
                text("SELECT expires_at, payload FROM auth_sessions WHERE id = :id"),
                {"id": self.digest(token)},
            ).fetchone()
            if row is None:
                return None
            if _epoch(row.expires_at) <= now:
                connection.execute(text("DELETE FROM auth_sessions WHERE id = :id"), {"id": self.digest(token)})
                return None
            return json.loads(self.cipher.decrypt(bytes(row.payload)))

    def update(self, token: str, payload: dict):
        with self._operation() as connection:
            connection.execute(
                text("UPDATE auth_sessions SET payload = :payload WHERE id = :id"),
                {"id": self.digest(token), "payload": self.cipher.encrypt(json.dumps(payload).encode())},
            )

    def invalidate_account(self, email: str) -> list[dict]:
        """Delete local sessions for an account and return their token payloads."""
        matches = []
        with self._operation() as connection:
            rows = connection.execute(text("SELECT id, payload FROM auth_sessions")).fetchall()
            for row in rows:
                value = json.loads(self.cipher.decrypt(bytes(row.payload)))
                if value.get("kind") == "session" and value.get("email") == email:
                    matches.append(value)
                    connection.execute(text("DELETE FROM auth_sessions WHERE id = :id"), {"id": row.id})
        return matches

    def put_enrollment(self, subject: str, payload: dict, expires: float) -> None:
        with self._operation() as connection:
            statement = (
                "INSERT OR REPLACE INTO auth_enrollments (subject, expires_at, payload) "
                "VALUES (:subject, :expires_at, :payload)"
                if self._sqlite
                else "INSERT INTO auth_enrollments (subject, expires_at, payload) VALUES (:subject, :expires_at, :payload) ON CONFLICT (subject) DO UPDATE SET expires_at = excluded.expires_at, payload = excluded.payload"
            )
            connection.execute(text(statement),
                {"subject": subject, "expires_at": _timestamp(expires), "payload": self.cipher.encrypt(json.dumps(payload).encode())},
            )

    def get_enrollment(self, subject: str, now: float) -> dict | None:
        with self._operation() as connection:
            row = connection.execute(
                text("SELECT expires_at, payload FROM auth_enrollments WHERE subject = :subject"),
                {"subject": subject},
            ).fetchone()
            if row is None:
                return None
            if _epoch(row.expires_at) <= now:
                connection.execute(text("DELETE FROM auth_enrollments WHERE subject = :subject"), {"subject": subject})
                return None
            return json.loads(self.cipher.decrypt(bytes(row.payload)))

    def delete_enrollment(self, subject: str) -> None:
        with self._operation() as connection:
            connection.execute(text("DELETE FROM auth_enrollments WHERE subject = :subject"), {"subject": subject})

    def put_recovery_codes(self, subject: str, email: str, hashes: list[str], now: float) -> None:
        with self._operation() as connection:
            statement = (
                "INSERT OR REPLACE INTO auth_recovery_codes (subject, email, payload, created_at) VALUES (:subject, :email, :payload, :created_at)"
                if self._sqlite
                else "INSERT INTO auth_recovery_codes (subject, email, payload, created_at) VALUES (:subject, :email, :payload, :created_at) ON CONFLICT (subject) DO UPDATE SET email = excluded.email, payload = excluded.payload, created_at = excluded.created_at"
            )
            connection.execute(text(statement),
                {
                    "subject": subject,
                    "email": email,
                    "payload": self.cipher.encrypt(json.dumps({"email": email, "hashes": hashes}).encode()),
                    "created_at": _timestamp(now),
                },
            )

    def consume_recovery_code(self, subject: str, candidate_digest: str) -> bool:
        with self._operation() as connection:
            locking = " FOR UPDATE" if not self._sqlite else ""
            row = connection.execute(
                text("SELECT payload FROM auth_recovery_codes WHERE subject = :subject" + locking),
                {"subject": subject},
            ).fetchone()
            if row is None:
                return False
            stored = json.loads(self.cipher.decrypt(bytes(row.payload)))
            hashes = stored.get("hashes", stored)
            matched = next((value for value in hashes if hmac.compare_digest(value, candidate_digest)), None)
            if matched is None:
                return False
            hashes.remove(matched)
            connection.execute(
                text("UPDATE auth_recovery_codes SET payload = :payload WHERE subject = :subject"),
                {"subject": subject, "payload": self.cipher.encrypt(json.dumps({"email": stored.get("email"), "hashes": hashes}).encode())},
            )
            return True

    def consume_recovery_code_for_email(self, email: str, candidate_digest: str) -> str | None:
        with self._operation() as connection:
            locking = " FOR UPDATE" if not self._sqlite else ""
            rows = connection.execute(
                text("SELECT subject, payload FROM auth_recovery_codes WHERE email = :email" + locking),
                {"email": email},
            ).fetchall()
            for row in rows:
                stored = json.loads(self.cipher.decrypt(bytes(row.payload)))
                hashes = stored.get("hashes", stored)
                matched = next((value for value in hashes if hmac.compare_digest(value, candidate_digest)), None)
                if matched is None:
                    continue
                hashes.remove(matched)
                connection.execute(
                    text("UPDATE auth_recovery_codes SET payload = :payload WHERE subject = :subject"),
                    {"subject": row.subject, "payload": self.cipher.encrypt(json.dumps({"email": email, "hashes": hashes}).encode())},
                )
                return row.subject
        return None

    def delete(self, token: str | None):
        if token:
            with self._operation() as connection:
                connection.execute(text("DELETE FROM auth_sessions WHERE id = :id"), {"id": self.digest(token)})

    def close(self):
        self.engine.dispose()

    @contextmanager
    def account_guard(self, subject: str):
        """Serialize provider stages without rolling back already committed intents."""
        key = int.from_bytes(hashlib.sha256(subject.encode()).digest()[:8], "big", signed=True)
        if self._sqlite:
            # SQLite deployment is explicitly single worker; striped locks stay bounded.
            with _ACCOUNT_LOCKS[key % len(_ACCOUNT_LOCKS)]:
                yield
        else:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT pg_advisory_lock(:key)"), {"key": key})
                connection.commit()
                try:
                    yield
                finally:
                    connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
                    connection.commit()

    def expiry(self, token: str) -> float:
        with self._operation() as connection:
            row = connection.execute(text("SELECT expires_at FROM auth_sessions WHERE id=:id"),
                                     {"id": self.digest(token)}).fetchone()
            return _epoch(row.expires_at) if row else 0

    def account_records(self, subject: str, now: float) -> list[dict]:
        with self._operation() as connection:
            rows = connection.execute(text("SELECT payload FROM auth_sessions WHERE expires_at > :now"),
                                      {"now": _timestamp(now)}).fetchall()
            values = [json.loads(self.cipher.decrypt(bytes(row.payload))) for row in rows]
            return [v for v in values if v.get("kind") == "account_operation" and v.get("subject") == subject]

    def create_account_record(self, payload: dict, expires: float, now: float) -> dict:
        with self.transaction():
            value = dict(payload, kind="account_operation")
            token = self.create(value, expires, now)
            value["id"] = token
            self.update(token, value)
        return value

    def recovery_count(self, subject: str) -> int:
        with self._operation() as connection:
            row = connection.execute(text("SELECT payload FROM auth_recovery_codes WHERE subject=:subject"),
                                     {"subject": subject}).fetchone()
            if not row:
                return 0
            return len(json.loads(self.cipher.decrypt(bytes(row.payload)))["hashes"])

    def reconcile_email(self, subject: str, email: str):
        """Update both recovery copies and all same-subject sessions atomically."""
        with self.transaction(), self._operation() as connection:
            rows = connection.execute(text("SELECT id, payload FROM auth_sessions")).fetchall()
            for row in rows:
                value = json.loads(self.cipher.decrypt(bytes(row.payload)))
                if value.get("kind") == "session" and value.get("subject") == subject:
                    value["email"] = email
                    connection.execute(text("UPDATE auth_sessions SET payload=:payload WHERE id=:id"),
                        {"id": row.id, "payload": self.cipher.encrypt(json.dumps(value).encode())})
            row = connection.execute(text("SELECT payload FROM auth_recovery_codes WHERE subject=:subject"),
                                     {"subject": subject}).fetchone()
            if row:
                value = json.loads(self.cipher.decrypt(bytes(row.payload)))
                value["email"] = email
                connection.execute(text("UPDATE auth_recovery_codes SET email=:email, payload=:payload WHERE subject=:subject"),
                    {"subject": subject, "email": email, "payload": self.cipher.encrypt(json.dumps(value).encode())})
