"""Encrypted, local SQLite sessions for the single-worker development service.

The opaque cookie is never stored in plaintext. Cognito tokens and challenge
sessions are encrypted with a separate key supplied by the environment.
"""

import hashlib
import json
import secrets
import sqlite3
from contextlib import contextmanager
from threading import RLock

from cryptography.fernet import Fernet


class SessionStore:
    def __init__(self, path: str, key: str):
        self.cipher = Fernet(key.encode())
        self.lock = RLock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("""CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY, expires REAL NOT NULL, payload BLOB NOT NULL
        )""")
        self.db.commit()

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @contextmanager
    def transaction(self):
        # Serialize refresh vs signout and challenge consumption in this local
        # process. Deployment must replace this with a shared transactional store.
        with self.lock:
            with self.db:
                yield

    def create(self, payload: dict, expires: float, now: float) -> str:
        token = secrets.token_urlsafe(32)
        self.db.execute("DELETE FROM sessions WHERE expires <= ?", (now,))
        self.db.execute(
            "INSERT INTO sessions VALUES (?, ?, ?)",
            (
                self.digest(token),
                expires,
                self.cipher.encrypt(json.dumps(payload).encode()),
            ),
        )
        return token

    def get(self, token: str | None, now: float) -> dict | None:
        if not token:
            return None
        row = self.db.execute(
            "SELECT expires, payload FROM sessions WHERE id = ?", (self.digest(token),)
        ).fetchone()
        if row is None:
            return None
        if row[0] <= now:
            self.delete(token)
            return None
        return json.loads(self.cipher.decrypt(row[1]))

    def update(self, token: str, payload: dict):
        self.db.execute(
            "UPDATE sessions SET payload = ? WHERE id = ?",
            (
                self.cipher.encrypt(json.dumps(payload).encode()),
                self.digest(token),
            ),
        )

    def invalidate_account(self, email: str) -> list[dict]:
        """Delete local sessions for an account and return their token payloads."""
        rows = self.db.execute("SELECT id, payload FROM sessions").fetchall()
        matches = []
        for session_id, payload in rows:
            value = json.loads(self.cipher.decrypt(payload))
            if value.get("kind") == "session" and value.get("email") == email:
                matches.append(value)
                self.db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        return matches

    def delete(self, token: str | None):
        if token:
            self.db.execute("DELETE FROM sessions WHERE id = ?", (self.digest(token),))

    def close(self):
        self.db.close()
