from cryptography.fernet import Fernet

from services.auth.session_store import SessionStore


def test_session_survives_restart_but_not_its_original_expiry(tmp_path):
    path = str(tmp_path / "sessions.sqlite3")
    key = Fernet.generate_key().decode()
    first = SessionStore(path, key)
    with first.transaction():
        sid = first.create({"access": "secret", "started": 10}, expires=100, now=10)
    first.close()
    second = SessionStore(path, key)
    with second.transaction():
        assert second.get(sid, 99) == {"access": "secret", "started": 10}
        assert second.get(sid, 100) is None
    second.close()
