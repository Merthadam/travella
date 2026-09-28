"""Encrypted, local SQLite sessions for the single-worker development service.

The opaque cookie is never stored in plaintext. Cognito tokens and challenge
sessions are encrypted with a separate key supplied by the environment.
"""

import hashlib
import hmac
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
        self.db.execute("""CREATE TABLE IF NOT EXISTS recovery_codes (
            subject TEXT PRIMARY KEY, expires REAL NOT NULL, payload BLOB NOT NULL
        )""")
        self.db.execute("""CREATE TABLE IF NOT EXISTS enrollments (
            subject TEXT PRIMARY KEY, expires REAL NOT NULL, payload BLOB NOT NULL
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

    def put_enrollment(self, subject: str, payload: dict, expires: float) -> None:
        self.db.execute(
            "INSERT OR REPLACE INTO enrollments VALUES (?, ?, ?)",
            (subject, expires, self.cipher.encrypt(json.dumps(payload).encode())),
        )

    def get_enrollment(self, subject: str, now: float) -> dict | None:
        row = self.db.execute(
            "SELECT expires, payload FROM enrollments WHERE subject = ?", (subject,)
        ).fetchone()
        if row is None:
            return None
        if row[0] <= now:
            self.delete_enrollment(subject)
            return None
        return json.loads(self.cipher.decrypt(row[1]))

    def delete_enrollment(self, subject: str) -> None:
        self.db.execute("DELETE FROM enrollments WHERE subject = ?", (subject,))

    def put_recovery_codes(self, subject: str, email: str, hashes: list[str], now: float) -> None:
        self.db.execute(
            "INSERT OR REPLACE INTO recovery_codes VALUES (?, ?, ?)",
            (
                subject,
                now,
                self.cipher.encrypt(json.dumps({"email": email, "hashes": hashes}).encode()),
            ),
        )

    def consume_recovery_code(self, subject: str, candidate_digest: str) -> bool:
        row = self.db.execute(
            "SELECT payload FROM recovery_codes WHERE subject = ?", (subject,)
        ).fetchone()
        if row is None:
            return False
        stored = json.loads(self.cipher.decrypt(row[0]))
        hashes = stored.get("hashes", stored)
        matched = next(
            (value for value in hashes if hmac.compare_digest(value, candidate_digest)), None
        )
        if matched is None:
            return False
        hashes.remove(matched)
        self.db.execute(
            "UPDATE recovery_codes SET payload = ? WHERE subject = ?",
            (
                self.cipher.encrypt(
                    json.dumps({"email": stored.get("email"), "hashes": hashes}).encode()
                ),
                subject,
            ),
        )
        return True

    def consume_recovery_code_for_email(self, email: str, candidate_digest: str) -> str | None:
        rows = self.db.execute("SELECT subject, payload FROM recovery_codes").fetchall()
        for subject, payload in rows:
            stored = json.loads(self.cipher.decrypt(payload))
            if stored.get("email") != email:
                continue
            hashes = stored.get("hashes", stored)
            matched = next(
                (value for value in hashes if hmac.compare_digest(value, candidate_digest)), None
            )
            if matched is None:
                return None
            hashes.remove(matched)
            self.db.execute(
                "UPDATE recovery_codes SET payload = ? WHERE subject = ?",
                (
                    self.cipher.encrypt(json.dumps({"email": email, "hashes": hashes}).encode()),
                    subject,
                ),
            )
            return subject
        return None

    def delete(self, token: str | None):
        if token:
            self.db.execute("DELETE FROM sessions WHERE id = ?", (self.digest(token),))

    def close(self):
        self.db.close()
